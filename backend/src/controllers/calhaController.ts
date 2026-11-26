import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { z } from "zod";
import {
  calcularCustoItem,
  calcularCustoMaoDeObra,
  calcularPrecoComMarkup,
  ehServicoMetal,
  recalcularTotais,
} from "../lib/calhaCalculo";
import { prisma } from "../lib/prisma";

const TIPOS_SERVICO = [
  "calha",
  "algerosa",
  "capeamento",
  "rufo",
  "pingadeira",
  "tubulacao",
  "colarinho",
  "exaustor_eolico",
  "adicional",
  "venda",
] as const;

const UNIDADES = ["m", "cm", "mm"] as const;

// ============================================================
// Materiais / chapas
// ============================================================

const materialSchema = z.object({
  nome: z.string().min(1),
  espessuraMm: z.number().positive().optional(),
  tipo: z.string().optional(),
  cor: z.string().optional(),
  precoM2: z.number().nonnegative(),
});

export async function listarMateriais(req: Request, res: Response) {
  const materiais = await prisma.materialChapa.findMany({
    where: { empresaId: req.usuario!.empresaId, ativo: true },
    orderBy: { nome: "asc" },
  });
  res.json(materiais);
}

export async function criarMaterial(req: Request, res: Response) {
  const dados = materialSchema.parse(req.body);
  const material = await prisma.materialChapa.create({
    data: { ...dados, empresaId: req.usuario!.empresaId },
  });
  res.status(201).json(material);
}

export async function atualizarMaterial(req: Request, res: Response) {
  const { id } = req.params;
  const dados = materialSchema.partial().parse(req.body);

  const material = await prisma.materialChapa.findFirst({
    where: { id, empresaId: req.usuario!.empresaId },
  });
  if (!material) return res.status(404).json({ erro: "Material não encontrado" });

  const atualizado = await prisma.materialChapa.update({ where: { id }, data: dados });
  res.json(atualizado);
}

export async function apagarMaterial(req: Request, res: Response) {
  const { id } = req.params;
  const material = await prisma.materialChapa.findFirst({
    where: { id, empresaId: req.usuario!.empresaId },
  });
  if (!material) return res.status(404).json({ erro: "Material não encontrado" });

  await prisma.materialChapa.update({ where: { id }, data: { ativo: false } });
  res.status(204).send();
}

// ============================================================
// Perfis de calha
// ============================================================

const segmentoSchema = z.object({
  nome: z.string().min(1),
  valorCm: z.number(),
  anguloGraus: z.number().optional(),
});

const perfilSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional(),
  segmentos: z.array(segmentoSchema).min(1),
});

export async function listarPerfis(req: Request, res: Response) {
  const perfis = await prisma.perfilCalha.findMany({
    where: {
      ativo: true,
      OR: [{ empresaId: null }, { empresaId: req.usuario!.empresaId }],
    },
    orderBy: [{ padrao: "desc" }, { nome: "asc" }],
  });
  res.json(perfis);
}

export async function criarPerfil(req: Request, res: Response) {
  const dados = perfilSchema.parse(req.body);
  const perfil = await prisma.perfilCalha.create({
    data: { ...dados, empresaId: req.usuario!.empresaId, padrao: false },
  });
  res.status(201).json(perfil);
}

export async function atualizarPerfil(req: Request, res: Response) {
  const { id } = req.params;
  const dados = perfilSchema.parse(req.body);

  const perfil = await prisma.perfilCalha.findFirst({
    where: { id, empresaId: req.usuario!.empresaId, padrao: false },
  });
  if (!perfil) return res.status(404).json({ erro: "Perfil não encontrado" });

  const atualizado = await prisma.perfilCalha.update({ where: { id }, data: dados });
  res.json(atualizado);
}

