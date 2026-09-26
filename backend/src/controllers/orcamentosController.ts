import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const itemSchema = z.object({
  tipo: z.enum(["peca", "mao_de_obra", "servico_terceiro"]),
  descricao: z.string().min(1),
  quantidade: z.number().positive(),
  valorUnitario: z.number().nonnegative(),
  pecaId: z.string().uuid().optional(),
});

const criarOrcamentoSchema = z.object({
  validadeDias: z.number().int().positive().default(7),
  itens: z.array(itemSchema).min(1),
});

const orcamentoInclude = {
  itens: true,
  ordemServico: {
    include: {
      cliente: true,
      item: true,
      tecnico: { select: { id: true, nome: true, email: true, papel: true } },
      empresa: { select: { id: true, nome: true } },
    },
  },
} as const;

export async function criar(req: Request, res: Response) {
  const { id: osId } = req.params;
  const dados = criarOrcamentoSchema.parse(req.body);

  const os = await prisma.ordemServico.findFirst({
    where: { id: osId, empresaId: req.usuario!.empresaId },
  });
  if (!os) {
    return res.status(404).json({ erro: "Ordem de serviço não encontrada" });
  }

  const valorTotal = dados.itens.reduce(
    (soma, item) => soma + item.quantidade * item.valorUnitario,
    0,
  );

  const orcamento = await prisma.$transaction(async (tx) => {
    const novoOrcamento = await tx.orcamento.create({
      data: {
        osId,
        valorTotal,
        validadeDias: dados.validadeDias,
        enviadoEm: new Date(),
        itens: { create: dados.itens },
      },
      include: orcamentoInclude,
    });

    await tx.ordemServico.update({
      where: { id: osId },
      data: { status: "aguardando_aprovacao" },
    });

    await tx.osStatusHistorico.create({
      data: {
        osId,
        statusAnterior: os.status,
        statusNovo: "aguardando_aprovacao",
        usuarioId: req.usuario!.usuarioId,
        observacao: "Orçamento enviado para aprovação",
      },
    });

    return novoOrcamento;
  });

  res.status(201).json(orcamento);
}

export async function listar(req: Request, res: Response) {
  const { status } = req.query;

  const orcamentos = await prisma.orcamento.findMany({
    where: {
      ordemServico: { empresaId: req.usuario!.empresaId },
      status: status ? (status as any) : undefined,
    },
    include: {
      ordemServico: { select: { numero: true, cliente: { select: { nome: true } } } },
    },
    orderBy: { criadoEm: "desc" },
  });

  res.json(orcamentos);
}

export async function buscarPorId(req: Request, res: Response) {
  const { id } = req.params;

  const orcamento = await prisma.orcamento.findFirst({
    where: { id, ordemServico: { empresaId: req.usuario!.empresaId } },
    include: orcamentoInclude,
  });

  if (!orcamento) {
    return res.status(404).json({ erro: "Orçamento não encontrado" });
  }

  res.json(orcamento);
}

const mudarStatusSchema = z.object({
  status: z.enum(["aprovado", "recusado"]),
});

export async function mudarStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = mudarStatusSchema.parse(req.body);

  const orcamento = await prisma.orcamento.findFirst({
    where: { id, ordemServico: { empresaId: req.usuario!.empresaId } },
    include: { ordemServico: true },
  });
  if (!orcamento) {
    return res.status(404).json({ erro: "Orçamento não encontrado" });
  }

  const novoStatusOs = status === "aprovado" ? "aprovada" : "cancelada";

  const atualizado = await prisma.$transaction(async (tx) => {
    const resultado = await tx.orcamento.update({
      where: { id },
      data: { status, respondidoEm: new Date() },
      include: orcamentoInclude,
    });

    await tx.ordemServico.update({
      where: { id: orcamento.osId },
      data: { status: novoStatusOs },
    });

    await tx.osStatusHistorico.create({
      data: {
        osId: orcamento.osId,
        statusAnterior: orcamento.ordemServico.status,
        statusNovo: novoStatusOs,
        usuarioId: req.usuario!.usuarioId,
        observacao: status === "aprovado" ? "Orçamento aprovado pelo cliente" : "Orçamento recusado",
      },
    });

    return resultado;
  });

  res.json(atualizado);
}
