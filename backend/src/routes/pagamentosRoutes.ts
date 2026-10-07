import { Router } from "express";
import * as pagamentosController from "../controllers/pagamentosController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireAuth } from "../middlewares/requireAuth";

export const pagamentosRoutes = Router();

// Chamada pelo Mercado Pago — tem que ficar sem autenticação.
pagamentosRoutes.post("/webhook", asyncHandler(pagamentosController.webhook));

pagamentosRoutes.post("/checkout", requireAuth, asyncHandler(pagamentosController.criarCheckout));
pagamentosRoutes.get("/status", requireAuth, asyncHandler(pagamentosController.status));
