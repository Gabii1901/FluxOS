import { Router } from "express";
import { consultarCnpj } from "../controllers/consultasController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireAuth } from "../middlewares/requireAuth";

// Consultas a dados públicos (Receita Federal) usadas em vários cadastros.
export const consultasRoutes = Router();

consultasRoutes.use(requireAuth);
consultasRoutes.get("/cnpj/:cnpj", asyncHandler(consultarCnpj));
