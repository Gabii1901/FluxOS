import fs from "fs";
import path from "path";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export async function adicionar(req: Request, res: Response) {
  const { id: osId } = req.params;

  const os = await prisma.ordemServico.findFirst({
    where: { id: osId, empresaId: req.usuario!.empresaId },
  });
  if (!os) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(404).json({ erro: "Ordem de serviço não encontrada" });
  }

  if (!req.file) {
    return res.status(400).json({ erro: "Nenhuma imagem enviada" });
  }

  const foto = await prisma.fotoOs.create({
    data: {
      osId,
      url: `/uploads/os/${req.file.filename}`,
      legenda: typeof req.body.legenda === "string" && req.body.legenda.trim() ? req.body.legenda.trim() : null,
    },
  });

  res.status(201).json(foto);
}

export async function remover(req: Request, res: Response) {
  const { id: osId, fotoId } = req.params;

  const foto = await prisma.fotoOs.findFirst({
    where: { id: fotoId, osId, ordemServico: { empresaId: req.usuario!.empresaId } },
  });
  if (!foto) {
    return res.status(404).json({ erro: "Foto não encontrada" });
  }

  await prisma.fotoOs.delete({ where: { id: fotoId } });

  const caminhoArquivo = path.join(__dirname, "..", "..", "uploads", "os", path.basename(foto.url));
  fs.unlink(caminhoArquivo, () => {});

  res.status(204).send();
}
