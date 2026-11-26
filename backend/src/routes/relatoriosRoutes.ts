import { Router } from "express";
import * as c from "../controllers/relatoriosController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireAuth } from "../middlewares/requireAuth";
import { requirePermissao } from "../middlewares/requirePermissao";

export const relatoriosRoutes = Router();

relatoriosRoutes.use(requireAuth);
relatoriosRoutes.get("/financeiro", requirePermissao("financeiro", "ver"), asyncHandler(c.financeiro));
