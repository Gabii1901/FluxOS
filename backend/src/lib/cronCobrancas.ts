import cron from "node-cron";
import { gerarCobrancaBoleto, proximaDataVencimento } from "./boletos";
import { enviarEmailBoleto } from "./email";
import { PLANOS } from "./planos";
import { prisma } from "./prisma";

const DIAS_ANTECEDENCIA_GERACAO = 5;
const DIAS_CARENCIA_INADIMPLENCIA = 3;

export function iniciarCronCobrancas() {
  // Roda 1x por dia, de madrugada. Em processo único (sem múltiplas
  // instâncias do backend), não há risco de gerar cobrança duplicada.
  cron.schedule("0 6 * * *", () => {
    rodarCicloCobrancas().catch((erro) => console.error("[cron/cobrancas] falhou", erro));
  });
}

export async function rodarCicloCobrancas() {
  await gerarBoletosProximosDoVencimento();
  await marcarInadimplentes();
}

async function gerarBoletosProximosDoVencimento() {
  const empresas = await prisma.empresa.findMany({
    where: {
      formaPagamento: "boleto",
      diaVencimento: { not: null },
      plano: { not: null },
      statusAssinatura: { in: ["ativo", "inadimplente"] },
    },
  });

  for (const empresa of empresas) {
    if (!empresa.plano || !empresa.diaVencimento) continue;

    const cobranca =
      empresa.plano === "personalizado"
        ? empresa.valorPersonalizado
          ? { descricao: "Plano personalizado", valor: Number(empresa.valorPersonalizado) }
          : null
        : { descricao: `Plano ${PLANOS[empresa.plano].nome}`, valor: PLANOS[empresa.plano].valor };
    if (!cobranca) continue;

    const vencimento = proximaDataVencimento(empresa.diaVencimento);
    const diasAteVencimento = Math.ceil((vencimento.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diasAteVencimento > DIAS_ANTECEDENCIA_GERACAO) continue;

    const jaExiste = await prisma.cobrancaPlano.findFirst({
      where: { empresaId: empresa.id, vencimento },
    });
    if (jaExiste) continue;

    const admin = await prisma.usuario.findFirst({
      where: { empresaId: empresa.id, ativo: true },
      include: { conta: { select: { email: true } } },
      orderBy: { criadoEm: "asc" },
    });
    if (!admin) continue;

    try {
      const boleto = await gerarCobrancaBoleto(
        empresa,
        { email: admin.conta.email, nome: admin.nome },
        cobranca,
        vencimento,
      );
      if (boleto.linkPagamento) {
        await enviarEmailBoleto(admin.conta.email, admin.nome, boleto.linkPagamento, vencimento);
      }
    } catch (erro) {
      console.error(`[cron/cobrancas] falha ao gerar boleto da empresa ${empresa.id}`, erro);
    }
  }
}

async function marcarInadimplentes() {
  const limite = new Date();
  limite.setDate(limite.getDate() - DIAS_CARENCIA_INADIMPLENCIA);

  const cobrancasVencidas = await prisma.cobrancaPlano.findMany({
    where: { status: "pendente", vencimento: { lt: limite } },
  });

  for (const cobranca of cobrancasVencidas) {
    await prisma.$transaction([
      prisma.cobrancaPlano.update({ where: { id: cobranca.id }, data: { status: "vencido" } }),
      prisma.empresa.updateMany({
        where: { id: cobranca.empresaId, statusAssinatura: { not: "cancelado" } },
        data: { statusAssinatura: "inadimplente" },
      }),
    ]);
  }
}
