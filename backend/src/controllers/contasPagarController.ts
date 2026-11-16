import { randomUUID } from "crypto";
import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const CATEGORIAS_PADRAO = [
  "Aluguel",
  "Fornecedor / Material",
  "Salários",
  "Impostos",
  "Água / Luz / Internet",
  "Outros",
];

// "YYYY-MM-DD" -> Date em UTC (coluna é DATE, sem fuso)
const dataSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
function paraData(valor: string) {
  return new Date(`${valor}T00:00:00.000Z`);
}

function hojeUtc() {
  const agora = new Date();
  return new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate()));
}

function somarMeses(data: Date, meses: number) {
  const ano = data.getUTCFullYear();
  const mes = data.getUTCMonth() + meses;
  const dia = data.getUTCDate();
  // Mantém o dia; se o mês não tiver esse dia (ex.: 31), usa o último dia do mês.
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ano, mes, Math.min(dia, ultimoDia)));
}

const includeConta = { categoria: { select: { id: true, nome: true } } };

// ============================================================
// Categorias
// ============================================================

export async function listarCategorias(req: Request, res: Response) {
  const empresaId = req.usuario!.empresaId;
  const existentes = await prisma.categoriaContaPagar.count({ where: { empresaId } });
  if (existentes === 0) {
    await prisma.categoriaContaPagar.createMany({
      data: CATEGORIAS_PADRAO.map((nome) => ({ empresaId, nome })),
    });
  }
  const categorias = await prisma.categoriaContaPagar.findMany({
    where: { empresaId, ativo: true },
    orderBy: { nome: "asc" },
  });
  res.json(categorias);
}

export async function criarCategoria(req: Request, res: Response) {
  const { nome } = z.object({ nome: z.string().trim().min(1) }).parse(req.body);
  const categoria = await prisma.categoriaContaPagar.create({
    data: { nome, empresaId: req.usuario!.empresaId },
  });
  res.status(201).json(categoria);
}

export async function removerCategoria(req: Request, res: Response) {
  const categoria = await prisma.categoriaContaPagar.findFirst({
    where: { id: req.params.id, empresaId: req.usuario!.empresaId },
  });
  if (!categoria) return res.status(404).json({ erro: "Categoria não encontrada" });
  // Desativa em vez de apagar para não perder a categoria das contas antigas.
  await prisma.categoriaContaPagar.update({ where: { id: categoria.id }, data: { ativo: false } });
  res.status(204).send();
}

// ============================================================
// Contas
// ============================================================

export async function listar(req: Request, res: Response) {
  const filtros = z
    .object({
      status: z.enum(["aberta", "vencida", "paga"]).optional(),
      de: dataSchema.optional(),
      ate: dataSchema.optional(),
      categoriaId: z.string().optional(),
    })
    .parse(req.query);

  const hoje = hojeUtc();
  const where: any = { empresaId: req.usuario!.empresaId };
  if (filtros.categoriaId) where.categoriaId = filtros.categoriaId;
  if (filtros.de || filtros.ate) {
    where.vencimento = {};
    if (filtros.de) where.vencimento.gte = paraData(filtros.de);
    if (filtros.ate) where.vencimento.lte = paraData(filtros.ate);
  }
  if (filtros.status === "paga") where.pagoEm = { not: null };
  if (filtros.status === "aberta") {
    where.pagoEm = null;
    where.vencimento = { ...(where.vencimento ?? {}), gte: maxData(where.vencimento?.gte, hoje) };
  }
  if (filtros.status === "vencida") {
    where.pagoEm = null;
    where.vencimento = { ...(where.vencimento ?? {}), lt: hoje };
  }

  const contas = await prisma.contaPagar.findMany({
    where,
    include: includeConta,
    orderBy: [{ vencimento: "asc" }, { criadoEm: "asc" }],
  });
  res.json(contas);
}

function maxData(a: Date | undefined, b: Date) {
  return a && a > b ? a : b;
}