export async function apagarPerfil(req: Request, res: Response) {
  const { id } = req.params;
  const perfil = await prisma.perfilCalha.findFirst({
    where: { id, empresaId: req.usuario!.empresaId, padrao: false },
  });
  if (!perfil) return res.status(404).json({ erro: "Perfil não encontrado" });

  await prisma.perfilCalha.update({ where: { id }, data: { ativo: false } });
  res.status(204).send();
}

// ============================================================
// Orçamentos
// ============================================================

const orcamentoInclude = {
  empresa: { select: { nome: true } },
  cliente: { select: { id: true, nome: true, telefone: true, email: true, documento: true } },
  os: { select: { id: true, numero: true, problemaRelatado: true } },
  itens: { include: { material: true, perfil: true }, orderBy: { criadoEm: "asc" } },
  maoDeObra: { include: { usuario: { select: { id: true, nome: true } } }, orderBy: { criadoEm: "asc" } },
} satisfies Prisma.OrcamentoCalhaInclude;

async function recalcularEAtualizarOrcamento(tx: Prisma.TransactionClient, orcamentoId: string) {
  const [itens, maoDeObra] = await Promise.all([
    tx.orcamentoCalhaItem.findMany({ where: { orcamentoId } }),
    tx.orcamentoCalhaMaoDeObra.findMany({ where: { orcamentoId } }),
  ]);

  const totais = recalcularTotais(
    itens.map((i) => ({ custoCalculado: Number(i.custoCalculado), precoCalculado: Number(i.precoCalculado) })),
    maoDeObra.map((m) => ({ custoTotal: Number(m.custoTotal) })),
  );

  await tx.orcamentoCalha.update({
    where: { id: orcamentoId },
    data: { custoTotal: totais.custoTotal, precoTotal: totais.precoTotal },
  });
}

function buscarOsDaEmpresa(empresaId: string, osId: string) {
  return prisma.ordemServico.findFirst({ where: { id: osId, empresaId } });
}

const criarOrcamentoSchema = z.object({
  clienteId: z.string().optional(),
  osId: z.string().optional(),
  acrescimoPercentual: z.number().min(0).max(1000).default(30),
});

export async function criarOrcamento(req: Request, res: Response) {
  const dados = criarOrcamentoSchema.parse(req.body);

  let clienteId = dados.clienteId;
  if (dados.osId) {
    const os = await buscarOsDaEmpresa(req.usuario!.empresaId, dados.osId);
    if (!os) return res.status(404).json({ erro: "Ordem de serviço não encontrada" });
    clienteId = os.clienteId;
  }

  const orcamento = await prisma.orcamentoCalha.create({
    data: {
      empresaId: req.usuario!.empresaId,
      clienteId,
      osId: dados.osId,
      acrescimoPercentual: dados.acrescimoPercentual,
    },
    include: orcamentoInclude,
  });

  res.status(201).json(orcamento);
}

export async function listarOrcamentos(req: Request, res: Response) {
  const { semOs } = req.query;
  const orcamentos = await prisma.orcamentoCalha.findMany({
    where: { empresaId: req.usuario!.empresaId, ...(semOs === "true" ? { osId: null } : {}) },
    include: {
      cliente: { select: { id: true, nome: true } },
      os: { select: { id: true, numero: true } },
    },
    orderBy: { criadoEm: "desc" },
  });
  res.json(orcamentos);
}

export async function buscarOrcamento(req: Request, res: Response) {
  const { id } = req.params;
  const orcamento = await prisma.orcamentoCalha.findFirst({
    where: { id, empresaId: req.usuario!.empresaId },
    include: orcamentoInclude,
  });
  if (!orcamento) return res.status(404).json({ erro: "Orçamento não encontrado" });
  res.json(orcamento);
}

const atualizarOrcamentoSchema = z.object({
  clienteId: z.string().nullable().optional(),
  osId: z.string().nullable().optional(),
  status: z.enum(["rascunho", "enviado", "aprovado", "recusado"]).optional(),
  acrescimoPercentual: z.number().min(0).max(1000).optional(),
});

