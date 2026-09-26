import { ModuloSistema } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { Acao, temPermissao } from "../lib/permissoes";

export function requirePermissao(modulo: ModuloSistema, acao: Acao) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const usuario = req.usuario!;

    const permitido = await temPermissao(usuario.usuarioId, usuario.papel, modulo, acao);
    if (!permitido) {
      return res.status(403).json({ erro: "Você não tem permissão para esta ação" });
    }

    next();
  };
}

export function requireAdminOuDesenvolvedor(req: Request, res: Response, next: NextFunction) {
  if (req.usuario?.papel !== "admin" && req.usuario?.papel !== "desenvolvedor") {
    return res.status(403).json({ erro: "Apenas administradores podem realizar esta ação" });
  }
  next();
}
