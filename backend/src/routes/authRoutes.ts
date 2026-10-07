import { Router } from "express";
import * as authController from "../controllers/authController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireAuth } from "../middlewares/requireAuth";

export const authRoutes = Router();

authRoutes.post("/cadastro", asyncHandler(authController.cadastrar));
authRoutes.post("/confirmar-email", asyncHandler(authController.confirmarEmail));
authRoutes.post("/reenviar-confirmacao", asyncHandler(authController.reenviarConfirmacao));
authRoutes.post("/login", asyncHandler(authController.login));
authRoutes.post("/selecionar-empresa", asyncHandler(authController.selecionarEmpresa));
authRoutes.get("/me", requireAuth, asyncHandler(authController.me));
