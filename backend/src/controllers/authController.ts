import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { z } from "zod";
import { assinarToken, assinarPreAuthToken, verificarPreAuthToken } from "../lib/auth";
import { enviarEmailConfirmacao } from "../lib/email";
import { MODULOS, montarMapaPermissoes } from "../lib/permissoes";
import { prisma } from "../lib/prisma";
import { gerarTokenVerificacao, hashToken } from "../lib/tokens";

async function montarRespostaLogin(usuarioId: string) {
  const usuario = await prisma.usuario.findUniqueOrThrow({
    where: { id: usuarioId },
    include: {
      empresa: { select: { nome: true, plano: true, statusAssinatura: true } },
      conta: { select: { email: true } },
    },
  });

  const token = assinarToken({
    usuarioId: usuario.id,
    empresaId: usuario.empresaId,
    papel: usuario.papel,
  });

  const permissoes = await montarMapaPermissoes(usuario.id, usuario.papel);

  return {
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.conta.email,
      papel: usuario.papel,
      empresaId: usuario.empresaId,
      empresaNome: usuario.empresa.nome,
      plano: usuario.empresa.plano,
      statusAssinatura: usuario.empresa.statusAssinatura,
      permissoes,
    },
  };
}

const cadastroSchema = z.object({
  empresaNome: z.string().min(1, "Informe o nome da empresa"),
  cnpj: z.string().optional(),
  nome: z.string().min(1, "Informe seu nome"),
  email: z.string().email(),
  senha: z.string().min(6, "A senha precisa ter ao menos 6 caracteres"),
  endereco: z.object({
    cep: z.string().min(8, "CEP inválido"),
    logradouro: z.string().min(1, "Informe a rua"),
    numero: z.string().min(1, "Informe o número"),
    complemento: z.string().optional(),
    bairro: z.string().min(1, "Informe o bairro"),
    cidade: z.string().min(1, "Informe a cidade"),
    uf: z.string().length(2, "UF inválida"),
  }),
});

export async function cadastrar(req: Request, res: Response) {
  const dados = cadastroSchema.parse(req.body);
  const email = dados.email.toLowerCase().trim();

  const contaExistente = await prisma.conta.findUnique({ where: { email } });
  if (contaExistente) {
    return res.status(409).json({ erro: "Já existe uma conta com este e-mail. Faça login." });
  }

  if (dados.cnpj) {
    const empresaExistente = await prisma.empresa.findUnique({ where: { cnpj: dados.cnpj } });
    if (empresaExistente) {
      return res.status(409).json({ erro: "Já existe uma empresa cadastrada com este CNPJ" });
    }
  }

  const senhaHash = await bcrypt.hash(dados.senha, 10);
  const { token, hash, expiraEm } = gerarTokenVerificacao();

  await prisma.$transaction(async (tx) => {
    const empresa = await tx.empresa.create({
      data: {
        nome: dados.empresaNome,
        cnpj: dados.cnpj || null,
        enderecoCep: dados.endereco.cep.replace(/\D/g, ""),
        enderecoLogradouro: dados.endereco.logradouro,
        enderecoNumero: dados.endereco.numero,
        enderecoComplemento: dados.endereco.complemento || null,
        enderecoBairro: dados.endereco.bairro,
        enderecoCidade: dados.endereco.cidade,
        enderecoUf: dados.endereco.uf.toUpperCase(),
      },
    });

    const conta = await tx.conta.create({
      data: {
        email,
        senhaHash,
        tokenVerificacao: hash,
        tokenVerificacaoExpiraEm: expiraEm,
      },
    });

    const usuario = await tx.usuario.create({
      data: {
        empresaId: empresa.id,
        contaId: conta.id,
        nome: dados.nome,
        papel: "admin",
      },
    });

    // Quem cadastra a empresa é o dono dela: acesso total a todos os
    // módulos desde o início, sem precisar que alguém configure depois.
    await tx.permissaoUsuario.createMany({
      data: MODULOS.map((modulo) => ({
        usuarioId: usuario.id,
        modulo,
        podeVer: true,
        podeCriar: true,
        podeEditar: true,
        podeApagar: true,
      })),
    });
  });

  await enviarEmailConfirmacao(email, dados.nome, token);

  res.status(201).json({ mensagem: "Cadastro criado. Verifique seu e-mail para confirmar a conta." });
}

const confirmarEmailSchema = z.object({ token: z.string().min(1) });

