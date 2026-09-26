import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const criarClienteSchema = z.object({
  nome: z.string().min(1),
  documento: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email().optional(),
});

export async function listar(req: Request, res: Response) {
  const clientes = await prisma.cliente.findMany({
    where: { empresaId: req.usuario!.empresaId },
    orderBy: { nome: "asc" },
  });

  res.json(clientes);
}

export async function criar(req: Request, res: Response) {
  const dados = criarClienteSchema.parse(req.body);

  const cliente = await prisma.cliente.create({
    data: { ...dados, empresaId: req.usuario!.empresaId },
  });

  res.status(201).json(cliente);
}

const atualizarClienteSchema = z.object({
  nome: z.string().min(1).optional(),
  documento: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  ativo: z.boolean().optional(),
});

export async function atualizar(req: Request, res: Response) {
  const { id } = req.params;
  const dados = atualizarClienteSchema.parse(req.body);

  const cliente = await prisma.cliente.findFirst({
    where: { id, empresaId: req.usuario!.empresaId },
  });
  if (!cliente) {
    return res.status(404).json({ erro: "Cliente não encontrado" });
  }

  const atualizado = await prisma.cliente.update({
    where: { id },
    data: dados,
  });

  res.json(atualizado);
}
