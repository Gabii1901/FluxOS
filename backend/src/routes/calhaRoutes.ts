import { Router } from "express";
import * as calhaController from "../controllers/calhaController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requirePermissao } from "../middlewares/requirePermissao";
import { requireAuth } from "../middlewares/requireAuth";

export const calhaRoutes = Router();

calhaRoutes.use(requireAuth);

const ver = requirePermissao("orcamento_calhas", "ver");
const criar = requirePermissao("orcamento_calhas", "criar");
const editar = requirePermissao("orcamento_calhas", "editar");
const apagar = requirePermissao("orcamento_calhas", "apagar");

calhaRoutes.get("/materiais", ver, asyncHandler(calhaController.listarMateriais));
calhaRoutes.post("/materiais", criar, asyncHandler(calhaController.criarMaterial));
calhaRoutes.patch("/materiais/:id", editar, asyncHandler(calhaController.atualizarMaterial));
calhaRoutes.delete("/materiais/:id", apagar, asyncHandler(calhaController.apagarMaterial));

calhaRoutes.get("/perfis", ver, asyncHandler(calhaController.listarPerfis));
calhaRoutes.post("/perfis", criar, asyncHandler(calhaController.criarPerfil));
calhaRoutes.patch("/perfis/:id", editar, asyncHandler(calhaController.atualizarPerfil));
calhaRoutes.delete("/perfis/:id", apagar, asyncHandler(calhaController.apagarPerfil));

calhaRoutes.get("/orcamentos", ver, asyncHandler(calhaController.listarOrcamentos));
calhaRoutes.post("/orcamentos", criar, asyncHandler(calhaController.criarOrcamento));
calhaRoutes.get("/orcamentos/:id", ver, asyncHandler(calhaController.buscarOrcamento));
calhaRoutes.patch("/orcamentos/:id", editar, asyncHandler(calhaController.atualizarOrcamento));
calhaRoutes.delete("/orcamentos/:id", apagar, asyncHandler(calhaController.apagarOrcamento));

calhaRoutes.post("/orcamentos/:id/itens", editar, asyncHandler(calhaController.adicionarItem));
calhaRoutes.patch("/orcamentos/:id/itens/:itemId", editar, asyncHandler(calhaController.atualizarItem));
calhaRoutes.delete("/orcamentos/:id/itens/:itemId", editar, asyncHandler(calhaController.removerItem));

calhaRoutes.post("/orcamentos/:id/mao-de-obra", editar, asyncHandler(calhaController.adicionarMaoDeObra));
calhaRoutes.delete("/orcamentos/:id/mao-de-obra/:maoDeObraId", editar, asyncHandler(calhaController.removerMaoDeObra));
