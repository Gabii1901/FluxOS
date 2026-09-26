import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { z } from "zod";
import { podeGerenciarPapel } from "../lib/hierarquiaPapel";
import { prisma } from "../lib/prisma";

const usuarioResumoSelect = {
  id: true,
  nome: true,
  email: true,
  papel: true,
  ativo: true,
  criadoEm: true,
} as const;

const PAPEIS = ["desenvolvedor", "admin", "colaborador"] as const;

const criarUsuarioSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  senha: z.string().min(6),
  papel: z.enum(PAPEIS),
});

export async function listar(req: Request, res: Response) {
  const { papel } = req.query;

  const usuarios = await prisma.usuario.findMany({
    where: {
      empresaId: req.usuario!.empresaId,
      papel: typeof papel === "string" ? (papel as any) : undefined,
    },
    select: usuarioResumoSelect,
    orderBy: { nome: "asc" },
  });

  res.json(usuarios);
}

export async function criar(req: Request, res: Response) {
  const dados = criarUsuarioSchema.parse(req.body);

  if (!podeGerenciarPapel(req.usuario!.papel, dados.papel)) {
    return res.status(403).json({ erro: "Você não pode cadastrar um usuário com papel maior que o seu" });
  }

  const jaExiste = await prisma.usuario.findFirst({
    where: { empresaId: req.usuario!.empresaId, email: dados.email },
  });
  if (jaExiste) {
    return res.status(409).json({ erro: "Já existe um usuário com este e-mail" });
  }

  const senhaHash = await bcrypt.hash(dados.senha, 10);

  const usuario = await prisma.usuario.create({
    data: {
      empresaId: req.usuario!.empresaId,
      nome: dados.nome,
      email: dados.email,
      papel: dados.papel,
      senhaHash,
    },
    select: usuarioResumoSelect,
  });

  res.status(201).json(usuario);
}

const atualizarUsuarioSchema = z.object({
  nome: z.string().min(1).optional(),
  email: z.string().email().optional(),
  papel: z.enum(PAPEIS).optional(),
  ativo: z.boolean().optional(),
  senha: z.string().min(6).optional(),
});

export async function atualizar(req: Request, res: Response) {
  const { id } = req.params;
  const dados = atualizarUsuarioSchema.parse(req.body);

  const usuario = await prisma.usuario.findFirst({
    where: { id, empresaId: req.usuario!.empresaId },
  });
  if (!usuario) {
    return res.status(404).json({ erro: "Usuário não encontrado" });
  }

  if (dados.ativo === false && id === req.usuario!.usuarioId) {
    return res.status(400).json({ erro: "Você não pode desativar sua própria conta" });
  }

  // O solicitante precisa ter nível suficiente tanto para o papel atual do
  // alvo quanto para o novo papel pedido — impede rebaixar/promover alguém
  // de nível igual ou maior que o seu.
  const papelParaChecar = dados.papel ?? usuario.papel;
  if (!podeGerenciarPapel(req.usuario!.papel, papelParaChecar) || !podeGerenciarPapel(req.usuario!.papel, usuario.papel)) {
    return res.status(403).json({ erro: "Você não pode gerenciar um usuário com papel maior que o seu" });
  }

  if (dados.email && dados.email !== usuario.email) {
    const jaExiste = await prisma.usuario.findFirst({
      where: { empresaId: req.usuario!.empresaId, email: dados.email, NOT: { id } },
    });
    if (jaExiste) {
      return res.status(409).json({ erro: "Já existe um usuário com este e-mail" });
    }
  }

  const { senha, ...resto } = dados;

  const atualizado = await prisma.usuario.update({
    where: { id },
    data: {
      ...resto,
      senhaHash: senha ? await bcrypt.hash(senha, 10) : undefined,
    },
    select: usuarioResumoSelect,
  });

  res.json(atualizado);
}
