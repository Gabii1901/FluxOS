import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const criarEntregaSchema = z.object({
  confirmadoPorCliente: z.boolean().default(false),
  garantiaDias: z.number().int().nonnegative().default(90),
  termosGarantia: z.string().optional(),
});

export async function criar(req: Request, res: Response) {
  const { id: osId } = req.params;
  const dados = criarEntregaSchema.parse(req.body);

  const os = await prisma.ordemServico.findFirst({
    where: { id: osId, empresaId: req.usuario!.empresaId },
    include: { entregas: true },
  });
  if (!os) {
    return res.status(404).json({ erro: "Ordem de serviço não encontrada" });
  }
  if (os.entregas.length > 0) {
    return res.status(409).json({ erro: "Esta OS já foi entregue" });
  }

  const prazoFim = new Date();
  prazoFim.setDate(prazoFim.getDate() + dados.garantiaDias);

  const entrega = await prisma.$transaction(async (tx) => {
    const novaEntrega = await tx.entrega.create({
      data: {
        osId,
        entreguePor: req.usuario!.usuarioId,
        confirmadoPorCliente: dados.confirmadoPorCliente,
      },
    });

    if (dados.garantiaDias > 0) {
      await tx.garantia.create({
        data: { osId, prazoFim, termos: dados.termosGarantia },
      });
    }

    await tx.ordemServico.update({ where: { id: osId }, data: { status: "entregue" } });

    await tx.osStatusHistorico.create({
      data: {
        osId,
        statusAnterior: os.status,
        statusNovo: "entregue",
        usuarioId: req.usuario!.usuarioId,
      },
    });

    return novaEntrega;
  });

  res.status(201).json(entrega);
}
