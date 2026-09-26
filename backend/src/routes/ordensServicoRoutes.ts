import { Router } from "express";
import * as entregasController from "../controllers/entregasController";
import * as faturasController from "../controllers/faturasController";
import * as fotosOsController from "../controllers/fotosOsController";
import * as orcamentosController from "../controllers/orcamentosController";
import * as ordensServicoController from "../controllers/ordensServicoController";
import * as osPecasController from "../controllers/osPecasController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requirePermissao } from "../middlewares/requirePermissao";
import { requireAuth } from "../middlewares/requireAuth";
import { uploadFotoOs } from "../middlewares/upload";

export const ordensServicoRoutes = Router();

ordensServicoRoutes.use(requireAuth);
ordensServicoRoutes.get("/", requirePermissao("ordens_servico", "ver"), asyncHandler(ordensServicoController.listar));
ordensServicoRoutes.get(
  "/:id",
  requirePermissao("ordens_servico", "ver"),
  asyncHandler(ordensServicoController.buscarPorId),
);
ordensServicoRoutes.post(
  "/",
  requirePermissao("ordens_servico", "criar"),
  asyncHandler(ordensServicoController.criar),
);
ordensServicoRoutes.patch(
  "/:id/status",
  requirePermissao("ordens_servico", "editar"),
  asyncHandler(ordensServicoController.mudarStatus),
);
ordensServicoRoutes.post(
  "/:id/pecas",
  requirePermissao("ordens_servico", "editar"),
  asyncHandler(osPecasController.adicionar),
);
ordensServicoRoutes.delete(
  "/:id/pecas/:itemId",
  requirePermissao("ordens_servico", "editar"),
  asyncHandler(osPecasController.remover),
);
ordensServicoRoutes.post(
  "/:id/orcamentos",
  requirePermissao("orcamentos", "criar"),
  asyncHandler(orcamentosController.criar),
);
ordensServicoRoutes.post(
  "/:id/faturas",
  requirePermissao("financeiro", "criar"),
  asyncHandler(faturasController.criar),
);
ordensServicoRoutes.post(
  "/:id/entrega",
  requirePermissao("ordens_servico", "editar"),
  asyncHandler(entregasController.criar),
);
ordensServicoRoutes.post(
  "/:id/fotos",
  requirePermissao("ordens_servico", "editar"),
  uploadFotoOs.single("foto"),
  asyncHandler(fotosOsController.adicionar),
);
ordensServicoRoutes.delete(
  "/:id/fotos/:fotoId",
  requirePermissao("ordens_servico", "editar"),
  asyncHandler(fotosOsController.remover),
);
