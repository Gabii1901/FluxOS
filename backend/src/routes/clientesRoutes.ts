import { Router } from "express";
import * as clientesController from "../controllers/clientesController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requirePermissao } from "../middlewares/requirePermissao";
import { requireAuth } from "../middlewares/requireAuth";

export const clientesRoutes = Router();

clientesRoutes.use(requireAuth);
clientesRoutes.get("/", requirePermissao("clientes", "ver"), asyncHandler(clientesController.listar));
clientesRoutes.post("/", requirePermissao("clientes", "criar"), asyncHandler(clientesController.criar));
clientesRoutes.patch("/:id", requirePermissao("clientes", "editar"), asyncHandler(clientesController.atualizar));
