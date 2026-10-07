import { Router } from "express";
import * as adminController from "../controllers/adminController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireDesenvolvedor } from "../middlewares/requirePermissao";
import { requireAuth } from "../middlewares/requireAuth";

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireDesenvolvedor);

adminRoutes.get("/empresas", asyncHandler(adminController.listarEmpresas));
adminRoutes.post("/empresas", asyncHandler(adminController.criarEmpresa));
adminRoutes.post("/empresas/:empresaId/cobranca", asyncHandler(adminController.criarCobrancaPersonalizada));
