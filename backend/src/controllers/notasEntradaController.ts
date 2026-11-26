import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

class LancamentoNotaError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function listar(req: Request, res: Response) {
  const notas = await prisma.notaEntrada.findMany({
    where: { empresaId: req.usuario!.empresaId },
    orderBy: { criadoEm: "desc" },
    include: { _count: { select: { itens: true } } },
  });
  res.json(notas);
}

export async function buscarPorId(req: Request, res: Response) {
  const nota = await prisma.notaEntrada.findFirst({
    where: { id: req.params.id, empresaId: req.usuario!.empresaId },
    include: {
      itens: { include: { peca: { select: { id: true, sku: true, nome: true, unidade: true } } } },
      contasPagar: {
        orderBy: { vencimento: "asc" },
        select: { id: true, descricao: true, valor: true, vencimento: true, pagoEm: true },
      },
    },
  });
  if (!nota) return res.status(404).json({ erro: "Nota não encontrada" });
  res.json(nota);
}

const conferirSchema = z.object({
  chaveAcesso: z.string().min(1),
  fornecedorCnpj: z.string().min(1),
  codigos: z.array(z.string()),
});

/** Antes de lançar: avisa se a nota já entrou e devolve os vínculos já conhecidos do fornecedor. */
export async function conferir(req: Request, res: Response) {
  const dados = conferirSchema.parse(req.body);
  const empresaId = req.usuario!.empresaId;

  const jaLancada = await prisma.notaEntrada.findUnique({
    where: { empresaId_chaveAcesso: { empresaId, chaveAcesso: dados.chaveAcesso } },
    select: { id: true, criadoEm: true },
  });

  const vinculos = await prisma.produtoFornecedor.findMany({
    where: { empresaId, fornecedorCnpj: dados.fornecedorCnpj, codigoFornecedor: { in: dados.codigos } },
    include: { peca: true },
  });

  res.json({
    jaLancada,
    vinculos: vinculos.map((v) => ({
      codigoFornecedor: v.codigoFornecedor,
      fatorConversao: v.fatorConversao,
      peca: v.peca,
    })),
  });
}

const itemSchema = z.object({
  codigoFornecedor: z.string().min(1),
  descricaoXml: z.string().min(1),
  ncm: z.string().optional().nullable(),
  unidadeXml: z.string().min(1),
  quantidadeXml: z.number().positive(),
  valorUnitarioXml: z.number().nonnegative(),
  valorTotal: z.number().nonnegative(),
  valorFrete: z.number().nonnegative().default(0),
  valorIpi: z.number().nonnegative().default(0),
  // Vincular a uma peça existente (pecaId) ou cadastrar uma nova (sku).
  pecaId: z.string().uuid().optional().nullable(),
  sku: z.string().min(1).optional().nullable(),
  nome: z.string().min(1),
  unidade: z.string().min(1),
  fatorConversao: z.number().positive(),
  precoVenda: z.number().nonnegative(),
});

const lancarSchema = z.object({
  chaveAcesso: z.string().min(1),
  numero: z.string().min(1),
  serie: z.string().optional().nullable(),
  fornecedorCnpj: z.string().min(1),
  fornecedorNome: z.string().min(1),
  dataEmissao: z.coerce.date(),
  valorProdutos: z.number().nonnegative(),
  valorTotal: z.number().nonnegative(),
  itens: z.array(itemSchema).min(1),
  // Duplicatas (cobr/dup) conferidas na tela; cada uma vira uma conta a pagar.
  parcelas: z
    .array(
      z.object({
        numero: z.string().optional().nullable(),
        vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Vencimento inválido"),
        valor: z.number().positive(),
      }),
    )
    .default([]),
});

