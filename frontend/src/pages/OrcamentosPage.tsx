import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { STATUS_ORCAMENTO_LABEL, type OrcamentoResumo, type StatusOrcamento } from "../types/orcamento";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_STYLE: Record<StatusOrcamento, string> = {
  pendente: "bg-amber-100 text-amber-800",
  aprovado: "bg-emerald-100 text-emerald-700",
  recusado: "bg-red-100 text-red-700",
  expirado: "bg-slate-100 text-slate-500",
};

const TODOS_STATUS_ORCAMENTO: StatusOrcamento[] = ["pendente", "aprovado", "recusado", "expirado"];

export function OrcamentosPage() {
  const [orcamentos, setOrcamentos] = useState<OrcamentoResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroBusca, setFiltroBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusOrcamento | "todos">("todos");

  useEffect(() => {
    api
      .get<OrcamentoResumo[]>("/orcamentos")
      .then((resposta) => setOrcamentos(resposta.data))
      .finally(() => setCarregando(false));
  }, []);

  const orcamentosFiltrados = useMemo(() => {
    const busca = filtroBusca.trim().toLowerCase();

    return orcamentos.filter((orcamento) => {
      if (filtroStatus !== "todos" && orcamento.status !== filtroStatus) return false;
      if (
        busca &&
        !orcamento.ordemServico.cliente.nome.toLowerCase().includes(busca) &&
        !String(orcamento.ordemServico.numero).includes(busca)
      ) {
        return false;
      }
      return true;
    });
  }, [orcamentos, filtroBusca, filtroStatus]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Orçamentos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Todos os orçamentos criados, com o status de aprovação de cada um.
        </p>
      </header>

      {carregando && <p className="text-sm text-slate-500">Carregando...</p>}

      {!carregando && orcamentos.length === 0 && (
        <p className="text-sm text-slate-500">
          Nenhum orçamento criado ainda. Orçamentos são criados a partir do detalhe de uma ordem de
          serviço.
        </p>
      )}

      {orcamentos.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">OS</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Criado em</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
              <tr className="border-t border-slate-100">
                <th className="px-4 py-2" colSpan={2}>
                  <input
                    value={filtroBusca}
                    onChange={(e) => setFiltroBusca(e.target.value)}
                    placeholder="Filtrar por nº ou cliente..."
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-normal normal-case text-slate-700 outline-none focus:border-slate-400"
                  />
                </th>
                <th className="px-4 py-2"></th>
                <th className="px-4 py-2"></th>
                <th className="px-4 py-2">
                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value as StatusOrcamento | "todos")}
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-normal normal-case text-slate-700 outline-none focus:border-slate-400"
                  >
                    <option value="todos">Todos</option>
                    {TODOS_STATUS_ORCAMENTO.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_ORCAMENTO_LABEL[status]}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orcamentosFiltrados.map((orcamento) => (
                <tr key={orcamento.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-slate-600">
                    <Link to={`/ordens-servico/${orcamento.osId}`} className="hover:underline">
                      #{orcamento.ordemServico.numero}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-900">{orcamento.ordemServico.cliente.nome}</td>
                  <td className="px-4 py-3 text-slate-600" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatarMoeda(Number(orcamento.valorTotal))}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(orcamento.criadoEm).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[orcamento.status]}`}
                    >
                      {STATUS_ORCAMENTO_LABEL[orcamento.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/orcamentos/${orcamento.id}/imprimir`}
                      target="_blank"
                      className="text-xs font-medium text-slate-600 hover:underline"
                    >
                      Imprimir
                    </Link>
                  </td>
                </tr>
              ))}
              {orcamentosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Nenhum orçamento encontrado com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
