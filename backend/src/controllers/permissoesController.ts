import { ModuloSistema } from "@prisma/client";
import { Request, Response } from "express";
import { z } from "zod";
import { podeGerenciarPapel } from "../lib/hierarquiaPapel";
import { MODULOS, montarMapaPermissoes } from "../lib/permissoes";
import { prisma } from "../lib/prisma";
import { achatarUsuario, usuarioResumoSelect } from "../lib/usuarios";

export async function listarUsuarios(req: Request, res: Response) {
  const usuarios = await prisma.usuario.findMany({
    where: { empresaId: req.usuario!.empresaId },
    select: usuarioResumoSelect,
    orderBy: { nome: "asc" },
  });

  res.json(usuarios.map(achatarUsuario));
}

export async function buscarPermissoes(req: Request, res: Response) {
  const { id } = req.params;

  const usuario = await prisma.usuario.findFirst({
    where: { id, empresaId: req.usuario!.empresaId },
    select: usuarioResumoSelect,
  });
  if (!usuario) {
    return res.status(404).json({ erro: "Usuário não encontrado" });
  }

  const permissoes = await montarMapaPermissoes(usuario.id, usuario.papel);

  res.json({ usuario: achatarUsuario(usuario), permissoes });
}

const permissaoModuloSchema = z.object({
  ver: z.boolean(),
  criar: z.boolean(),
  editar: z.boolean(),
  apagar: z.boolean(),
});

const atualizarPermissoesSchema = z.object({
  permissoes: z.record(z.enum(MODULOS as [ModuloSistema, ...ModuloSistema[]]), permissaoModuloSchema),
});

export async function atualizarPermissoes(req: Request, res: Response) {
  const { id } = req.params;
  const { permissoes } = atualizarPermissoesSchema.parse(req.body);

  const usuarioAlvo = await prisma.usuario.findFirst({
    where: { id, empresaId: req.usuario!.empresaId },
  });
  if (!usuarioAlvo) {
    return res.status(404).json({ erro: "Usuário não encontrado" });
  }

  if (!podeGerenciarPapel(req.usuario!.papel, usuarioAlvo.papel)) {
    return res.status(403).json({ erro: "Você não pode alterar as permissões de alguém com papel maior que o seu" });
  }

  await prisma.$transaction(
    Object.entries(permissoes).map(([modulo, acoes]) =>
      prisma.permissaoUsuario.upsert({
        where: { usuarioId_modulo: { usuarioId: id, modulo: modulo as ModuloSistema } },
        create: {
          usuarioId: id,
          modulo: modulo as ModuloSistema,
          podeVer: acoes.ver,
          podeCriar: acoes.criar,
          podeEditar: acoes.editar,
          podeApagar: acoes.apagar,
        },
        update: {
          podeVer: acoes.ver,
          podeCriar: acoes.criar,
          podeEditar: acoes.editar,
          podeApagar: acoes.apagar,
        },
      }),
    ),
  );

  const mapaAtualizado = await montarMapaPermissoes(id, usuarioAlvo.papel);
  res.json({ permissoes: mapaAtualizado });
}
