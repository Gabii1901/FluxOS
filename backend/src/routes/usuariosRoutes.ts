import { Router } from "express";
import * as usuariosController from "../controllers/usuariosController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requirePermissao } from "../middlewares/requirePermissao";
import { requireAuth } from "../middlewares/requireAuth";

export const usuariosRoutes = Router();

usuariosRoutes.use(requireAuth);
usuariosRoutes.get("/", requirePermissao("usuarios", "ver"), asyncHandler(usuariosController.listar));
usuariosRoutes.post("/", requirePermissao("usuarios", "criar"), asyncHandler(usuariosController.criar));
usuariosRoutes.patch("/:id", requirePermissao("usuarios", "editar"), asyncHandler(usuariosController.atualizar));
