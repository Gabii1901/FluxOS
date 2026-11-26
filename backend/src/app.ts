import cors from "cors";
import express from "express";
import path from "path";
import { errorHandler } from "./middlewares/errorHandler";
import { adminRoutes } from "./routes/adminRoutes";
import { authRoutes } from "./routes/authRoutes";
import { calhaRoutes } from "./routes/calhaRoutes";
import { clientesRoutes } from "./routes/clientesRoutes";
import { consultasRoutes } from "./routes/consultasRoutes";
import { contasPagarRoutes } from "./routes/contasPagarRoutes";
import { empresaRoutes } from "./routes/empresaRoutes";
import { faturasRoutes } from "./routes/faturasRoutes";
import { notasEntradaRoutes } from "./routes/notasEntradaRoutes";
import { orcamentosRoutes } from "./routes/orcamentosRoutes";
import { ordensServicoRoutes } from "./routes/ordensServicoRoutes";
import { pagamentosRoutes } from "./routes/pagamentosRoutes";
import { pecasRoutes } from "./routes/pecasRoutes";
import { permissoesRoutes } from "./routes/permissoesRoutes";
import { relatoriosRoutes } from "./routes/relatoriosRoutes";
import { usuariosRoutes } from "./routes/usuariosRoutes";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "8mb" })); // assinatura do recibo vem como imagem base64
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/auth", authRoutes);
app.use("/clientes", clientesRoutes);
app.use("/ordens-servico", ordensServicoRoutes);
app.use("/usuarios", usuariosRoutes);
app.use("/pecas", pecasRoutes);
app.use("/orcamentos", orcamentosRoutes);
app.use("/calhas", calhaRoutes);
app.use("/faturas", faturasRoutes);
app.use("/contas-pagar", contasPagarRoutes);
app.use("/notas-entrada", notasEntradaRoutes);
app.use("/relatorios", relatoriosRoutes);
app.use("/consultas", consultasRoutes);
app.use("/empresa", empresaRoutes);
app.use("/permissoes", permissoesRoutes);
app.use("/pagamentos", pagamentosRoutes);
app.use("/admin", adminRoutes);

app.use(errorHandler);
