import { NextFunction, Request, Response } from "express";
import { verificarToken } from "../lib/auth";

declare global {
  namespace Express {
    interface Request {
      usuario?: { usuarioId: string; empresaId: string; papel: string };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ erro: "Token não informado" });
  }

  try {
    req.usuario = verificarToken(token);
    next();
  } catch {
    res.status(401).json({ erro: "Token inválido ou expirado" });
  }
}
