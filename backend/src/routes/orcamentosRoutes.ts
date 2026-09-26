import { Router } from "express";
import * as orcamentosController from "../controllers/orcamentosController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requirePermissao } from "../middlewares/requirePermissao";
import { requireAuth } from "../middlewares/requireAuth";

export const orcamentosRoutes = Router();

orcamentosRoutes.use(requireAuth);
orcamentosRoutes.get("/", requirePermissao("orcamentos", "ver"), asyncHandler(orcamentosController.listar));
orcamentosRoutes.get("/:id", requirePermissao("orcamentos", "ver"), asyncHandler(orcamentosController.buscarPorId));
orcamentosRoutes.patch(
  "/:id/status",
  requirePermissao("orcamentos", "editar"),
  asyncHandler(orcamentosController.mudarStatus),
);
