import cors from "cors";
import express from "express";
import path from "path";
import { errorHandler } from "./middlewares/errorHandler";
import { authRoutes } from "./routes/authRoutes";
import { clientesRoutes } from "./routes/clientesRoutes";
import { faturasRoutes } from "./routes/faturasRoutes";
import { orcamentosRoutes } from "./routes/orcamentosRoutes";
import { ordensServicoRoutes } from "./routes/ordensServicoRoutes";
import { pecasRoutes } from "./routes/pecasRoutes";
import { permissoesRoutes } from "./routes/permissoesRoutes";
import { usuariosRoutes } from "./routes/usuariosRoutes";

export const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/auth", authRoutes);
app.use("/clientes", clientesRoutes);
app.use("/ordens-servico", ordensServicoRoutes);
app.use("/usuarios", usuariosRoutes);
app.use("/pecas", pecasRoutes);
app.use("/orcamentos", orcamentosRoutes);
app.use("/faturas", faturasRoutes);
app.use("/permissoes", permissoesRoutes);

app.use(errorHandler);
