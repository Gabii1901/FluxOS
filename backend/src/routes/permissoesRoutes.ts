import { Router } from "express";
import * as permissoesController from "../controllers/permissoesController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireAdminOuDesenvolvedor } from "../middlewares/requirePermissao";
import { requireAuth } from "../middlewares/requireAuth";

export const permissoesRoutes = Router();

permissoesRoutes.use(requireAuth);
permissoesRoutes.use(requireAdminOuDesenvolvedor);
permissoesRoutes.get("/usuarios", asyncHandler(permissoesController.listarUsuarios));
permissoesRoutes.get("/usuarios/:id", asyncHandler(permissoesController.buscarPermissoes));
permissoesRoutes.put("/usuarios/:id", asyncHandler(permissoesController.atualizarPermissoes));
