import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { z } from "zod";
import { criarAssinaturaCartao } from "../lib/assinaturas";
import { gerarCobrancaBoleto, proximaDataVencimento } from "../lib/boletos";
import { MODULOS } from "../lib/permissoes";
import { prisma } from "../lib/prisma";

export async function listarEmpresas(_req: Request, res: Response) {
  const empresas = await prisma.empresa.findMany({
    orderBy: { criadoEm: "desc" },
    select: {
      id: true,
      nome: true,
      cnpj: true,
      plano: true,
      statusAssinatura: true,
      formaPagamento: true,
      valorPersonalizado: true,
      criadoEm: true,
    },
  });
  res.json(empresas);
}

const enderecoSchema = z.object({
  cep: z.string().min(8),
  logradouro: z.string().min(1),
  numero: z.string().min(1),
  complemento: z.string().optional(),
  bairro: z.string().min(1),
  cidade: z.string().min(1),
  uf: z.string().length(2),
});

const criarEmpresaSchema = z.object({
  empresaNome: z.string().min(1),
  cnpj: z.string().optional(),
  endereco: enderecoSchema,
  admin: z.object({
    nome: z.string().min(1),
    email: z.string().email(),
    senha: z.string().min(6),
  }),
});

export async function criarEmpresa(req: Request, res: Response) {
  const dados = criarEmpresaSchema.parse(req.body);
  const email = dados.admin.email.toLowerCase().trim();

  const contaExistente = await prisma.conta.findUnique({ where: { email } });
  if (contaExistente) {
    return res.status(409).json({ erro: "Já existe uma conta com este e-mail" });
  }
  if (dados.cnpj) {
    const empresaExistente = await prisma.empresa.findUnique({ where: { cnpj: dados.cnpj } });
    if (empresaExistente) {
      return res.status(409).json({ erro: "Já existe uma empresa cadastrada com este CNPJ" });
    }
  }

  const senhaHash = await bcrypt.hash(dados.admin.senha, 10);

  const empresa = await prisma.$transaction(async (tx) => {
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
      data: { email, senhaHash, emailVerificado: true },
    });

    const usuario = await tx.usuario.create({
      data: { empresaId: empresa.id, contaId: conta.id, nome: dados.admin.nome, papel: "admin" },
    });

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

    return empresa;
  });

  res.status(201).json({ empresaId: empresa.id });
}

const cobrancaPersonalizadaSchema = z.object({
  valor: z.number().positive(),
  formaPagamento: z.enum(["cartao", "boleto"]),
  diaVencimento: z.number().int().min(1).max(28).optional(),
  cpfCnpj: z.string().min(11).optional(),
});

export async function criarCobrancaPersonalizada(req: Request, res: Response) {
  const { empresaId } = req.params;
  const dados = cobrancaPersonalizadaSchema.parse(req.body);

  if (dados.formaPagamento === "boleto" && (!dados.diaVencimento || !dados.cpfCnpj)) {
    return res.status(400).json({ erro: "Informe o dia de vencimento e o CPF/CNPJ para pagar com boleto" });
  }

  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) {
    return res.status(404).json({ erro: "Empresa não encontrada" });
  }

  const admin = await prisma.usuario.findFirst({
    where: { empresaId, ativo: true },
    include: { conta: { select: { email: true } } },
    orderBy: { criadoEm: "asc" },
  });
  if (!admin) {
    return res.status(400).json({ erro: "Empresa não tem nenhum usuário para ser o responsável pela cobrança" });
  }

  if (dados.formaPagamento === "cartao") {
    const assinatura = await criarAssinaturaCartao(empresa.id, admin.conta.email, {
      descricao: "Plano personalizado",
      valor: dados.valor,
    });

    await prisma.empresa.update({
      where: { id: empresa.id },
      data: {
        plano: "personalizado",
        formaPagamento: "cartao",
        valorPersonalizado: dados.valor,
        mpAssinaturaId: assinatura.mpAssinaturaId,
      },
    });

    return res.json({ checkoutUrl: assinatura.checkoutUrl });
  }

  await prisma.empresa.update({
    where: { id: empresa.id },
    data: {
      plano: "personalizado",
      formaPagamento: "boleto",
      valorPersonalizado: dados.valor,
      diaVencimento: dados.diaVencimento,
      cpfCnpjBoleto: dados.cpfCnpj,
    },
  });

  const vencimento = proximaDataVencimento(dados.diaVencimento!);
  const boleto = await gerarCobrancaBoleto(
    { ...empresa, cpfCnpjBoleto: dados.cpfCnpj! },
    { email: admin.conta.email, nome: admin.nome },
    { descricao: "Plano personalizado", valor: dados.valor },
    vencimento,
  );

  res.json({ boleto });
}
