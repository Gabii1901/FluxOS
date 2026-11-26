import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

// Regras dos relatórios:
// - Despesa entra no mês do VENCIMENTO da conta a pagar (paga ou não).
// - Receita recebida entra no mês em que foi paga (pagoEm, no fuso de Brasília);
//   receita a receber (parcela pendente) entra no mês do vencimento.
// - Saldo realizado = recebido − despesas pagas; saldo previsto = todas as receitas − todas as despesas.

const filtroSchema = z.object({
  inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const dataBrasilia = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Data "YYYY-MM-DD": para timestamps usa o fuso de Brasília; colunas DATE vêm em UTC. */
function diaDe(data: Date, ehColunaDate: boolean) {
  return ehColunaDate ? data.toISOString().slice(0, 10) : dataBrasilia.format(data);
}

function mesesEntre(inicio: string, fim: string) {
  const meses: string[] = [];
  let [ano, mes] = inicio.slice(0, 7).split("-").map(Number);
  const ultimo = fim.slice(0, 7);
  while (true) {
    const chave = `${ano}-${String(mes).padStart(2, "0")}`;
    meses.push(chave);
    if (chave >= ultimo || meses.length > 240) break;
    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }
  return meses;
}

export async function financeiro(req: Request, res: Response) {
  const filtro = filtroSchema.safeParse(req.query);
  if (!filtro.success) return res.status(400).json({ erro: "Informe início e fim do período (AAAA-MM-DD)." });
  const { inicio, fim } = filtro.data;
  if (inicio > fim) return res.status(400).json({ erro: "O início do período é depois do fim." });

  const empresaId = req.usuario!.empresaId;
  const inicioDate = new Date(`${inicio}T00:00:00.000Z`);
  const fimDate = new Date(`${fim}T00:00:00.000Z`);
  // Margem de 1 dia nos timestamps por causa do fuso; o filtro fino é feito abaixo.
  const inicioTs = new Date(inicioDate.getTime() - 86_400_000);
  const fimTs = new Date(fimDate.getTime() + 2 * 86_400_000);
  const hoje = dataBrasilia.format(new Date());

  const [contas, recebidos, aReceber] = await Promise.all([
    prisma.contaPagar.findMany({
      where: { empresaId, vencimento: { gte: inicioDate, lte: fimDate } },
      include: { categoria: { select: { nome: true } } },
      orderBy: { vencimento: "asc" },
    }),
    prisma.pagamento.findMany({
      where: {
        status: "pago",
        pagoEm: { gte: inicioTs, lt: fimTs },
        fatura: { ordemServico: { empresaId } },
      },
      include: {
        fatura: {
          select: { numero: true, ordemServico: { select: { id: true, numero: true, cliente: { select: { nome: true } } } } },
        },
      },
      orderBy: { pagoEm: "asc" },
    }),
    prisma.pagamento.findMany({
      where: {
        status: "pendente",
        vencimento: { gte: inicioDate, lte: fimDate },
        fatura: { ordemServico: { empresaId } },
      },
      include: {
        fatura: {
          select: { numero: true, ordemServico: { select: { id: true, numero: true, cliente: { select: { nome: true } } } } },
        },
      },
      orderBy: { vencimento: "asc" },
    }),
  ]);

  const despesas = contas.map((c) => {
    const vencimento = diaDe(c.vencimento, true);
    return {
      id: c.id,
      descricao: c.descricao,
      fornecedor: c.fornecedorNome,
      categoria: c.categoria?.nome ?? "Sem categoria",
      vencimento,
      pagoEm: c.pagoEm ? diaDe(c.pagoEm, true) : null,
      valor: Number(c.valor),
      situacao: c.pagoEm ? "paga" : vencimento < hoje ? "vencida" : "aberta",
    };
  });

  const receitas = [
    ...recebidos
      .map((p) => ({ p, data: diaDe(p.pagoEm!, false) }))
      .filter(({ data }) => data >= inicio && data <= fim)
      .map(({ p, data }) => ({
        id: p.id,
        data,
        valor: Number(p.valor),
        metodo: p.metodo,
        situacao: "recebida" as const,
        osId: p.fatura.ordemServico.id,
        osNumero: p.fatura.ordemServico.numero,
        cliente: p.fatura.ordemServico.cliente.nome,
      })),
    ...aReceber.map((p) => ({
      id: p.id,
      data: diaDe(p.vencimento!, true),
      valor: Number(p.valor),
      metodo: p.metodo,
      situacao: "a_receber" as const,
      osId: p.fatura.ordemServico.id,
      osNumero: p.fatura.ordemServico.numero,
      cliente: p.fatura.ordemServico.cliente.nome,
    })),
  ].sort((a, b) => a.data.localeCompare(b.data));

  const porMes = new Map(
    mesesEntre(inicio, fim).map((mes) => [
      mes,
      { mes, receitaRecebida: 0, receitaAReceber: 0, despesaPaga: 0, despesaEmAberto: 0 },
    ]),
  );
  for (const d of despesas) {
    const linha = porMes.get(d.vencimento.slice(0, 7));
    if (!linha) continue;
    if (d.situacao === "paga") linha.despesaPaga += d.valor;
    else linha.despesaEmAberto += d.valor;
  }
  for (const r of receitas) {
    const linha = porMes.get(r.data.slice(0, 7));
    if (!linha) continue;
    if (r.situacao === "recebida") linha.receitaRecebida += r.valor;
    else linha.receitaAReceber += r.valor;
  }

  let acumulado = 0;
  const meses = [...porMes.values()].map((m) => {
    const saldoRealizado = m.receitaRecebida - m.despesaPaga;
    const saldoPrevisto = m.receitaRecebida + m.receitaAReceber - m.despesaPaga - m.despesaEmAberto;
    acumulado += saldoRealizado;
    return { ...m, saldoRealizado, saldoPrevisto, saldoAcumulado: acumulado };
  });

  res.json({ inicio, fim, despesas, receitas, meses });
}
