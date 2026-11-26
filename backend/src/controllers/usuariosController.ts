import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { z } from "zod";
import { podeGerenciarPapel } from "../lib/hierarquiaPapel";
import { prisma } from "../lib/prisma";
import { achatarUsuario, usuarioResumoSelect } from "../lib/usuarios";

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
      // O acesso de suporte da equipe FluxOS não aparece para a empresa.
      ...(req.usuario!.papel !== "desenvolvedor" ? { NOT: { papel: "desenvolvedor" as const } } : {}),
    },
    select: usuarioResumoSelect,
    orderBy: { nome: "asc" },
  });

  res.json(usuarios.map(achatarUsuario));
}

export async function criar(req: Request, res: Response) {
  const dados = criarUsuarioSchema.parse(req.body);
  const email = dados.email.toLowerCase().trim();

  if (!podeGerenciarPapel(req.usuario!.papel, dados.papel)) {
    return res.status(403).json({ erro: "Você não pode cadastrar um usuário com papel maior que o seu" });
  }

  const contaExistente = await prisma.conta.findUnique({ where: { email } });

  if (contaExistente) {
    const jaVinculado = await prisma.usuario.findUnique({
      where: { contaId_empresaId: { contaId: contaExistente.id, empresaId: req.usuario!.empresaId } },
    });
    if (jaVinculado) {
      return res.status(409).json({ erro: "Este e-mail já faz parte da sua empresa" });
    }
  }

  const usuario = await prisma.$transaction(async (tx) => {
    const conta =
      contaExistente ??
      (await tx.conta.create({
        data: {
          email,
          senhaHash: await bcrypt.hash(dados.senha, 10),
          emailVerificado: true,
        },
      }));

    return tx.usuario.create({
      data: {
        empresaId: req.usuario!.empresaId,
        contaId: conta.id,
        nome: dados.nome,
        papel: dados.papel,
      },
      select: usuarioResumoSelect,
    });
  });

  // contaExistente: o e-mail já tinha login no FluxOS — a senha digitada NÃO foi
  // usada (a pessoa continua com a senha que já tinha). A tela avisa isso.
  res.status(201).json({ ...achatarUsuario(usuario), contaExistente: !!contaExistente });
}

const atualizarUsuarioSchema = z.object({
  nome: z.string().min(1).optional(),
  papel: z.enum(PAPEIS).optional(),
  ativo: z.boolean().optional(),
  senha: z.string().min(6, "A senha precisa ter ao menos 6 caracteres").optional(),
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

  const { senha, ...dadosUsuario } = dados;

  if (senha) {
    // A senha é do login (conta), que pode estar ligado a outras empresas. Um
    // administrador só troca a senha de quem pertence apenas à empresa dele.
    const outrasEmpresas = await prisma.usuario.count({
      where: { contaId: usuario.contaId, ativo: true, NOT: { empresaId: req.usuario!.empresaId } },
    });
    if (outrasEmpresas > 0 && req.usuario!.papel !== "desenvolvedor") {
      return res.status(403).json({
        erro: "Este usuário também acessa outra empresa, então a senha dele não pode ser trocada por aqui. Peça para ele usar a própria senha.",
      });
    }
    await prisma.conta.update({
      where: { id: usuario.contaId },
      data: { senhaHash: await bcrypt.hash(senha, 10), emailVerificado: true },
    });
  }

  const atualizado = await prisma.usuario.update({
    where: { id },
    data: dadosUsuario,
    select: usuarioResumoSelect,
  });

  res.json(achatarUsuario(atualizado));
}
