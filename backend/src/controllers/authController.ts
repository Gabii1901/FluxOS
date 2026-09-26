import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { z } from "zod";
import { assinarToken } from "../lib/auth";
import { montarMapaPermissoes } from "../lib/permissoes";
import { prisma } from "../lib/prisma";

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

export async function login(req: Request, res: Response) {
  const { email, senha } = loginSchema.parse(req.body);

  const usuario = await prisma.usuario.findFirst({
    where: { email, ativo: true },
    include: { empresa: { select: { nome: true } } },
  });

  if (!usuario || !(await bcrypt.compare(senha, usuario.senhaHash))) {
    return res.status(401).json({ erro: "E-mail ou senha inválidos" });
  }

  const token = assinarToken({
    usuarioId: usuario.id,
    empresaId: usuario.empresaId,
    papel: usuario.papel,
  });

  const permissoes = await montarMapaPermissoes(usuario.id, usuario.papel);

  res.json({
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
      empresaId: usuario.empresaId,
      empresaNome: usuario.empresa.nome,
      permissoes,
    },
  });
}

export async function me(req: Request, res: Response) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuario!.usuarioId },
    select: {
      id: true,
      nome: true,
      email: true,
      papel: true,
      empresaId: true,
      empresa: { select: { nome: true } },
    },
  });

  if (!usuario) {
    return res.status(404).json({ erro: "Usuário não encontrado" });
  }

  const { empresa, ...resto } = usuario;
  const permissoes = await montarMapaPermissoes(usuario.id, usuario.papel);

  res.json({ ...resto, empresaNome: empresa.nome, permissoes });
}