// Mesma regra do orçamento normal: aprovar coloca a OS em "aprovada", recusar em "cancelada".
const STATUS_OS_POR_RESPOSTA = { aprovado: "aprovada", recusado: "cancelada" } as const;

export async function atualizarOrcamento(req: Request, res: Response) {
  const { id } = req.params;
  const dados = atualizarOrcamentoSchema.parse(req.body);

  const orcamento = await prisma.orcamentoCalha.findFirst({
    where: { id, empresaId: req.usuario!.empresaId },
  });
  if (!orcamento) return res.status(404).json({ erro: "Orçamento não encontrado" });

  const data = { ...dados };
  if (dados.osId) {
    const os = await buscarOsDaEmpresa(req.usuario!.empresaId, dados.osId);
    if (!os) return res.status(404).json({ erro: "Ordem de serviço não encontrada" });
    data.clienteId = os.clienteId;
  }

  const osIdFinal = dados.osId !== undefined ? dados.osId : orcamento.osId;
  const respondeuAgora =
    (dados.status === "aprovado" || dados.status === "recusado") && dados.status !== orcamento.status;

  const atualizado = await prisma.$transaction(async (tx) => {
    const resultado = await tx.orcamentoCalha.update({ where: { id }, data, include: orcamentoInclude });

    const os = respondeuAgora && osIdFinal ? await tx.ordemServico.findUniqueOrThrow({ where: { id: osIdFinal } }) : null;
    const novoStatusOs = STATUS_OS_POR_RESPOSTA[dados.status as "aprovado" | "recusado"];
    if (os && osIdFinal && os.status !== novoStatusOs) {
      await tx.ordemServico.update({ where: { id: osIdFinal }, data: { status: novoStatusOs } });
      await tx.osStatusHistorico.create({
        data: {
          osId: osIdFinal,
          statusAnterior: os.status,
          statusNovo: novoStatusOs,
          usuarioId: req.usuario!.usuarioId,
          observacao: `Orçamento de calhas #${resultado.numero} ${dados.status}`,
        },
      });
    }

    return resultado;
  });

  res.json(atualizado);
}

export async function apagarOrcamento(req: Request, res: Response) {
  const { id } = req.params;
  const orcamento = await prisma.orcamentoCalha.findFirst({
    where: { id, empresaId: req.usuario!.empresaId },
  });
  if (!orcamento) return res.status(404).json({ erro: "Orçamento não encontrado" });
  if (orcamento.osId && orcamento.status === "aprovado") {
    return res.status(409).json({
      erro: "Este orçamento está aprovado em uma OS e não pode ser excluído. Desvincule-o da OS antes, se ela ainda não foi faturada.",
    });
  }

  await prisma.orcamentoCalha.delete({ where: { id } });
  res.status(204).send();
}

// Descarta um orçamento recém-criado que ficou vazio (usuário clicou em "+ Novo" e saiu
// sem adicionar nada). Só apaga se continuar rascunho, sem itens e sem mão de obra.
export async function descartarOrcamentoVazio(req: Request, res: Response) {
  const orcamento = await prisma.orcamentoCalha.findFirst({
    where: { id: req.params.id, empresaId: req.usuario!.empresaId },
    include: { _count: { select: { itens: true, maoDeObra: true } } },
  });
  if (!orcamento) return res.status(204).send();
  if (orcamento.status !== "rascunho" || orcamento._count.itens > 0 || orcamento._count.maoDeObra > 0) {
    return res.json({ descartado: false });
  }
  await prisma.orcamentoCalha.delete({ where: { id: orcamento.id } });
  res.json({ descartado: true });
}

// ============================================================
// Itens do orçamento
// ============================================================

const croquiSchema = z
  .string()
  .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, "Croqui inválido")
  .max(900_000, "Croqui muito grande")
  .nullable();

