import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

function calcularStatusPagamento(valorTotal: number, totalPago: number) {
  if (totalPago <= 0) return "pendente" as const;
  if (totalPago >= valorTotal) return "pago" as const;
  return "parcial" as const;
}

export async function criar(req: Request, res: Response) {
  const { id: osId } = req.params;

  const os = await prisma.ordemServico.findFirst({
    where: { id: osId, empresaId: req.usuario!.empresaId },
    include: { faturas: true },
  });
  if (!os) {
    return res.status(404).json({ erro: "Ordem de serviço não encontrada" });
  }
  if (os.faturas.length > 0) {
    return res.status(409).json({ erro: "Esta OS já possui uma fatura" });
  }

  const orcamentoAprovado = await prisma.orcamento.findFirst({
    where: { osId, status: "aprovado" },
    orderBy: { respondidoEm: "desc" },
  });
  if (!orcamentoAprovado) {
    return res.status(400).json({ erro: "É necessário um orçamento aprovado para gerar a fatura" });
  }

  const fatura = await prisma.$transaction(async (tx) => {
    const novaFatura = await tx.fatura.create({
      data: { osId, valorTotal: orcamentoAprovado.valorTotal },
      include: { pagamentos: true },
    });

    await tx.ordemServico.update({ where: { id: osId }, data: { status: "faturada" } });

    await tx.osStatusHistorico.create({
      data: {
        osId,
        statusAnterior: os.status,
        statusNovo: "faturada",
        usuarioId: req.usuario!.usuarioId,
        observacao: `Fatura #${novaFatura.numero} gerada`,
      },
    });

    return novaFatura;
  });

  res.status(201).json(fatura);
}

export async function resumo(req: Request, res: Response) {
  const faturas = await prisma.fatura.findMany({
    where: { ordemServico: { empresaId: req.usuario!.empresaId } },
    include: { pagamentos: true },
  });

  let totalFaturado = 0;
  let totalRecebido = 0;
  let totalAgendado = 0;
  let faturasQuitadas = 0;

  for (const fatura of faturas) {
    totalFaturado += Number(fatura.valorTotal);
    for (const pagamento of fatura.pagamentos) {
      if (pagamento.status === "pago") totalRecebido += Number(pagamento.valor);
      if (pagamento.status === "pendente") totalAgendado += Number(pagamento.valor);
    }
    if (fatura.status === "pago") faturasQuitadas += 1;
  }

  const totalEmAberto = Math.max(0, totalFaturado - totalRecebido);

  res.json({
    totalFaturado,
    totalRecebido,
    totalEmAberto,
    totalAgendado,
    quantidadeFaturas: faturas.length,
    faturasQuitadas,
  });
}

export async function listarPendentes(req: Request, res: Response) {
  const pagamentos = await prisma.pagamento.findMany({
    where: {
      status: "pendente",
      fatura: { ordemServico: { empresaId: req.usuario!.empresaId } },
    },
    include: {
      fatura: {
        select: {
          id: true,
          numero: true,
          ordemServico: { select: { id: true, numero: true, cliente: { select: { nome: true } } } },
        },
      },
    },
    orderBy: { vencimento: "asc" },
  });

  res.json(pagamentos);
}

const criarPagamentoSchema = z.object({
  valor: z.number().positive(),
  metodo: z.string().min(1),
  vencimento: z.string().date().optional(),
  pago: z.boolean().optional(),
});

class SaldoExcedidoError extends Error {}

