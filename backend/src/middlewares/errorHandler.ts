import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({ erro: "Dados inválidos", detalhes: err.issues });
  }

  if (err instanceof multer.MulterError || (err instanceof Error && err.message.includes("Formato de imagem"))) {
    return res.status(400).json({ erro: err.message });
  }

  console.error(err);
  res.status(500).json({ erro: "Erro interno do servidor" });
}
