import { Router } from "express";
import * as c from "../controllers/notasEntradaController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireAuth } from "../middlewares/requireAuth";
import { requirePermissao } from "../middlewares/requirePermissao";

export const notasEntradaRoutes = Router();

notasEntradaRoutes.use(requireAuth);
notasEntradaRoutes.get("/", requirePermissao("estoque", "ver"), asyncHandler(c.listar));
notasEntradaRoutes.post("/conferir", requirePermissao("estoque", "criar"), asyncHandler(c.conferir));
notasEntradaRoutes.post("/", requirePermissao("estoque", "criar"), asyncHandler(c.lancar));
notasEntradaRoutes.get("/:id", requirePermissao("estoque", "ver"), asyncHandler(c.buscarPorId));
notasEntradaRoutes.delete("/:id", requirePermissao("estoque", "apagar"), asyncHandler(c.excluir));
