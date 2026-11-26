import fs from "fs";
import path from "path";
import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { UPLOADS_RAIZ } from "../middlewares/upload";

// Os mesmos handlers servem para a própria empresa (/empresa) e para a tela de
// admin (/admin/empresas/:empresaId/dados) — só muda de onde vem o empresaId.
function empresaIdDaRequisicao(req: Request) {
  return req.params.empresaId ?? req.usuario!.empresaId;
}

const SELECT_EMPRESA = {
  id: true,
  nome: true,
  cnpj: true,
  logoUrl: true,
  assinaturaRecibo: true,
  assinanteNome: true,
  modeloOrcamento: true,
  plano: true,
  statusAssinatura: true,
  formaPagamento: true,
  diaVencimento: true,
  cpfCnpjBoleto: true,
  enderecoCep: true,
  enderecoLogradouro: true,
  enderecoNumero: true,
  enderecoComplemento: true,
  enderecoBairro: true,
  enderecoCidade: true,
  enderecoUf: true,
} as const;

export async function buscar(req: Request, res: Response) {
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaIdDaRequisicao(req) },
    select: SELECT_EMPRESA,
  });
  if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada" });
  res.json(empresa);
}

const textoOpcional = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

const somenteDigitos = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v ? v.replace(/\D/g, "") || null : null));

const atualizarSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome da empresa"),
  cnpj: somenteDigitos.refine((v) => !v || v.length === 14, "CNPJ deve ter 14 dígitos"),
  cpfCnpjBoleto: somenteDigitos.refine((v) => !v || v.length === 11 || v.length === 14, "CPF/CNPJ do boleto inválido"),
  diaVencimento: z.number().int().min(1).max(28).nullable().optional(),
  enderecoCep: somenteDigitos.refine((v) => !v || v.length === 8, "CEP deve ter 8 dígitos"),
  enderecoLogradouro: textoOpcional,
  enderecoNumero: textoOpcional,
  enderecoComplemento: textoOpcional,
  enderecoBairro: textoOpcional,
  enderecoCidade: textoOpcional,
  enderecoUf: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v) => (v ? v.toUpperCase().slice(0, 2) : null)),
});

export async function atualizar(req: Request, res: Response) {
  const empresaId = empresaIdDaRequisicao(req);
  const resultado = atualizarSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0]?.message ?? "Dados inválidos" });
  }
  const dados = resultado.data;

  if (dados.cnpj) {
    const outra = await prisma.empresa.findFirst({ where: { cnpj: dados.cnpj, NOT: { id: empresaId } } });
    if (outra) return res.status(409).json({ erro: "Já existe outra empresa cadastrada com este CNPJ" });
  }

  const empresa = await prisma.empresa.update({
    where: { id: empresaId },
    data: { ...dados, diaVencimento: dados.diaVencimento ?? undefined },
    select: SELECT_EMPRESA,
  });
  res.json(empresa);
}

function apagarArquivoLogo(logoUrl: string | null) {
  if (!logoUrl?.startsWith("/uploads/logos/")) return;
  const arquivo = path.join(UPLOADS_RAIZ, "logos", path.basename(logoUrl));
  fs.promises.unlink(arquivo).catch(() => {});
}

export async function enviarLogo(req: Request, res: Response) {
  if (!req.file) return res.status(400).json({ erro: "Envie uma imagem" });
  const empresaId = empresaIdDaRequisicao(req);

  const anterior = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { logoUrl: true } });
  if (!anterior) {
    apagarArquivoLogo(`/uploads/logos/${req.file.filename}`);
    return res.status(404).json({ erro: "Empresa não encontrada" });
  }

  const empresa = await prisma.empresa.update({
    where: { id: empresaId },
    data: { logoUrl: `/uploads/logos/${req.file.filename}` },
    select: SELECT_EMPRESA,
  });
  apagarArquivoLogo(anterior.logoUrl);
  res.json(empresa);
}

export async function removerLogo(req: Request, res: Response) {
  const empresaId = empresaIdDaRequisicao(req);
  const anterior = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { logoUrl: true } });
  if (!anterior) return res.status(404).json({ erro: "Empresa não encontrada" });

  const empresa = await prisma.empresa.update({
    where: { id: empresaId },
    data: { logoUrl: null },
    select: SELECT_EMPRESA,
  });
  apagarArquivoLogo(anterior.logoUrl);
  res.json(empresa);
}

const assinaturaSchema = z.object({
  imagem: z
    .string()
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, "Assinatura inválida")
    .max(500_000, "Assinatura muito grande"),
  nome: z.string().trim().min(1, "Informe o nome de quem assina"),
});

export async function salvarAssinatura(req: Request, res: Response) {
  const resultado = assinaturaSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0]?.message ?? "Dados inválidos" });
  }
  const empresa = await prisma.empresa.update({
    where: { id: empresaIdDaRequisicao(req) },
    data: { assinaturaRecibo: resultado.data.imagem, assinanteNome: resultado.data.nome },
    select: SELECT_EMPRESA,
  });
  res.json(empresa);
}

export async function removerAssinatura(req: Request, res: Response) {
  const empresa = await prisma.empresa.update({
    where: { id: empresaIdDaRequisicao(req) },
    data: { assinaturaRecibo: null, assinanteNome: null },
    select: SELECT_EMPRESA,
  });
  res.json(empresa);
}

const modeloOrcamentoSchema = z.object({
  resumido: z.boolean(),
  titulo: z.string().max(120),
  mostrarValoresItens: z.boolean(),
  mostrarMedidas: z.boolean(),
  mostrarMaterial: z.boolean(),
  mostrarDesenhos: z.boolean(),
  mostrarCroquis: z.boolean().default(true),
  mostrarMaoDeObra: z.boolean(),
  mostrarDespesas: z.boolean().default(true),
  mostrarAssinaturaCliente: z.boolean(),
  apresentacao: z.string().max(2000),
  prazoExecucao: z.string().max(300),
  condicoesPagamento: z.string().max(1000),
  validadeDias: z.number().int().min(0).max(365),
  observacoes: z.string().max(3000),
});

export async function salvarModeloOrcamento(req: Request, res: Response) {
  const resultado = modeloOrcamentoSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0]?.message ?? "Dados inválidos" });
  }
  const empresa = await prisma.empresa.update({
    where: { id: req.usuario!.empresaId },
    data: { modeloOrcamento: resultado.data },
    select: SELECT_EMPRESA,
  });
  res.json(empresa);
}