export async function lancar(req: Request, res: Response) {
  const dados = lancarSchema.parse(req.body);
  const { empresaId, usuarioId } = req.usuario!;

  for (const item of dados.itens) {
    if (!item.pecaId && !item.sku) {
      return res
        .status(400)
        .json({ erro: `Item ${item.codigoFornecedor}: informe um SKU ou vincule a uma peça.` });
    }
  }

  try {
    const nota = await prisma.$transaction(async (tx) => {
      const jaLancada = await tx.notaEntrada.findUnique({
        where: { empresaId_chaveAcesso: { empresaId, chaveAcesso: dados.chaveAcesso } },
      });
      if (jaLancada) throw new LancamentoNotaError(409, "Esta nota já foi lançada.");

      const novaNota = await tx.notaEntrada.create({
        data: {
          empresaId,
          usuarioId,
          chaveAcesso: dados.chaveAcesso,
          numero: dados.numero,
          serie: dados.serie ?? null,
          fornecedorCnpj: dados.fornecedorCnpj,
          fornecedorNome: dados.fornecedorNome,
          dataEmissao: dados.dataEmissao,
          valorProdutos: dados.valorProdutos,
          valorTotal: dados.valorTotal,
        },
      });

      for (const item of dados.itens) {
        // Ex.: 2 CX com fator 12 = 24 UN no estoque.
        const quantidadeEntrada = item.quantidadeXml * item.fatorConversao;
        // Custo de aquisição = produtos + frete + IPI do item.
        const custoUnitario = (item.valorTotal + item.valorFrete + item.valorIpi) / quantidadeEntrada;

        let pecaId: string;
        if (item.pecaId) {
          const peca = await tx.peca.findFirst({ where: { id: item.pecaId, empresaId } });
          if (!peca) {
            throw new LancamentoNotaError(400, `Peça do item ${item.codigoFornecedor} não encontrada.`);
          }
          await tx.peca.update({
            where: { id: peca.id },
            data: {
              nome: item.nome,
              unidade: item.unidade,
              valorUnitario: item.precoVenda,
              precoCusto: custoUnitario,
              ativo: true,
              quantidadeEstoque: { increment: quantidadeEntrada },
            },
          });
          pecaId = peca.id;
        } else {
          const skuEmUso = await tx.peca.findFirst({ where: { empresaId, sku: item.sku! } });
          if (skuEmUso) {
            throw new LancamentoNotaError(
              409,
              `Já existe uma peça com o SKU "${item.sku}". Vincule o item a ela ou use outro SKU.`,
            );
          }
          const nova = await tx.peca.create({
            data: {
              empresaId,
              sku: item.sku!,
              nome: item.nome,
              unidade: item.unidade,
              valorUnitario: item.precoVenda,
              precoCusto: custoUnitario,
              quantidadeEstoque: quantidadeEntrada,
            },
          });
          pecaId = nova.id;
        }

        await tx.notaEntradaItem.create({
          data: {
            notaId: novaNota.id,
            pecaId,
            codigoFornecedor: item.codigoFornecedor,
            descricaoXml: item.descricaoXml,
            ncm: item.ncm ?? null,
            unidadeXml: item.unidadeXml,
            quantidadeXml: item.quantidadeXml,
            valorUnitarioXml: item.valorUnitarioXml,
            valorTotal: item.valorTotal,
            valorFrete: item.valorFrete,
            valorIpi: item.valorIpi,
            fatorConversao: item.fatorConversao,
            quantidadeEntrada,
            custoUnitario,
            precoVenda: item.precoVenda,
            pecaCriada: !item.pecaId,
          },
        });

        await tx.movimentacaoEstoque.create({
          data: {
            pecaId,
            usuarioId,
            tipo: "entrada",
            quantidade: quantidadeEntrada,
            motivo: `NF-e ${dados.numero} - ${dados.fornecedorNome}`,
          },
        });

        await tx.produtoFornecedor.upsert({
          where: {
            empresaId_fornecedorCnpj_codigoFornecedor: {
              empresaId,
              fornecedorCnpj: dados.fornecedorCnpj,
              codigoFornecedor: item.codigoFornecedor,
            },
          },
          create: {
            empresaId,
            fornecedorCnpj: dados.fornecedorCnpj,
            codigoFornecedor: item.codigoFornecedor,
            pecaId,
            fatorConversao: item.fatorConversao,
          },
          update: { pecaId, fatorConversao: item.fatorConversao },
        });
      }

      if (dados.parcelas.length > 0) {
        const categoria = await tx.categoriaContaPagar.findFirst({
          where: { empresaId, ativo: true, nome: "Fornecedor / Material" },
        });
        const total = dados.parcelas.length;
        await tx.contaPagar.createMany({
          data: dados.parcelas.map((parcela, i) => ({
            empresaId,
            categoriaId: categoria?.id ?? null,
            notaEntradaId: novaNota.id,
            descricao: `NF-e ${dados.numero}${total > 1 ? ` - parcela ${parcela.numero || i + 1}` : ""}`,
            fornecedorNome: dados.fornecedorNome,
            fornecedorDocumento: dados.fornecedorCnpj,
            valor: parcela.valor,
            vencimento: new Date(`${parcela.vencimento}T00:00:00.000Z`),
            parcela: total > 1 ? i + 1 : null,
            totalParcelas: total > 1 ? total : null,
          })),
        });
      }

      return novaNota;
    });

    res.status(201).json(nota);
  } catch (erro) {
    if (erro instanceof LancamentoNotaError) {
      return res.status(erro.status).json({ erro: erro.message });
    }
    throw erro;
  }
}

