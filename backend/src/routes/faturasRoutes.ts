import { Router } from "express";
import * as faturasController from "../controllers/faturasController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requirePermissao } from "../middlewares/requirePermissao";
import { requireAuth } from "../middlewares/requireAuth";

export const faturasRoutes = Router();

faturasRoutes.use(requireAuth);
faturasRoutes.get("/resumo", requirePermissao("financeiro", "ver"), asyncHandler(faturasController.resumo));
faturasRoutes.get(
  "/pagamentos/pendentes",
  requirePermissao("financeiro", "ver"),
  asyncHandler(faturasController.listarPendentes),
);
faturasRoutes.post(
  "/:id/pagamentos",
  requirePermissao("financeiro", "criar"),
  asyncHandler(faturasController.criarPagamento),
);
faturasRoutes.patch(
  "/pagamentos/:id/vencimento",
  requirePermissao("financeiro", "editar"),
  asyncHandler(faturasController.atualizarVencimento),
);
faturasRoutes.patch(
  "/pagamentos/:id/baixa",
  requirePermissao("financeiro", "editar"),
  asyncHandler(faturasController.darBaixa),
);
faturasRoutes.delete(
  "/pagamentos/:id",
  requirePermissao("financeiro", "apagar"),
  asyncHandler(faturasController.remover),
);
