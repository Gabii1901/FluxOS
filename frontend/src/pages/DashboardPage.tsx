import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, type BarChartDatum } from "../components/charts/BarChart";
import { ResumoFinanceiro, type ResumoFinanceiroData } from "../components/charts/ResumoFinanceiro";
import { TrendChart, type TrendChartDatum } from "../components/charts/TrendChart";
import { useAuth } from "../contexts/AuthContext";
import { usePermissao } from "../hooks/usePermissao";
import { api } from "../lib/api";
import { STATUS_LABEL, TODOS_STATUS, type OrdemServico, type StatusOs } from "../types/ordemServico";

const STATUS_ABERTOS: StatusOs[] = [
  "aberta",
  "em_diagnostico",
  "aguardando_aprovacao",
  "aprovada",
  "em_execucao",
  "em_qa",
  "aguardando_peca",
];

const DIAS_TENDENCIA = 14;

function formatarDiaCurto(data: Date) {
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function DashboardPage() {
  const { usuario } = useAuth();
  const { pode } = usePermissao();
  const podeVerFinanceiro = pode("financeiro", "ver");
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [resumoFinanceiro, setResumoFinanceiro] = useState<ResumoFinanceiroData | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api
      .get<OrdemServico[]>("/ordens-servico")
      .then((resposta) => setOrdens(resposta.data))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    if (!podeVerFinanceiro) return;
    api.get<ResumoFinanceiroData>("/faturas/resumo").then((resposta) => setResumoFinanceiro(resposta.data));
  }, [podeVerFinanceiro]);

  const abertas = ordens.filter((os) => STATUS_ABERTOS.includes(os.status));
  const entregues = ordens.filter((os) => os.status === "entregue");
  const aguardandoAprovacao = ordens.filter((os) => os.status === "aguardando_aprovacao");

  const statusData: BarChartDatum[] = useMemo(() => {
    const contagem = new Map<StatusOs, number>();
    for (const os of ordens) {
      contagem.set(os.status, (contagem.get(os.status) ?? 0) + 1);
    }
    return TODOS_STATUS.filter((status) => (contagem.get(status) ?? 0) > 0).map((status) => ({
      id: status,
      label: STATUS_LABEL[status],
      value: contagem.get(status) ?? 0,
    }));
  }, [ordens]);

  const tecnicoData: BarChartDatum[] = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const os of ordens) {
      const chave = os.tecnico?.nome ?? "Sem técnico atribuído";
      contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
    }
    return [...contagem.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([nome, valor]) => ({ id: nome, label: nome, value: valor }));
  }, [ordens]);

  const tendenciaData: TrendChartDatum[] = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dias: { chave: string; label: string; value: number }[] = [];
    for (let i = DIAS_TENDENCIA - 1; i >= 0; i--) {
      const data = new Date(hoje);
      data.setDate(data.getDate() - i);
      dias.push({ chave: data.toISOString().slice(0, 10), label: formatarDiaCurto(data), value: 0 });
    }

    const porDia = new Map(dias.map((d) => [d.chave, d]));
    for (const os of ordens) {
      const chave = os.criadoEm.slice(0, 10);
      const dia = porDia.get(chave);
      if (dia) dia.value += 1;
    }

    return dias.map((d) => ({ label: d.label, value: d.value }));
  }, [ordens]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Olá, {usuario?.nome.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Resumo do que está acontecendo agora no FluxOS.</p>
      </header>

      {carregando ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 border-l-4 border-l-slate-300">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total de OS</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>
                {ordens.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 border-l-4 border-l-blue-400">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Em andamento
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>
                {abertas.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 border-l-4 border-l-amber-400">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Aguardando aprovação
              </p>
              <p className="mt-2 text-3xl font-semibold text-amber-600" style={{ fontVariantNumeric: "tabular-nums" }}>
                {aguardandoAprovacao.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 border-l-4 border-l-emerald-400">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Entregues
              </p>
              <p className="mt-2 text-3xl font-semibold text-emerald-600" style={{ fontVariantNumeric: "tabular-nums" }}>
                {entregues.length}
              </p>
            </div>
          </div>

          {podeVerFinanceiro && resumoFinanceiro && (
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Financeiro</h2>
                <Link to="/pagamentos-pendentes" className="text-xs font-medium text-slate-500 hover:text-slate-900">
                  Ver pagamentos a prazo →
                </Link>
              </div>
              <ResumoFinanceiro {...resumoFinanceiro} />
            </div>
          )}

          {ordens.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">
                Nenhuma ordem de serviço cadastrada ainda.{" "}
                <Link to="/ordens-servico" className="font-medium text-slate-900 hover:underline">
                  Criar a primeira →
                </Link>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">OS abertas nos últimos 14 dias</h2>
                </div>
                <TrendChart data={tendenciaData} ariaLabel="Ordens de serviço abertas por dia nos últimos 14 dias" />
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900">OS por status</h2>
                    <Link to="/ordens-servico" className="text-xs font-medium text-slate-500 hover:text-slate-900">
                      Ver todas →
                    </Link>
                  </div>
                  <BarChart data={statusData} ariaLabel="Quantidade de ordens de serviço por status" />
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="mb-4 text-sm font-semibold text-slate-900">OS por técnico</h2>
                  <BarChart data={tecnicoData} ariaLabel="Quantidade de ordens de serviço por técnico" />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
