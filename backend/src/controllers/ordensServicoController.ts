import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const usuarioResumoSelect = { id: true, nome: true, email: true, papel: true } as const;

const criarOsSchema = z.object({
  clienteId: z.string().uuid(),
  itemId: z.string().uuid().optional(),
  tecnicoId: z.string().uuid().optional(),
  problemaRelatado: z.string().min(1),
  prioridade: z.enum(["baixa", "normal", "alta", "urgente"]).optional(),
});

export async function listar(req: Request, res: Response) {
  const { status } = req.query;

  const ordens = await prisma.ordemServico.findMany({
    where: {
      empresaId: req.usuario!.empresaId,
      status: status ? (status as any) : undefined,
    },
    include: { cliente: true, tecnico: { select: usuarioResumoSelect } },
    orderBy: { criadoEm: "desc" },
  });

  res.json(ordens);
}

export async function buscarPorId(req: Request, res: Response) {
  const { id } = req.params;

  const os = await prisma.ordemServico.findFirst({
    where: { id, empresaId: req.usuario!.empresaId },
    include: {
      cliente: true,
      item: true,
      atendente: { select: usuarioResumoSelect },
      tecnico: { select: usuarioResumoSelect },
      diagnosticos: true,
      orcamentos: { include: { itens: true } },
      pecasUtilizadas: { include: { peca: true }, orderBy: { criadoEm: "desc" } },
      faturas: { include: { pagamentos: { orderBy: { criadoEm: "asc" } } } },
      entregas: true,
      garantias: true,
      fotos: { orderBy: { criadoEm: "desc" } },
      statusHistorico: { orderBy: { criadoEm: "asc" } },
    },
  });

  if (!os) {
    return res.status(404).json({ erro: "Ordem de serviço não encontrada" });
  }

  res.json(os);
}

export async function criar(req: Request, res: Response) {
  const dados = criarOsSchema.parse(req.body);

  const os = await prisma.ordemServico.create({
    data: {
      ...dados,
      empresaId: req.usuario!.empresaId,
      atendenteId: req.usuario!.usuarioId,
      status: "aberta",
    },
  });

  await prisma.osStatusHistorico.create({
    data: {
      osId: os.id,
      statusNovo: "aberta",
      usuarioId: req.usuario!.usuarioId,
    },
  });

  res.status(201).json(os);
}

const mudarStatusSchema = z.object({
  status: z.enum([
    "aberta",
    "em_diagnostico",
    "aguardando_aprovacao",
    "aprovada",
    "em_execucao",
    "em_qa",
    "concluida",
    "faturada",
    "entregue",
    "cancelada",
    "aguardando_peca",
    "reaberta",
  ]),
  observacao: z.string().optional(),
});

export async function mudarStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status, observacao } = mudarStatusSchema.parse(req.body);

  const osAtual = await prisma.ordemServico.findFirst({
    where: { id, empresaId: req.usuario!.empresaId },
  });
  if (!osAtual) {
    return res.status(404).json({ erro: "Ordem de serviço não encontrada" });
  }

  const os = await prisma.ordemServico.update({
    where: { id },
    data: { status },
  });

  await prisma.osStatusHistorico.create({
    data: {
      osId: id,
      statusAnterior: osAtual.status,
      statusNovo: status,
      usuarioId: req.usuario!.usuarioId,
      observacao,
    },
  });

  res.json(os);
}
