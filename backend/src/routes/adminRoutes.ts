import { Router } from "express";
import * as adminController from "../controllers/adminController";
import * as empresaController from "../controllers/empresaController";
import * as vinculosController from "../controllers/vinculosController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireDesenvolvedor } from "../middlewares/requirePermissao";
import { requireAuth } from "../middlewares/requireAuth";
import { uploadLogo } from "../middlewares/upload";

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireDesenvolvedor);

adminRoutes.get("/empresas", asyncHandler(adminController.listarEmpresas));
adminRoutes.post("/empresas", asyncHandler(adminController.criarEmpresa));
adminRoutes.post("/empresas/:empresaId/cobranca", asyncHandler(adminController.criarCobrancaPersonalizada));
adminRoutes.patch("/empresas/:empresaId/status", asyncHandler(adminController.atualizarStatusEmpresa));
adminRoutes.get("/empresas/:empresaId/dados", asyncHandler(empresaController.buscar));
adminRoutes.patch("/empresas/:empresaId/dados", asyncHandler(empresaController.atualizar));
adminRoutes.post("/empresas/:empresaId/dados/logo", uploadLogo.single("logo"), asyncHandler(empresaController.enviarLogo));
adminRoutes.delete("/empresas/:empresaId/dados/logo", asyncHandler(empresaController.removerLogo));

adminRoutes.get("/empresas/:empresaId/usuarios", asyncHandler(vinculosController.listar));
adminRoutes.post("/empresas/:empresaId/usuarios", asyncHandler(vinculosController.vincular));
adminRoutes.delete("/empresas/:empresaId/usuarios/:usuarioId", asyncHandler(vinculosController.desvincular));
adminRoutes.post("/empresas/:empresaId/acessar", asyncHandler(vinculosController.acessar));
