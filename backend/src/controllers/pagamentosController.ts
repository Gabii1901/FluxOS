import { Request, Response } from "express";
import { z } from "zod";
import { criarAssinaturaCartao } from "../lib/assinaturas";
import { gerarCobrancaBoleto, proximaDataVencimento } from "../lib/boletos";
import { mpPayment, mpPreApproval } from "../lib/mercadoPago";
import { PLANOS, PLANOS_COM_CHECKOUT } from "../lib/planos";
import { prisma } from "../lib/prisma";

const checkoutSchema = z.object({
  plano: z.enum(PLANOS_COM_CHECKOUT as [string, ...string[]]),
  formaPagamento: z.enum(["cartao", "boleto"]),
  diaVencimento: z.number().int().min(1).max(28).optional(),
  cpfCnpj: z.string().min(11).optional(),
});

export async function criarCheckout(req: Request, res: Response) {
  const dados = checkoutSchema.parse(req.body);

  if (dados.formaPagamento === "boleto" && (!dados.diaVencimento || !dados.cpfCnpj)) {
    return res.status(400).json({ erro: "Informe o dia de vencimento e o CPF/CNPJ para pagar com boleto" });
  }

  const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: req.usuario!.empresaId } });
  const usuario = await prisma.usuario.findUniqueOrThrow({
    where: { id: req.usuario!.usuarioId },
    include: { conta: { select: { email: true } } },
  });

  const plano = dados.plano as keyof typeof PLANOS;
  const definicao = PLANOS[plano];

  if (dados.formaPagamento === "cartao") {
    const assinatura = await criarAssinaturaCartao(empresa.id, usuario.conta.email, {
      descricao: `Plano ${definicao.nome}`,
      valor: definicao.valor,
    });

    await prisma.empresa.update({
      where: { id: empresa.id },
      data: {
        plano,
        formaPagamento: "cartao",
        mpAssinaturaId: assinatura.mpAssinaturaId,
      },
    });

    return res.json({ checkoutUrl: assinatura.checkoutUrl });
  }

  // Boleto: não existe cobrança automática recorrente — geramos o primeiro
  // boleto agora e o job diário (lib/cronCobrancas.ts) cuida dos próximos
  // ciclos a partir do dia de vencimento escolhido.
  await prisma.empresa.update({
    where: { id: empresa.id },
    data: {
      plano,
      formaPagamento: "boleto",
      diaVencimento: dados.diaVencimento,
      cpfCnpjBoleto: dados.cpfCnpj,
    },
  });

  const vencimento = proximaDataVencimento(dados.diaVencimento!);
  const boleto = await gerarCobrancaBoleto(
    { ...empresa, cpfCnpjBoleto: dados.cpfCnpj! },
    { email: usuario.conta.email, nome: usuario.nome },
    { descricao: `Plano ${definicao.nome}`, valor: definicao.valor },
    vencimento,
  );

  res.json({ boleto });
}

export async function status(req: Request, res: Response) {
  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: req.usuario!.empresaId },
    select: {
      plano: true,
      statusAssinatura: true,
      formaPagamento: true,
      diaVencimento: true,
      cobrancas: { orderBy: { criadoEm: "desc" }, take: 1 },
    },
  });

  res.json(empresa);
}

const webhookSchema = z.object({
  type: z.string().optional(),
  topic: z.string().optional(),
  data: z.object({ id: z.union([z.string(), z.number()]) }).optional(),
});

export async function webhook(req: Request, res: Response) {
  // Sempre respondemos 200 rápido — o Mercado Pago reenvia notificações
  // que não recebem 2xx, e nunca confiamos no corpo recebido: buscamos o
  // recurso de verdade na API deles antes de mudar qualquer coisa.
  res.status(200).send("ok");

  const corpo = webhookSchema.safeParse(req.body);
  if (!corpo.success || !corpo.data.data) return;

  const tipo = corpo.data.type ?? corpo.data.topic;
  const id = String(corpo.data.data.id);

  try {
    if (tipo === "payment") {
      await processarWebhookPagamento(id);
    } else if (tipo === "subscription_preapproval" || tipo === "preapproval") {
      await processarWebhookAssinatura(id);
    }
  } catch (erro) {
    console.error("[pagamentos/webhook] erro ao processar notificação", erro);
  }
}

async function processarWebhookPagamento(pagamentoId: string) {
  const pagamento = await mpPayment.get({ id: pagamentoId });
  const empresaId = pagamento.external_reference;
  if (!empresaId) return;

  await prisma.cobrancaPlano.updateMany({
    where: { mpPagamentoId: pagamentoId },
    data: { status: pagamento.status === "approved" ? "pago" : pagamento.status ?? "pendente" },
  });

  if (pagamento.status === "approved") {
    await prisma.empresa.update({
      where: { id: empresaId },
      data: { statusAssinatura: "ativo" },
    });
  }
}

async function processarWebhookAssinatura(preapprovalId: string) {
  const preapproval = await mpPreApproval.get({ id: preapprovalId });
  const empresaId = preapproval.external_reference;
  if (!empresaId) return;

  const statusAssinatura =
    preapproval.status === "authorized"
      ? "ativo"
      : preapproval.status === "cancelled"
        ? "cancelado"
        : preapproval.status === "paused"
          ? "inadimplente"
          : "pendente";

  await prisma.empresa.update({
    where: { id: empresaId },
    data: { statusAssinatura },
  });
}
