import { Router } from "express";
import * as empresaController from "../controllers/empresaController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdminOuDesenvolvedor } from "../middlewares/requirePermissao";
import { uploadLogo } from "../middlewares/upload";

// Dados da empresa do usuário logado. Qualquer usuário pode ler (as impressões
// usam nome e logo); só administrador ou desenvolvedor pode alterar.
export const empresaRoutes = Router();

empresaRoutes.use(requireAuth);
empresaRoutes.get("/", asyncHandler(empresaController.buscar));
empresaRoutes.patch("/", requireAdminOuDesenvolvedor, asyncHandler(empresaController.atualizar));
empresaRoutes.post("/logo", requireAdminOuDesenvolvedor, uploadLogo.single("logo"), asyncHandler(empresaController.enviarLogo));
empresaRoutes.delete("/logo", requireAdminOuDesenvolvedor, asyncHandler(empresaController.removerLogo));