export async function criarPagamento(req: Request, res: Response) {
  const { id: faturaId } = req.params;
  const dados = criarPagamentoSchema.parse(req.body);

  const faturaExiste = await prisma.fatura.findFirst({
    where: { id: faturaId, ordemServico: { empresaId: req.usuario!.empresaId } },
  });
  if (!faturaExiste) {
    return res.status(404).json({ erro: "Fatura não encontrada" });
  }

  // Um pagamento agendado (a prazo, ex.: boleto) reserva o valor no saldo da
  // fatura sem contar como recebido até que a baixa seja confirmada.
  const marcarComoPago = dados.pago ?? true;

  const pagamento = await prisma
    .$transaction(async (tx) => {
      // Lock the fatura row so concurrent payments can't both read the same
      // running total and together overshoot the invoice's saldo.
      await tx.$executeRaw`SELECT id FROM faturas WHERE id = ${faturaId}::uuid FOR UPDATE`;

      const fatura = await tx.fatura.findUniqueOrThrow({
        where: { id: faturaId },
        include: { pagamentos: { where: { status: { not: "cancelado" } } } },
      });

      const totalComprometido = fatura.pagamentos.reduce((soma, p) => soma + Number(p.valor), 0);
      const valorTotal = Number(fatura.valorTotal);

      if (totalComprometido + dados.valor > valorTotal + 0.01) {
        throw new SaldoExcedidoError();
      }

      const totalPagoAtual = fatura.pagamentos
        .filter((p) => p.status === "pago")
        .reduce((soma, p) => soma + Number(p.valor), 0);

      const novoStatus = calcularStatusPagamento(
        valorTotal,
        totalPagoAtual + (marcarComoPago ? dados.valor : 0),
      );

      const novoPagamento = await tx.pagamento.create({
        data: {
          faturaId,
          valor: dados.valor,
          metodo: dados.metodo,
          vencimento: dados.vencimento ? new Date(dados.vencimento) : null,
          status: marcarComoPago ? "pago" : "pendente",
          pagoEm: marcarComoPago ? new Date() : null,
        },
      });

      await tx.fatura.update({ where: { id: faturaId }, data: { status: novoStatus } });

      return novoPagamento;
    })
    .catch((erro) => {
      if (erro instanceof SaldoExcedidoError) return null;
      throw erro;
    });

  if (!pagamento) {
    return res.status(400).json({ erro: "O valor do pagamento excede o saldo em aberto da fatura" });
  }

  res.status(201).json(pagamento);
}

const atualizarVencimentoSchema = z.object({
  vencimento: z.string().date(),
});

export async function atualizarVencimento(req: Request, res: Response) {
  const { id: pagamentoId } = req.params;
  const { vencimento } = atualizarVencimentoSchema.parse(req.body);

  const pagamento = await prisma.pagamento.findFirst({
    where: { id: pagamentoId, fatura: { ordemServico: { empresaId: req.usuario!.empresaId } } },
  });
  if (!pagamento) {
    return res.status(404).json({ erro: "Pagamento não encontrado" });
  }
  if (pagamento.status !== "pendente") {
    return res.status(409).json({ erro: "Só é possível ajustar o vencimento de um pagamento pendente" });
  }

  const atualizado = await prisma.pagamento.update({
    where: { id: pagamentoId },
    data: { vencimento: new Date(vencimento) },
  });

  res.json(atualizado);
}

export async function darBaixa(req: Request, res: Response) {
  const { id: pagamentoId } = req.params;

  const pagamento = await prisma
    .$transaction(async (tx) => {
      const pagamentoAtual = await tx.pagamento.findFirst({
        where: { id: pagamentoId, fatura: { ordemServico: { empresaId: req.usuario!.empresaId } } },
      });
      if (!pagamentoAtual) return null;
      if (pagamentoAtual.status !== "pendente") return pagamentoAtual;

      await tx.$executeRaw`SELECT id FROM faturas WHERE id = ${pagamentoAtual.faturaId}::uuid FOR UPDATE`;

      const fatura = await tx.fatura.findUniqueOrThrow({
        where: { id: pagamentoAtual.faturaId },
        include: { pagamentos: true },
      });

      const totalPagoAtual = fatura.pagamentos
        .filter((p) => p.status === "pago" && p.id !== pagamentoAtual.id)
        .reduce((soma, p) => soma + Number(p.valor), 0);

      const novoStatus = calcularStatusPagamento(Number(fatura.valorTotal), totalPagoAtual + Number(pagamentoAtual.valor));

      await tx.fatura.update({ where: { id: fatura.id }, data: { status: novoStatus } });

      return tx.pagamento.update({
        where: { id: pagamentoAtual.id },
        data: { status: "pago", pagoEm: new Date() },
      });
    });

  if (!pagamento) {
    return res.status(404).json({ erro: "Pagamento não encontrado" });
  }

  res.json(pagamento);
}

export async function remover(req: Request, res: Response) {
  const { id: pagamentoId } = req.params;

  const pagamento = await prisma.pagamento.findFirst({
    where: { id: pagamentoId, fatura: { ordemServico: { empresaId: req.usuario!.empresaId } } },
  });
  if (!pagamento) {
    return res.status(404).json({ erro: "Pagamento não encontrado" });
  }
  if (pagamento.status !== "pendente") {
    return res.status(409).json({ erro: "Só é possível remover um pagamento agendado (pendente)" });
  }

  await prisma.pagamento.delete({ where: { id: pagamentoId } });

  res.status(204).send();
}
