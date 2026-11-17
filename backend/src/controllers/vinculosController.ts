import { Request, Response } from "express";
import { z } from "zod";
import { MODULOS } from "../lib/permissoes";
import { prisma } from "../lib/prisma";
import { montarRespostaLogin } from "./authController";

// Telas de admin (só desenvolvedor): quem tem acesso a cada empresa.

export async function listar(req: Request, res: Response) {
  const usuarios = await prisma.usuario.findMany({
    where: { empresaId: req.params.empresaId },
    select: { id: true, nome: true, papel: true, ativo: true, criadoEm: true, conta: { select: { email: true } } },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });
  res.json(usuarios.map(({ conta, ...u }) => ({ ...u, email: conta.email })));
}

const vincularSchema = z.object({
  email: z.string().email("E-mail inválido"),
  papel: z.enum(["admin", "colaborador"]),
});

/** Dá acesso a uma conta que já existe (mesmo e-mail e senha) a mais uma empresa. */
export async function vincular(req: Request, res: Response) {
  const resultado = vincularSchema.safeParse(req.body);
  if (!resultado.success) return res.status(400).json({ erro: resultado.error.issues[0]?.message ?? "Dados inválidos" });
  const { email, papel } = resultado.data;
  const { empresaId } = req.params;

  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { id: true } });
  if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada" });

  const conta = await prisma.conta.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { usuarios: { orderBy: { criadoEm: "asc" }, take: 1, select: { nome: true } } },
  });
  if (!conta) {
    return res.status(404).json({ erro: "Nenhuma conta com esse e-mail. A pessoa precisa ter cadastro no FluxOS antes." });
  }

  const existente = await prisma.usuario.findUnique({ where: { contaId_empresaId: { contaId: conta.id, empresaId } } });
  if (existente?.ativo) return res.status(409).json({ erro: "Esse e-mail já tem acesso a esta empresa" });

  const usuario = await prisma.$transaction(async (tx) => {
    const u = existente
      ? await tx.usuario.update({ where: { id: existente.id }, data: { ativo: true, papel } })
      : await tx.usuario.create({
          data: { contaId: conta.id, empresaId, nome: conta.usuarios[0]?.nome ?? email.split("@")[0], papel },
        });

    // Administrador entra com acesso total; colaborador entra sem nada e as
    // permissões são liberadas depois na tela de Permissões da empresa.
    if (papel === "admin") {
      await tx.permissaoUsuario.deleteMany({ where: { usuarioId: u.id } });
      await tx.permissaoUsuario.createMany({
        data: MODULOS.map((modulo) => ({
          usuarioId: u.id,
          modulo,
          podeVer: true,
          podeCriar: true,
          podeEditar: true,
          podeApagar: true,
        })),
      });
    }
    return u;
  });

  res.status(201).json({ id: usuario.id });
}

/** Remove o acesso (desativa o vínculo — o histórico de OS desse usuário continua). */
export async function desvincular(req: Request, res: Response) {
  const usuario = await prisma.usuario.findFirst({
    where: { id: req.params.usuarioId, empresaId: req.params.empresaId },
  });
  if (!usuario) return res.status(404).json({ erro: "Vínculo não encontrado" });
  if (usuario.id === req.usuario!.usuarioId) {
    return res.status(400).json({ erro: "Você não pode remover o acesso que está usando agora" });
  }
  await prisma.usuario.update({ where: { id: usuario.id }, data: { ativo: false } });
  res.status(204).send();
}

const acessarSchema = z.object({ lembrar: z.boolean().optional() });

/**
 * Desenvolvedor entra em qualquer empresa (suporte). Cria, se ainda não existir,
 * um vínculo de desenvolvedor da própria conta com a empresa — ele fica oculto
 * na lista de usuários da empresa.
 */
export async function acessar(req: Request, res: Response) {
  const { lembrar = false } = acessarSchema.parse(req.body ?? {});
  const { empresaId } = req.params;

  const [empresa, atual] = await Promise.all([
    prisma.empresa.findUnique({ where: { id: empresaId }, select: { id: true } }),
    prisma.usuario.findUnique({ where: { id: req.usuario!.usuarioId }, select: { contaId: true, nome: true } }),
  ]);
  if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada" });
  if (!atual) return res.status(404).json({ erro: "Usuário não encontrado" });

  const vinculo = await prisma.usuario.upsert({
    where: { contaId_empresaId: { contaId: atual.contaId, empresaId } },
    update: { ativo: true, papel: "desenvolvedor" },
    create: { contaId: atual.contaId, empresaId, nome: atual.nome, papel: "desenvolvedor" },
  });

  res.json(await montarRespostaLogin(vinculo.id, lembrar));
}
