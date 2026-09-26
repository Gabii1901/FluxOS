import { Request, Response } from "express";
import { z } from "zod";
import { EstoqueInsuficienteError } from "../lib/errors";
import { prisma } from "../lib/prisma";

const adicionarPecaSchema = z.object({
  pecaId: z.string().uuid(),
  quantidade: z.number().positive(),
});

export async function adicionar(req: Request, res: Response) {
  const { id: osId } = req.params;
  const dados = adicionarPecaSchema.parse(req.body);

  const os = await prisma.ordemServico.findFirst({
    where: { id: osId, empresaId: req.usuario!.empresaId },
  });
  if (!os) {
    return res.status(404).json({ erro: "Ordem de serviço não encontrada" });
  }

  const peca = await prisma.peca.findFirst({
    where: { id: dados.pecaId, empresaId: req.usuario!.empresaId },
  });
  if (!peca) {
    return res.status(404).json({ erro: "Peça não encontrada" });
  }

  const resultado = await prisma
    .$transaction(async (tx) => {
      const atualizadas = await tx.peca.updateMany({
        where: { id: dados.pecaId, quantidadeEstoque: { gte: dados.quantidade } },
        data: { quantidadeEstoque: { decrement: dados.quantidade } },
      });
      if (atualizadas.count === 0) {
        throw new EstoqueInsuficienteError();
      }

      await tx.movimentacaoEstoque.create({
        data: {
          pecaId: dados.pecaId,
          usuarioId: req.usuario!.usuarioId,
          tipo: "saida",
          quantidade: dados.quantidade,
          motivo: `Uso na OS #${os.numero}`,
        },
      });

      return tx.osPecaUtilizada.create({
        data: {
          osId,
          pecaId: dados.pecaId,
          quantidade: dados.quantidade,
          valorUnitario: peca.valorUnitario,
        },
        include: { peca: true },
      });
    })
    .catch((erro) => {
      if (erro instanceof EstoqueInsuficienteError) return null;
      throw erro;
    });

  if (!resultado) {
    return res.status(400).json({ erro: "Estoque insuficiente para usar esta peça na OS" });
  }

  res.status(201).json(resultado);
}

export async function remover(req: Request, res: Response) {
  const { id: osId, itemId } = req.params;

  const os = await prisma.ordemServico.findFirst({
    where: { id: osId, empresaId: req.usuario!.empresaId },
  });
  if (!os) {
    return res.status(404).json({ erro: "Ordem de serviço não encontrada" });
  }

  const item = await prisma.osPecaUtilizada.findFirst({
    where: { id: itemId, osId },
  });
  if (!item) {
    return res.status(404).json({ erro: "Item não encontrado nesta OS" });
  }

  await prisma.$transaction([
    prisma.peca.update({
      where: { id: item.pecaId },
      data: { quantidadeEstoque: { increment: item.quantidade } },
    }),
    prisma.movimentacaoEstoque.create({
      data: {
        pecaId: item.pecaId,
        usuarioId: req.usuario!.usuarioId,
        tipo: "entrada",
        quantidade: item.quantidade,
        motivo: `Estorno - removida da OS #${os.numero}`,
      },
    }),
    prisma.osPecaUtilizada.delete({ where: { id: itemId } }),
  ]);

  res.status(204).send();
}
