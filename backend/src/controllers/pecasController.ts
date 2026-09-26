import { Request, Response } from "express";
import { z } from "zod";
import { EstoqueInsuficienteError } from "../lib/errors";
import { prisma } from "../lib/prisma";

const criarPecaSchema = z.object({
  sku: z.string().min(1),
  nome: z.string().min(1),
  valorUnitario: z.number().nonnegative().default(0),
  quantidadeInicial: z.number().nonnegative().default(0),
});

export async function listar(req: Request, res: Response) {
  const pecas = await prisma.peca.findMany({
    where: { empresaId: req.usuario!.empresaId },
    orderBy: { nome: "asc" },
  });

  res.json(pecas);
}

export async function buscarPorId(req: Request, res: Response) {
  const { id } = req.params;

  const peca = await prisma.peca.findFirst({
    where: { id, empresaId: req.usuario!.empresaId },
    include: {
      movimentacoes: {
        orderBy: { criadoEm: "desc" },
        include: { usuario: { select: { id: true, nome: true } } },
      },
    },
  });

  if (!peca) {
    return res.status(404).json({ erro: "Peça não encontrada" });
  }

  res.json(peca);
}

export async function criar(req: Request, res: Response) {
  const dados = criarPecaSchema.parse(req.body);

  const jaExiste = await prisma.peca.findFirst({
    where: { empresaId: req.usuario!.empresaId, sku: dados.sku },
  });
  if (jaExiste) {
    return res.status(409).json({ erro: "Já existe uma peça com este SKU" });
  }

  const peca = await prisma.$transaction(async (tx) => {
    const novaPeca = await tx.peca.create({
      data: {
        empresaId: req.usuario!.empresaId,
        sku: dados.sku,
        nome: dados.nome,
        valorUnitario: dados.valorUnitario,
        quantidadeEstoque: dados.quantidadeInicial,
      },
    });

    if (dados.quantidadeInicial > 0) {
      await tx.movimentacaoEstoque.create({
        data: {
          pecaId: novaPeca.id,
          usuarioId: req.usuario!.usuarioId,
          tipo: "entrada",
          quantidade: dados.quantidadeInicial,
          motivo: "Estoque inicial",
        },
      });
    }

    return novaPeca;
  });

  res.status(201).json(peca);
}

const atualizarPecaSchema = z.object({
  sku: z.string().min(1).optional(),
  nome: z.string().min(1).optional(),
  valorUnitario: z.number().nonnegative().optional(),
  ativo: z.boolean().optional(),
});

export async function atualizar(req: Request, res: Response) {
  const { id } = req.params;
  const dados = atualizarPecaSchema.parse(req.body);

  const peca = await prisma.peca.findFirst({
    where: { id, empresaId: req.usuario!.empresaId },
  });
  if (!peca) {
    return res.status(404).json({ erro: "Peça não encontrada" });
  }

  if (dados.sku && dados.sku !== peca.sku) {
    const jaExiste = await prisma.peca.findFirst({
      where: { empresaId: req.usuario!.empresaId, sku: dados.sku, NOT: { id } },
    });
    if (jaExiste) {
      return res.status(409).json({ erro: "Já existe uma peça com este SKU" });
    }
  }

  const atualizada = await prisma.peca.update({
    where: { id },
    data: dados,
  });

  res.json(atualizada);
}

const criarMovimentacaoSchema = z.object({
  tipo: z.enum(["entrada", "saida"]),
  quantidade: z.number().positive(),
  motivo: z.string().optional(),
});

export async function criarMovimentacao(req: Request, res: Response) {
  const { id } = req.params;
  const dados = criarMovimentacaoSchema.parse(req.body);

  const peca = await prisma.peca.findFirst({
    where: { id, empresaId: req.usuario!.empresaId },
  });
  if (!peca) {
    return res.status(404).json({ erro: "Peça não encontrada" });
  }

  const delta = dados.tipo === "entrada" ? dados.quantidade : -dados.quantidade;

  const movimentacao = await prisma.$transaction(async (tx) => {
    if (dados.tipo === "saida") {
      const atualizadas = await tx.peca.updateMany({
        where: { id, quantidadeEstoque: { gte: dados.quantidade } },
        data: { quantidadeEstoque: { decrement: dados.quantidade } },
      });
      if (atualizadas.count === 0) {
        throw new EstoqueInsuficienteError();
      }
    } else {
      await tx.peca.update({
        where: { id },
        data: { quantidadeEstoque: { increment: dados.quantidade } },
      });
    }

    return tx.movimentacaoEstoque.create({
      data: {
        pecaId: id,
        usuarioId: req.usuario!.usuarioId,
        tipo: dados.tipo,
        quantidade: dados.quantidade,
        motivo: dados.motivo,
      },
    });
  }).catch((erro) => {
    if (erro instanceof EstoqueInsuficienteError) return null;
    throw erro;
  });

  if (!movimentacao) {
    return res.status(400).json({ erro: "Estoque insuficiente para esta saída" });
  }

  res.status(201).json(movimentacao);
}
