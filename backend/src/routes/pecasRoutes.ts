import { Router } from "express";
import * as pecasController from "../controllers/pecasController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requirePermissao } from "../middlewares/requirePermissao";
import { requireAuth } from "../middlewares/requireAuth";

export const pecasRoutes = Router();

pecasRoutes.use(requireAuth);
pecasRoutes.get("/", requirePermissao("estoque", "ver"), asyncHandler(pecasController.listar));
pecasRoutes.post("/", requirePermissao("estoque", "criar"), asyncHandler(pecasController.criar));
pecasRoutes.get("/:id", requirePermissao("estoque", "ver"), asyncHandler(pecasController.buscarPorId));
pecasRoutes.patch("/:id", requirePermissao("estoque", "editar"), asyncHandler(pecasController.atualizar));
pecasRoutes.post(
  "/:id/movimentacoes",
  requirePermissao("estoque", "editar"),
  asyncHandler(pecasController.criarMovimentacao),
);