export async function confirmarEmail(req: Request, res: Response) {
  const { token } = confirmarEmailSchema.parse(req.body);
  const hash = hashToken(token);

  const conta = await prisma.conta.findFirst({ where: { tokenVerificacao: hash } });
  if (!conta || !conta.tokenVerificacaoExpiraEm || conta.tokenVerificacaoExpiraEm < new Date()) {
    return res.status(400).json({ erro: "Link de confirmação inválido ou expirado" });
  }

  await prisma.conta.update({
    where: { id: conta.id },
    data: { emailVerificado: true, tokenVerificacao: null, tokenVerificacaoExpiraEm: null },
  });

  const primeiroUsuario = await prisma.usuario.findFirst({
    where: { contaId: conta.id, ativo: true },
    orderBy: { criadoEm: "asc" },
  });
  if (!primeiroUsuario) {
    return res.status(404).json({ erro: "Nenhuma empresa vinculada a esta conta" });
  }

  res.json(await montarRespostaLogin(primeiroUsuario.id));
}

const reenviarSchema = z.object({ email: z.string().email() });

export async function reenviarConfirmacao(req: Request, res: Response) {
  const { email } = reenviarSchema.parse(req.body);
  const conta = await prisma.conta.findUnique({ where: { email: email.toLowerCase().trim() } });

  // Sempre responde OK, mesmo se a conta não existir ou já estiver confirmada,
  // pra não revelar quais e-mails têm conta no sistema.
  if (conta && !conta.emailVerificado) {
    const primeiroUsuario = await prisma.usuario.findFirst({ where: { contaId: conta.id } });
    const { token, hash, expiraEm } = gerarTokenVerificacao();
    await prisma.conta.update({
      where: { id: conta.id },
      data: { tokenVerificacao: hash, tokenVerificacaoExpiraEm: expiraEm },
    });
    await enviarEmailConfirmacao(conta.email, primeiroUsuario?.nome ?? "", token);
  }

  res.json({ mensagem: "Se o e-mail existir, um novo link de confirmação foi enviado." });
}

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

export async function login(req: Request, res: Response) {
  const { email, senha } = loginSchema.parse(req.body);

  const conta = await prisma.conta.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!conta || !(await bcrypt.compare(senha, conta.senhaHash))) {
    return res.status(401).json({ erro: "E-mail ou senha inválidos" });
  }

  if (!conta.emailVerificado) {
    return res.status(403).json({ erro: "Confirme seu e-mail antes de entrar", precisaConfirmarEmail: true });
  }

  const vinculos = await prisma.usuario.findMany({
    where: { contaId: conta.id, ativo: true },
    include: { empresa: { select: { id: true, nome: true } } },
    orderBy: { criadoEm: "asc" },
  });

  if (vinculos.length === 0) {
    return res.status(403).json({ erro: "Esta conta não está vinculada a nenhuma empresa ativa" });
  }

  if (vinculos.length === 1) {
    return res.json(await montarRespostaLogin(vinculos[0].id));
  }

  const preAuthToken = assinarPreAuthToken({ contaId: conta.id });
  res.json({
    precisaEscolherEmpresa: true,
    preAuthToken,
    empresas: vinculos.map((v) => ({ empresaId: v.empresa.id, empresaNome: v.empresa.nome })),
  });
}

const selecionarEmpresaSchema = z.object({
  preAuthToken: z.string().min(1),
  empresaId: z.string().min(1),
});

export async function selecionarEmpresa(req: Request, res: Response) {
  const { preAuthToken, empresaId } = selecionarEmpresaSchema.parse(req.body);

  let contaId: string;
  try {
    contaId = verificarPreAuthToken(preAuthToken).contaId;
  } catch {
    return res.status(401).json({ erro: "Sessão de login expirada, faça login novamente" });
  }

  const vinculo = await prisma.usuario.findFirst({
    where: { contaId, empresaId, ativo: true },
  });
  if (!vinculo) {
    return res.status(403).json({ erro: "Você não tem acesso a esta empresa" });
  }

  res.json(await montarRespostaLogin(vinculo.id));
}

export async function me(req: Request, res: Response) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuario!.usuarioId },
    select: {
      id: true,
      nome: true,
      papel: true,
      empresaId: true,
      empresa: { select: { nome: true, plano: true, statusAssinatura: true } },
      conta: { select: { email: true } },
    },
  });

  if (!usuario) {
    return res.status(404).json({ erro: "Usuário não encontrado" });
  }

  const { empresa, conta, ...resto } = usuario;
  const permissoes = await montarMapaPermissoes(usuario.id, usuario.papel);

  res.json({
    ...resto,
    email: conta.email,
    empresaNome: empresa.nome,
    plano: empresa.plano,
    statusAssinatura: empresa.statusAssinatura,
    permissoes,
  });
}