export async function resumo(req: Request, res: Response) {
  const empresaId = req.usuario!.empresaId;
  const hoje = hojeUtc();
  const em7Dias = new Date(hoje);
  em7Dias.setUTCDate(em7Dias.getUTCDate() + 7);
  const inicioMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));
  const fimMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 0));

  const [emAberto, vencido, proximos7, pagoNoMes] = await Promise.all([
    prisma.contaPagar.aggregate({
      where: { empresaId, pagoEm: null, vencimento: { gte: hoje } },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.contaPagar.aggregate({
      where: { empresaId, pagoEm: null, vencimento: { lt: hoje } },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.contaPagar.aggregate({
      where: { empresaId, pagoEm: null, vencimento: { gte: hoje, lte: em7Dias } },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.contaPagar.aggregate({
      where: { empresaId, pagoEm: { gte: inicioMes, lte: fimMes } },
      _sum: { valor: true },
      _count: true,
    }),
  ]);

  const formatar = (r: { _sum: { valor: any }; _count: number }) => ({
    valor: Number(r._sum.valor ?? 0),
    quantidade: r._count,
  });

  res.json({
    emAberto: formatar(emAberto),
    vencido: formatar(vencido),
    proximos7Dias: formatar(proximos7),
    pagoNoMes: formatar(pagoNoMes),
  });
}

const contaSchema = z.object({
  descricao: z.string().trim().min(1),
  categoriaId: z.string().nullable().optional(),
  fornecedorNome: z.string().trim().nullable().optional(),
  fornecedorDocumento: z.string().trim().nullable().optional(),
  valor: z.number().positive(),
  vencimento: dataSchema,
  formaPagamento: z.string().trim().nullable().optional(),
  observacao: z.string().trim().nullable().optional(),
});

async function validarCategoria(empresaId: string, categoriaId?: string | null) {
  if (!categoriaId) return true;
  const categoria = await prisma.categoriaContaPagar.findFirst({ where: { id: categoriaId, empresaId } });
  return !!categoria;
}

export async function criar(req: Request, res: Response) {
  const dados = contaSchema
    .extend({
      // 1 = conta única. 2..60 = cria uma conta por mês com o mesmo dia de vencimento.
      repetirMeses: z.number().int().min(1).max(60).optional(),
      jaPaga: z.boolean().optional(),
    })
    .parse(req.body);
  const empresaId = req.usuario!.empresaId;

  if (!(await validarCategoria(empresaId, dados.categoriaId))) {
    return res.status(400).json({ erro: "Categoria inválida" });
  }

  const { repetirMeses = 1, jaPaga, vencimento, ...resto } = dados;
  const primeiroVencimento = paraData(vencimento);
  const grupoRecorrenciaId = repetirMeses > 1 ? randomUUID() : null;

  const registros = Array.from({ length: repetirMeses }, (_, i) => ({
    ...resto,
    empresaId,
    vencimento: somarMeses(primeiroVencimento, i),
    // Só a primeira pode nascer paga (ex.: lançou algo que já pagou hoje).
    pagoEm: jaPaga && i === 0 ? hojeUtc() : null,
    grupoRecorrenciaId,
    parcela: repetirMeses > 1 ? i + 1 : null,
    totalParcelas: repetirMeses > 1 ? repetirMeses : null,
  }));

  await prisma.contaPagar.createMany({ data: registros });
  res.status(201).json({ criadas: registros.length });
}

async function buscarConta(req: Request) {
  return prisma.contaPagar.findFirst({ where: { id: req.params.id, empresaId: req.usuario!.empresaId } });
}

export async function atualizar(req: Request, res: Response) {
  const dados = contaSchema.partial().parse(req.body);
  const conta = await buscarConta(req);
  if (!conta) return res.status(404).json({ erro: "Conta não encontrada" });
  if (!(await validarCategoria(conta.empresaId, dados.categoriaId))) {
    return res.status(400).json({ erro: "Categoria inválida" });
  }

  const { vencimento, ...resto } = dados;
  const atualizada = await prisma.contaPagar.update({
    where: { id: conta.id },
    data: { ...resto, ...(vencimento ? { vencimento: paraData(vencimento) } : {}) },
    include: includeConta,
  });
  res.json(atualizada);
}

export async function pagar(req: Request, res: Response) {
  const { pagoEm } = z.object({ pagoEm: dataSchema.optional() }).parse(req.body ?? {});
  const conta = await buscarConta(req);
  if (!conta) return res.status(404).json({ erro: "Conta não encontrada" });
  const atualizada = await prisma.contaPagar.update({
    where: { id: conta.id },
    data: { pagoEm: pagoEm ? paraData(pagoEm) : hojeUtc() },
    include: includeConta,
  });
  res.json(atualizada);
}

export async function reabrir(req: Request, res: Response) {
  const conta = await buscarConta(req);
  if (!conta) return res.status(404).json({ erro: "Conta não encontrada" });
  const atualizada = await prisma.contaPagar.update({
    where: { id: conta.id },
    data: { pagoEm: null },
    include: includeConta,
  });
  res.json(atualizada);
}

export async function remover(req: Request, res: Response) {
  const { proximas } = z.object({ proximas: z.enum(["true", "false"]).optional() }).parse(req.query);
  const conta = await buscarConta(req);
  if (!conta) return res.status(404).json({ erro: "Conta não encontrada" });

  if (proximas === "true" && conta.grupoRecorrenciaId) {
    // Apaga esta e as próximas parcelas ainda não pagas do mesmo grupo.
    const { count } = await prisma.contaPagar.deleteMany({
      where: {
        empresaId: conta.empresaId,
        grupoRecorrenciaId: conta.grupoRecorrenciaId,
        vencimento: { gte: conta.vencimento },
        pagoEm: null,
      },
    });
    // A própria conta pode estar paga — nesse caso remove ela também.
    if (conta.pagoEm) await prisma.contaPagar.delete({ where: { id: conta.id } });
    return res.json({ removidas: count + (conta.pagoEm ? 1 : 0) });
  }

  await prisma.contaPagar.delete({ where: { id: conta.id } });
  res.json({ removidas: 1 });
}

// ============================================================
// Consulta de CNPJ (dados públicos da Receita Federal)
// BrasilAPI como fonte principal e ReceitaWS como reserva.
// ============================================================

const HEADERS_CONSULTA = { "User-Agent": "FluxOS/1.0", Accept: "application/json" };

interface DadosCnpj {
  cnpj: string;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  situacao: string | null;
  municipio: string | null;
  uf: string | null;
}

async function consultarBrasilApi(cnpj: string): Promise<DadosCnpj | "nao_encontrado" | null> {
  const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    headers: HEADERS_CONSULTA,
    signal: AbortSignal.timeout(8000),
  });
  if (r.status === 404 || r.status === 400) return "nao_encontrado";
  if (!r.ok) return null;
  const d: any = await r.json();
  return {
    cnpj,
    razaoSocial: d.razao_social ?? null,
    nomeFantasia: d.nome_fantasia || null,
    situacao: d.descricao_situacao_cadastral ?? null,
    municipio: d.municipio ?? null,
    uf: d.uf ?? null,
  };
}

async function consultarReceitaWs(cnpj: string): Promise<DadosCnpj | "nao_encontrado" | null> {
  const r = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`, {
    headers: HEADERS_CONSULTA,
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) return null;
  const d: any = await r.json();
  if (d.status === "ERROR") return "nao_encontrado";
  return {
    cnpj,
    razaoSocial: d.nome ?? null,
    nomeFantasia: d.fantasia || null,
    situacao: d.situacao ?? null,
    municipio: d.municipio ?? null,
    uf: d.uf ?? null,
  };
}

export async function consultarCnpj(req: Request, res: Response) {
  const cnpj = req.params.cnpj.replace(/\D/g, "");
  if (cnpj.length !== 14) return res.status(400).json({ erro: "CNPJ deve ter 14 dígitos" });

  for (const consultar of [consultarBrasilApi, consultarReceitaWs]) {
    try {
      const resultado = await consultar(cnpj);
      if (resultado === "nao_encontrado") return res.status(404).json({ erro: "CNPJ não encontrado na Receita" });
      if (resultado) return res.json(resultado);
    } catch {
      // tenta a próxima fonte
    }
  }
  res.status(502).json({ erro: "Consulta à Receita indisponível no momento. Preencha o nome manualmente." });
}