const itemSchema = z.object({
  tipoServico: z.enum(TIPOS_SERVICO),
  descricao: z.string().optional(),
  tipoMedida: z.enum(["metro", "unidade"]).default("metro"),
  quantidade: z.number().nonnegative(),
  unidadeQuantidade: z.enum(UNIDADES).default("m"),
  corteLargura: z.number().nonnegative().optional(),
  unidadeCorte: z.enum(UNIDADES).optional(),
  materialId: z.string().optional(),
  perfilId: z.string().optional(),
  segmentosCustom: z.array(segmentoSchema).optional(),
  croqui: z.lazy(() => croquiSchema).optional(),
  valorUnitario: z.number().nonnegative().optional(),
  acrescimoPercentual: z.number().min(0).max(1000).default(30),
});

async function buscarPrecoMaterial(empresaId: string, materialId: string | undefined) {
  if (!materialId) return null;
  const material = await prisma.materialChapa.findFirst({ where: { id: materialId, empresaId } });
  return material ? Number(material.precoM2) : null;
}

export async function adicionarItem(req: Request, res: Response) {
  const { id: orcamentoId } = req.params;
  const dados = itemSchema.parse(req.body);

  const orcamento = await prisma.orcamentoCalha.findFirst({
    where: { id: orcamentoId, empresaId: req.usuario!.empresaId },
  });
  if (!orcamento) return res.status(404).json({ erro: "Orçamento não encontrado" });

  if (ehServicoMetal(dados.tipoServico) && (!dados.corteLargura || !dados.unidadeCorte || !dados.materialId)) {
    return res.status(400).json({ erro: "Informe corte, unidade do corte e material para esse serviço" });
  }

  const precoM2Material = await buscarPrecoMaterial(req.usuario!.empresaId, dados.materialId);
  const custoCalculado = calcularCustoItem({
    tipoServico: dados.tipoServico,
    quantidade: dados.quantidade,
    unidadeQuantidade: dados.unidadeQuantidade,
    corteLargura: dados.corteLargura ?? null,
    unidadeCorte: dados.unidadeCorte ?? null,
    precoM2Material,
    valorUnitario: dados.valorUnitario ?? null,
  });
  const precoCalculado = calcularPrecoComMarkup(custoCalculado, dados.acrescimoPercentual);

  const item = await prisma.$transaction(async (tx) => {
    const novoItem = await tx.orcamentoCalhaItem.create({
      data: { ...dados, orcamentoId, custoCalculado, precoCalculado },
      include: { material: true, perfil: true },
    });
    await recalcularEAtualizarOrcamento(tx, orcamentoId);
    return novoItem;
  });

  res.status(201).json(item);
}

export async function atualizarItem(req: Request, res: Response) {
  const { id: orcamentoId, itemId } = req.params;
  const dados = itemSchema.parse(req.body);

  const [orcamento, itemExistente] = await Promise.all([
    prisma.orcamentoCalha.findFirst({ where: { id: orcamentoId, empresaId: req.usuario!.empresaId } }),
    prisma.orcamentoCalhaItem.findFirst({ where: { id: itemId, orcamentoId } }),
  ]);
  if (!orcamento || !itemExistente) return res.status(404).json({ erro: "Item não encontrado" });

  const precoM2Material = await buscarPrecoMaterial(req.usuario!.empresaId, dados.materialId);
  const custoCalculado = calcularCustoItem({
    tipoServico: dados.tipoServico,
    quantidade: dados.quantidade,
    unidadeQuantidade: dados.unidadeQuantidade,
    corteLargura: dados.corteLargura ?? null,
    unidadeCorte: dados.unidadeCorte ?? null,
    precoM2Material,
    valorUnitario: dados.valorUnitario ?? null,
  });
  const precoCalculado = calcularPrecoComMarkup(custoCalculado, dados.acrescimoPercentual);

  const item = await prisma.$transaction(async (tx) => {
    const atualizado = await tx.orcamentoCalhaItem.update({
      where: { id: itemId },
      data: { ...dados, custoCalculado, precoCalculado },
      include: { material: true, perfil: true },
    });
    await recalcularEAtualizarOrcamento(tx, orcamentoId);
    return atualizado;
  });

  res.json(item);
}

