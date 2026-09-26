import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { usePermissao } from "../hooks/usePermissao";
import { api } from "../lib/api";
import type { Peca } from "../types/peca";

type FiltroStatus = "todos" | "ativos" | "inativos";

function formatarMoeda(valor: string) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function EstoquePage() {
  const navigate = useNavigate();
  const { pode } = usePermissao();
  const podeCriar = pode("estoque", "criar");
  const podeEditar = pode("estoque", "editar");
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);

  const [sku, setSku] = useState("");
  const [nome, setNome] = useState("");
  const [valorUnitario, setValorUnitario] = useState("");
  const [quantidadeInicial, setQuantidadeInicial] = useState("0");

  const [filtroSku, setFiltroSku] = useState("");
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("ativos");

  function carregarPecas() {
    return api.get<Peca[]>("/pecas").then((resposta) => setPecas(resposta.data));
  }

  useEffect(() => {
    carregarPecas().finally(() => setCarregando(false));
  }, []);

  function limparFormulario() {
    setSku("");
    setNome("");
    setValorUnitario("");
    setQuantidadeInicial("0");
  }

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      await api.post("/pecas", {
        sku,
        nome,
        valorUnitario: Number(valorUnitario) || 0,
        quantidadeInicial: Number(quantidadeInicial) || 0,
      });
      await carregarPecas();
      limparFormulario();
      setMostrarForm(false);
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? "Não foi possível cadastrar a peça.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleToggleAtivo(peca: Peca) {
    setAtualizandoId(peca.id);
    try {
      await api.patch(`/pecas/${peca.id}`, { ativo: !peca.ativo });
      await carregarPecas();
    } finally {
      setAtualizandoId(null);
    }
  }

  const estoqueBaixo = (quantidade: string) => Number(quantidade) <= 2;

  const pecasFiltradas = useMemo(() => {
    const skuBusca = filtroSku.trim().toLowerCase();
    const nomeBusca = filtroNome.trim().toLowerCase();

    return pecas.filter((peca) => {
      if (filtroStatus === "ativos" && !peca.ativo) return false;
      if (filtroStatus === "inativos" && peca.ativo) return false;
      if (skuBusca && !peca.sku.toLowerCase().includes(skuBusca)) return false;
      if (nomeBusca && !peca.nome.toLowerCase().includes(nomeBusca)) return false;
      return true;
    });
  }, [pecas, filtroSku, filtroNome, filtroStatus]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Estoque</h1>
          <p className="mt-1 text-sm text-slate-500">Peças cadastradas e controle de entrada/saída.</p>
        </div>
        {podeCriar && (
          <button
            onClick={() => setMostrarForm((valor) => !valor)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {mostrarForm ? "Cancelar" : "Nova peça"}
          </button>
        )}
      </header>

      {mostrarForm && podeCriar && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">SKU *</label>
            <input
              required
              autoFocus
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              placeholder="ex: TEL-15-6"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nome *</label>
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Valor unitário (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={valorUnitario}
              onChange={(e) => setValorUnitario(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Quantidade inicial</label>
            <input
              type="number"
              min="0"
              step="1"
              value={quantidadeInicial}
              onChange={(e) => setQuantidadeInicial(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {erro && <p className="sm:col-span-2 text-sm text-red-600">{erro}</p>}

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Salvar peça"}
            </button>
          </div>
        </form>
      )}

      {carregando && <p className="text-sm text-slate-500">Carregando...</p>}

      {!carregando && pecas.length === 0 && (
        <p className="text-sm text-slate-500">Nenhuma peça cadastrada ainda.</p>
      )}

      {pecas.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Valor unitário</th>
                <th className="px-4 py-3">Em estoque</th>
                <th className="px-4 py-3">Status</th>
                {podeEditar && <th className="px-4 py-3"></th>}
              </tr>
              <tr className="border-t border-slate-100">
                <th className="px-4 py-2">
                  <input
                    value={filtroSku}
                    onChange={(e) => setFiltroSku(e.target.value)}
                    placeholder="Filtrar..."
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-normal normal-case text-slate-700 outline-none focus:border-slate-400"
                  />
                </th>
                <th className="px-4 py-2">
                  <input
                    value={filtroNome}
                    onChange={(e) => setFiltroNome(e.target.value)}
                    placeholder="Filtrar..."
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-normal normal-case text-slate-700 outline-none focus:border-slate-400"
                  />
                </th>
                <th className="px-4 py-2"></th>
                <th className="px-4 py-2"></th>
                <th className="px-4 py-2">
                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)}
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-normal normal-case text-slate-700 outline-none focus:border-slate-400"
                  >
                    <option value="todos">Todos</option>
                    <option value="ativos">Ativos</option>
                    <option value="inativos">Inativos</option>
                  </select>
                </th>
                {podeEditar && <th className="px-4 py-2"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pecasFiltradas.map((peca) => (
                <tr
                  key={peca.id}
                  onClick={() => navigate(`/estoque/${peca.id}`)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-mono text-slate-600">{peca.sku}</td>
                  <td className="px-4 py-3 text-slate-900">{peca.nome}</td>
                  <td className="px-4 py-3 text-slate-600" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatarMoeda(peca.valorUnitario)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        estoqueBaixo(peca.quantidadeEstoque)
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {Number(peca.quantidadeEstoque)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        peca.ativo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {peca.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  {podeEditar && (
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleAtivo(peca)}
                        disabled={atualizandoId === peca.id}
                        className={`text-xs font-medium hover:underline disabled:opacity-40 ${
                          peca.ativo ? "text-red-600" : "text-emerald-600"
                        }`}
                      >
                        {peca.ativo ? "Inativar" : "Ativar"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {pecasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={podeEditar ? 6 : 5} className="px-4 py-6 text-center text-slate-500">
                    Nenhuma peça encontrada com esses filtros.
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
