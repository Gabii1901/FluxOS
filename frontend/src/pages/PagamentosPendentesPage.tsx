import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePermissao } from "../hooks/usePermissao";
import { api } from "../lib/api";
import type { PagamentoPendente } from "../types/faturamento";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(valor: string) {
  return new Date(valor).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function estaAtrasado(vencimento: string | null) {
  if (!vencimento) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return new Date(vencimento) < hoje;
}

export function PagamentosPendentesPage() {
  const { pode } = usePermissao();
  const podeEditar = pode("financeiro", "editar");
  const podeApagar = pode("financeiro", "apagar");
  const [pagamentos, setPagamentos] = useState<PagamentoPendente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editandoVencimentoId, setEditandoVencimentoId] = useState<string | null>(null);
  const [novoVencimento, setNovoVencimento] = useState("");
  const [processandoId, setProcessandoId] = useState<string | null>(null);

  const [filtroBusca, setFiltroBusca] = useState("");
  const [filtroMetodo, setFiltroMetodo] = useState("todos");
  const [somenteAtrasados, setSomenteAtrasados] = useState(false);

  function carregar() {
    return api.get<PagamentoPendente[]>("/faturas/pagamentos/pendentes").then((resposta) => setPagamentos(resposta.data));
  }

  useEffect(() => {
    carregar().finally(() => setCarregando(false));
  }, []);

  async function handleAtualizarVencimento(pagamentoId: string) {
    if (!novoVencimento) return;
    setProcessandoId(pagamentoId);
    try {
      await api.patch(`/faturas/pagamentos/${pagamentoId}/vencimento`, { vencimento: novoVencimento });
      setEditandoVencimentoId(null);
      setNovoVencimento("");
      await carregar();
    } finally {
      setProcessandoId(null);
    }
  }

  async function handleDarBaixa(pagamentoId: string) {
    setProcessandoId(pagamentoId);
    try {
      await api.patch(`/faturas/pagamentos/${pagamentoId}/baixa`);
      await carregar();
    } finally {
      setProcessandoId(null);
    }
  }

  async function handleRemover(pagamentoId: string) {
    setProcessandoId(pagamentoId);
    try {
      await api.delete(`/faturas/pagamentos/${pagamentoId}`);
      await carregar();
    } finally {
      setProcessandoId(null);
    }
  }

  const totalPendente = pagamentos.reduce((soma, p) => soma + Number(p.valor), 0);
  const totalAtrasado = pagamentos
    .filter((p) => estaAtrasado(p.vencimento))
    .reduce((soma, p) => soma + Number(p.valor), 0);

  const metodos = useMemo(
    () => Array.from(new Set(pagamentos.map((p) => p.metodo))).sort(),
    [pagamentos],
  );

  const pagamentosFiltrados = useMemo(() => {
    const busca = filtroBusca.trim().toLowerCase();

    return pagamentos.filter((p) => {
      if (filtroMetodo !== "todos" && p.metodo !== filtroMetodo) return false;
      if (somenteAtrasados && !estaAtrasado(p.vencimento)) return false;
      if (
        busca &&
        !p.fatura.ordemServico.cliente.nome.toLowerCase().includes(busca) &&
        !String(p.fatura.ordemServico.numero).includes(busca)
      ) {
        return false;
      }
      return true;
    });
  }, [pagamentos, filtroBusca, filtroMetodo, somenteAtrasados]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Pagamentos a prazo</h1>
        <p className="mt-1 text-sm text-slate-500">
          Boletos e outros pagamentos agendados que ainda aguardam baixa.
        </p>
      </header>

      {!carregando && pagamentos.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Total pendente</p>
            <p className="mt-1 text-lg font-semibold text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatarMoeda(totalPendente)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Em atraso</p>
            <p
              className={`mt-1 text-lg font-semibold ${totalAtrasado > 0 ? "text-red-600" : "text-slate-900"}`}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatarMoeda(totalAtrasado)}
            </p>
          </div>
        </div>
      )}

      {carregando && <p className="text-sm text-slate-500">Carregando...</p>}

      {!carregando && pagamentos.length === 0 && (
        <p className="text-sm text-slate-500">Nenhum pagamento a prazo pendente no momento.</p>
      )}

      {pagamentos.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">OS</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Vencimento</th>
                {(podeEditar || podeApagar) && <th className="px-4 py-3"></th>}
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
                <th className="px-4 py-2">
                  <select
                    value={filtroMetodo}
                    onChange={(e) => setFiltroMetodo(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-normal normal-case capitalize text-slate-700 outline-none focus:border-slate-400"
                  >
                    <option value="todos">Todos</option>
                    {metodos.map((metodo) => (
                      <option key={metodo} value={metodo} className="capitalize">
                        {metodo}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="px-4 py-2"></th>
                <th className="px-4 py-2">
                  <label className="flex items-center gap-1.5 text-xs font-normal normal-case text-slate-600">
                    <input
                      type="checkbox"
                      checked={somenteAtrasados}
                      onChange={(e) => setSomenteAtrasados(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300"
                    />
                    Só atrasados
                  </label>
                </th>
                {(podeEditar || podeApagar) && <th className="px-4 py-2"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagamentosFiltrados.map((pagamento) => {
                const atrasado = estaAtrasado(pagamento.vencimento);
                const processando = processandoId === pagamento.id;

                return (
                  <tr key={pagamento.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-slate-600">
                      <Link to={`/ordens-servico/${pagamento.fatura.ordemServico.id}`} className="hover:underline">
                        #{pagamento.fatura.ordemServico.numero}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-900">{pagamento.fatura.ordemServico.cliente.nome}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">{pagamento.metodo}</td>
                    <td className="px-4 py-3 text-slate-600" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatarMoeda(Number(pagamento.valor))}
                    </td>
                    <td className="px-4 py-3">
                      {!podeEditar ? (
                        <span className={atrasado ? "text-sm font-medium text-red-600" : "text-sm text-slate-600"}>
                          {pagamento.vencimento ? formatarData(pagamento.vencimento) : "Sem data"}
                          {atrasado ? " · atrasado" : ""}
                        </span>
                      ) : editandoVencimentoId === pagamento.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={novoVencimento}
                            onChange={(e) => setNovoVencimento(e.target.value)}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          />
                          <button
                            onClick={() => handleAtualizarVencimento(pagamento.id)}
                            disabled={processando || !novoVencimento}
                            className="text-xs font-medium text-slate-900 hover:underline disabled:opacity-40"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setEditandoVencimentoId(null)}
                            className="text-xs font-medium text-slate-500 hover:underline"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditandoVencimentoId(pagamento.id);
                            setNovoVencimento(pagamento.vencimento?.slice(0, 10) ?? "");
                          }}
                          className={`text-sm hover:underline ${atrasado ? "font-medium text-red-600" : "text-slate-600"}`}
                        >
                          {pagamento.vencimento ? formatarData(pagamento.vencimento) : "Sem data"}
                          {atrasado ? " · atrasado" : ""}
                        </button>
                      )}
                    </td>
                    {(podeEditar || podeApagar) && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3">
                          {podeEditar && (
                            <button
                              onClick={() => handleDarBaixa(pagamento.id)}
                              disabled={processando}
                              className="text-xs font-medium text-emerald-600 hover:underline disabled:opacity-40"
                            >
                              Dar baixa
                            </button>
                          )}
                          {podeApagar && (
                            <button
                              onClick={() => handleRemover(pagamento.id)}
                              disabled={processando}
                              className="text-xs font-medium text-red-600 hover:underline disabled:opacity-40"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {pagamentosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={podeEditar || podeApagar ? 6 : 5} className="px-4 py-6 text-center text-slate-500">
                    Nenhum pagamento encontrado com esses filtros.
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
