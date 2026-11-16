import { Router } from "express";
import * as c from "../controllers/contasPagarController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireAuth } from "../middlewares/requireAuth";
import { requirePermissao } from "../middlewares/requirePermissao";

export const contasPagarRoutes = Router();

contasPagarRoutes.use(requireAuth);

contasPagarRoutes.get("/resumo", requirePermissao("financeiro", "ver"), asyncHandler(c.resumo));

contasPagarRoutes.get("/categorias", requirePermissao("financeiro", "ver"), asyncHandler(c.listarCategorias));
contasPagarRoutes.post("/categorias", requirePermissao("financeiro", "criar"), asyncHandler(c.criarCategoria));
contasPagarRoutes.delete("/categorias/:id", requirePermissao("financeiro", "apagar"), asyncHandler(c.removerCategoria));

contasPagarRoutes.get("/", requirePermissao("financeiro", "ver"), asyncHandler(c.listar));
contasPagarRoutes.post("/", requirePermissao("financeiro", "criar"), asyncHandler(c.criar));
contasPagarRoutes.patch("/:id", requirePermissao("financeiro", "editar"), asyncHandler(c.atualizar));
contasPagarRoutes.patch("/:id/pagar", requirePermissao("financeiro", "editar"), asyncHandler(c.pagar));
contasPagarRoutes.patch("/:id/reabrir", requirePermissao("financeiro", "editar"), asyncHandler(c.reabrir));
contasPagarRoutes.delete("/:id", requirePermissao("financeiro", "apagar"), asyncHandler(c.remover));
