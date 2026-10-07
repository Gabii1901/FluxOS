import { ModuloSistema } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { moduloLiberadoNoPlano } from "../lib/planos";
import { Acao, temPermissao } from "../lib/permissoes";
import { prisma } from "../lib/prisma";

export function requirePermissao(modulo: ModuloSistema, acao: Acao) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const usuario = req.usuario!;

    // O papel "desenvolvedor" é a conta interna da plataforma: sempre vê
    // tudo, independente do plano contratado pela empresa.
    if (usuario.papel !== "desenvolvedor") {
      const empresa = await prisma.empresa.findUniqueOrThrow({
        where: { id: usuario.empresaId },
        select: { plano: true, statusAssinatura: true },
      });

      if (empresa.statusAssinatura !== "ativo") {
        return res.status(403).json({ erro: "Assinatura inativa", assinaturaInativa: true });
      }

      if (!moduloLiberadoNoPlano(empresa.plano, modulo)) {
        return res.status(403).json({ erro: "Este módulo não está incluído no seu plano", foraDoPlano: true });
      }
    }

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

/** Telas internas da plataforma — nunca liberadas pra admin de empresa, só pra equipe FluxOS. */
export function requireDesenvolvedor(req: Request, res: Response, next: NextFunction) {
  if (req.usuario?.papel !== "desenvolvedor") {
    return res.status(403).json({ erro: "Acesso restrito à equipe FluxOS" });
  }
  next();
}