/**
 * Exclui a nota desfazendo o lançamento: tira do estoque o que entrou, apaga as
 * contas a pagar geradas e remove as peças que a própria nota cadastrou (se não
 * foram usadas em mais nada). Bloqueia se alguma parcela já foi paga ou se o
 * estoque atual não cobre o estorno (a mercadoria já saiu).
 */
export async function excluir(req: Request, res: Response) {
  const { empresaId, usuarioId } = req.usuario!;

  try {
    await prisma.$transaction(async (tx) => {
      const nota = await tx.notaEntrada.findFirst({
        where: { id: req.params.id, empresaId },
        include: { itens: { include: { peca: true } }, contasPagar: true },
      });
      if (!nota) throw new LancamentoNotaError(404, "Nota não encontrada");

      const pagas = nota.contasPagar.filter((c) => c.pagoEm);
      if (pagas.length > 0) {
        throw new LancamentoNotaError(
          409,
          `Não é possível excluir: ${pagas.length} parcela(s) desta nota já foram pagas. Estorne o pagamento em Contas a pagar primeiro.`,
        );
      }

      // Soma por peça (a mesma peça pode aparecer em mais de um item).
      const porPeca = new Map<string, { quantidade: number; nome: string; criada: boolean }>();
      for (const item of nota.itens) {
        const atual = porPeca.get(item.pecaId) ?? { quantidade: 0, nome: item.peca.nome, criada: false };
        atual.quantidade += Number(item.quantidadeEntrada);
        atual.criada ||= item.pecaCriada;
        porPeca.set(item.pecaId, atual);
      }

      const motivoEntrada = `NF-e ${nota.numero} - ${nota.fornecedorNome}`;

      for (const [pecaId, info] of porPeca) {
        if (info.criada) {
          const [movs, usosOs, usosOrc, outrasNotas] = await Promise.all([
            tx.movimentacaoEstoque.count({ where: { pecaId } }),
            tx.osPecaUtilizada.count({ where: { pecaId } }),
            tx.orcamentoItem.count({ where: { pecaId } }),
            tx.notaEntradaItem.count({ where: { pecaId, notaId: { not: nota.id } } }),
          ]);
          const soEntradaDestaNota =
            movs === 1 && usosOs === 0 && usosOrc === 0 && outrasNotas === 0;
          if (soEntradaDestaNota) {
            await tx.notaEntradaItem.deleteMany({ where: { notaId: nota.id, pecaId } });
            await tx.peca.delete({ where: { id: pecaId } });
            continue;
          }
        }

        const baixadas = await tx.peca.updateMany({
          where: { id: pecaId, quantidadeEstoque: { gte: info.quantidade } },
          data: { quantidadeEstoque: { decrement: info.quantidade } },
        });
        if (baixadas.count === 0) {
          throw new LancamentoNotaError(
            409,
            `Não é possível excluir: o estoque atual de "${info.nome}" é menor que a quantidade que entrou por esta nota.`,
          );
        }
        await tx.movimentacaoEstoque.create({
          data: {
            pecaId,
            usuarioId,
            tipo: "saida",
            quantidade: info.quantidade,
            motivo: `Estorno da ${motivoEntrada}`,
          },
        });
      }

      await tx.contaPagar.deleteMany({ where: { notaEntradaId: nota.id } });
      await tx.notaEntrada.delete({ where: { id: nota.id } });
    });

    res.status(204).send();
  } catch (erro) {
    if (erro instanceof LancamentoNotaError) {
      return res.status(erro.status).json({ erro: erro.message });
    }
    throw erro;
  }
}
