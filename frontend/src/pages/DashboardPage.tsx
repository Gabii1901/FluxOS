import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, type BarChartDatum } from "../components/charts/BarChart";
import { ResumoFinanceiro, type ResumoFinanceiroData } from "../components/charts/ResumoFinanceiro";
import { TrendChart, type TrendChartDatum } from "../components/charts/TrendChart";
import { useAuth } from "../contexts/AuthContext";
import { usePermissao } from "../hooks/usePermissao";
import { api } from "../lib/api";
import { STATUS_LABEL, TODOS_STATUS, type OrdemServico, type StatusOs } from "../types/ordemServico";
import type { MesRelatorio, RelatorioFinanceiro } from "../types/relatorio";
import type { ResumoContasPagar } from "../types/contaPagar";
import type { Modulo } from "../types/permissao";

// Mostrados no Início para quem não tem acesso às OS (o resumo depende delas).
const ATALHOS: { to: string; label: string; modulo: Modulo }[] = [
  { to: "/orcamento-calhas", label: "Orçamento de Calhas", modulo: "orcamento_calhas" },
  { to: "/orcamentos", label: "Orçamentos", modulo: "orcamentos" },
  { to: "/clientes", label: "Clientes", modulo: "clientes" },
  { to: "/estoque", label: "Estoque", modulo: "estoque" },
  { to: "/pagamentos-pendentes", label: "Pagamentos a prazo", modulo: "financeiro" },
  { to: "/contas-pagar", label: "Contas a pagar", modulo: "financeiro" },
  { to: "/relatorios", label: "Relatórios", modulo: "financeiro" },
  { to: "/usuarios", label: "Usuários", modulo: "usuarios" },
];

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
  const podeVerOs = pode("ordens_servico", "ver");
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [resumoFinanceiro, setResumoFinanceiro] = useState<ResumoFinanceiroData | null>(null);
  const [carregando, setCarregando] = useState(podeVerOs);
  const [contasPagar, setContasPagar] = useState<ResumoContasPagar | null>(null);
  const [despesasMensais, setDespesasMensais] = useState<MesRelatorio[] | null>(null);

  useEffect(() => {
    if (!podeVerOs) return;
    api
      .get<OrdemServico[]>("/ordens-servico")
      .then((resposta) => setOrdens(resposta.data))
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, [podeVerOs]);

  const atalhos = ATALHOS.filter((a) => pode(a.modulo, "ver"));

  useEffect(() => {
    if (!podeVerFinanceiro) return;
    api.get<ResumoFinanceiroData>("/faturas/resumo").then((resposta) => setResumoFinanceiro(resposta.data));
    api
      .get<ResumoContasPagar>("/contas-pagar/resumo")
      .then((resposta) => setContasPagar(resposta.data))
      .catch(() => {});
    const hoje = new Date();
    const doisDig = (n: number) => String(n).padStart(2, "0");
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    api
      .get<RelatorioFinanceiro>("/relatorios/financeiro", {
        params: {
          inicio: `${inicio.getFullYear()}-${doisDig(inicio.getMonth() + 1)}-01`,
          fim: `${fim.getFullYear()}-${doisDig(fim.getMonth() + 1)}-${doisDig(fim.getDate())}`,
        },
      })
      .then((resposta) => setDespesasMensais(resposta.data.meses))
      .catch(() => {});
  }, [podeVerFinanceiro]);

  const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const mesAtual = despesasMensais?.[despesasMensais.length - 1];
  const nomeMes = (mes: string) => {
    const [ano, m] = mes.split("-").map(Number);
    const texto = new Date(ano, m - 1, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}/${String(ano).slice(2)}`;
  };
  const cartaoDespesasMensais = podeVerFinanceiro && despesasMensais && mesAtual && (
    <div className="mb-6 rounded-xl border border-slate-200 border-l-4 border-l-red-400 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Despesas deste mês</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>
            {moeda(mesAtual.despesaPaga + mesAtual.despesaEmAberto)}
          </p>
          <p className="mt-1 text-xs text-slate-500" style={{ fontVariantNumeric: "tabular-nums" }}>
            {moeda(mesAtual.despesaPaga)} pago · {moeda(mesAtual.despesaEmAberto)} em aberto
          </p>
        </div>
        <Link to="/relatorios" className="text-xs font-medium text-slate-500 hover:text-slate-900">
          Ver relatórios →
        </Link>
      </div>
      <p className="mb-2 text-xs font-medium text-slate-500">Últimos 6 meses</p>
      <BarChart
        data={despesasMensais.map((m) => ({ id: m.mes, label: nomeMes(m.mes), value: m.despesaPaga + m.despesaEmAberto }))}
        ariaLabel="Despesas por mês nos últimos 6 meses"
      />
    </div>
  );
  const cartaoContasPagar = podeVerFinanceiro && contasPagar && (
    <Link
      to="/contas-pagar"
      className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 border-l-4 border-l-amber-400 bg-white p-5 hover:border-slate-300"
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">A pagar nos próximos 7 dias</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>
          {moeda(contasPagar.proximos7Dias.valor)}
        </p>
        <p className="text-xs text-slate-500">
          {contasPagar.proximos7Dias.quantidade} {contasPagar.proximos7Dias.quantidade === 1 ? "conta" : "contas"}
        </p>
      </div>
      {contasPagar.vencido.quantidade > 0 && (
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-red-600">Vencidas</p>
          <p className="mt-2 text-lg font-semibold text-red-600" style={{ fontVariantNumeric: "tabular-nums" }}>
            {moeda(contasPagar.vencido.valor)}
          </p>
          <p className="text-xs text-red-500">
            {contasPagar.vencido.quantidade} {contasPagar.vencido.quantidade === 1 ? "conta" : "contas"}
          </p>
        </div>
      )}
      <span className="text-xs font-medium text-slate-500">Ver contas a pagar →</span>
    </Link>
  );

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

      {!podeVerOs && cartaoContasPagar}
      {!podeVerOs && cartaoDespesasMensais}
      {!podeVerOs ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="mb-4 text-sm font-medium text-slate-700">Seus atalhos</p>
          {atalhos.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma tela liberada ainda. Fale com um administrador.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {atalhos.map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="rounded-lg border border-slate-200 px-4 py-4 text-sm font-medium text-slate-900 hover:border-slate-900"
                >
                  {a.label} →
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : carregando ? (
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

          {cartaoContasPagar}
          {cartaoDespesasMensais}

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