export async function removerItem(req: Request, res: Response) {
  const { id: orcamentoId, itemId } = req.params;

  const [orcamento, item] = await Promise.all([
    prisma.orcamentoCalha.findFirst({ where: { id: orcamentoId, empresaId: req.usuario!.empresaId } }),
    prisma.orcamentoCalhaItem.findFirst({ where: { id: itemId, orcamentoId } }),
  ]);
  if (!orcamento || !item) return res.status(404).json({ erro: "Item não encontrado" });

  await prisma.$transaction(async (tx) => {
    await tx.orcamentoCalhaItem.delete({ where: { id: itemId } });
    await recalcularEAtualizarOrcamento(tx, orcamentoId);
  });

  res.status(204).send();
}

// ============================================================
// Mão de obra
// ============================================================

const maoDeObraSchema = z.object({
  usuarioId: z.string(),
  valorHora: z.number().nonnegative(),
  horas: z.number().positive(),
});

export async function adicionarMaoDeObra(req: Request, res: Response) {
  const { id: orcamentoId } = req.params;
  const dados = maoDeObraSchema.parse(req.body);

  const [orcamento, usuario] = await Promise.all([
    prisma.orcamentoCalha.findFirst({ where: { id: orcamentoId, empresaId: req.usuario!.empresaId } }),
    prisma.usuario.findFirst({ where: { id: dados.usuarioId, empresaId: req.usuario!.empresaId } }),
  ]);
  if (!orcamento) return res.status(404).json({ erro: "Orçamento não encontrado" });
  if (!usuario) return res.status(404).json({ erro: "Funcionário não encontrado" });

  const custoTotal = calcularCustoMaoDeObra(dados.valorHora, dados.horas);

  const maoDeObra = await prisma.$transaction(async (tx) => {
    const novo = await tx.orcamentoCalhaMaoDeObra.create({
      data: { ...dados, orcamentoId, custoTotal },
      include: { usuario: { select: { id: true, nome: true } } },
    });
    await recalcularEAtualizarOrcamento(tx, orcamentoId);
    return novo;
  });

  res.status(201).json(maoDeObra);
}

export async function removerMaoDeObra(req: Request, res: Response) {
  const { id: orcamentoId, maoDeObraId } = req.params;

  const [orcamento, registro] = await Promise.all([
    prisma.orcamentoCalha.findFirst({ where: { id: orcamentoId, empresaId: req.usuario!.empresaId } }),
    prisma.orcamentoCalhaMaoDeObra.findFirst({ where: { id: maoDeObraId, orcamentoId } }),
  ]);
  if (!orcamento || !registro) return res.status(404).json({ erro: "Registro não encontrado" });

  await prisma.$transaction(async (tx) => {
    await tx.orcamentoCalhaMaoDeObra.delete({ where: { id: maoDeObraId } });
    await recalcularEAtualizarOrcamento(tx, orcamentoId);
  });

  res.status(204).send();
}

/** Salva (ou remove, com null) o croqui desenhado à mão de um item. */
export async function salvarCroquiItem(req: Request, res: Response) {
  const { id: orcamentoId, itemId } = req.params;
  const { croqui } = z.object({ croqui: croquiSchema }).parse(req.body);

  const item = await prisma.orcamentoCalhaItem.findFirst({
    where: { id: itemId, orcamentoId, orcamento: { empresaId: req.usuario!.empresaId } },
  });
  if (!item) return res.status(404).json({ erro: "Item não encontrado" });

  const atualizado = await prisma.orcamentoCalhaItem.update({
    where: { id: itemId },
    data: { croqui },
    include: { material: true, perfil: true },
  });
  res.json(atualizado);
}
