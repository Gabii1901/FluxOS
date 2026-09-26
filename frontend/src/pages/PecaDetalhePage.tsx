import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { usePermissao } from "../hooks/usePermissao";
import { api } from "../lib/api";
import type { PecaDetalhe, TipoMovimentacao } from "../types/peca";

function formatarMoeda(valor: string) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PecaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const { pode } = usePermissao();
  const podeEditar = pode("estoque", "editar");
  const [peca, setPeca] = useState<PecaDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [tipo, setTipo] = useState<TipoMovimentacao>("entrada");
  const [quantidade, setQuantidade] = useState("1");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [editando, setEditando] = useState(false);
  const [skuEdicao, setSkuEdicao] = useState("");
  const [nomeEdicao, setNomeEdicao] = useState("");
  const [valorEdicao, setValorEdicao] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);

  function carregar() {
    return api.get<PecaDetalhe>(`/pecas/${id}`).then((resposta) => setPeca(resposta.data));
  }

  useEffect(() => {
    carregar().finally(() => setCarregando(false));
  }, [id]);

  function abrirEdicao() {
    if (!peca) return;
    setSkuEdicao(peca.sku);
    setNomeEdicao(peca.nome);
    setValorEdicao(peca.valorUnitario);
    setErroEdicao(null);
    setEditando(true);
  }

  async function handleSalvarEdicao(evento: FormEvent) {
    evento.preventDefault();
    setErroEdicao(null);
    setSalvandoEdicao(true);
    try {
      await api.patch(`/pecas/${id}`, {
        sku: skuEdicao,
        nome: nomeEdicao,
        valorUnitario: Number(valorEdicao),
      });
      setEditando(false);
      await carregar();
    } catch (e: any) {
      setErroEdicao(e?.response?.data?.erro ?? "Não foi possível salvar as alterações.");
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      await api.post(`/pecas/${id}/movimentacoes`, {
        tipo,
        quantidade: Number(quantidade),
        motivo: motivo || undefined,
      });
      setQuantidade("1");
      setMotivo("");
      await carregar();
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? "Não foi possível registrar a movimentação.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return <p className="px-6 py-10 text-sm text-slate-500">Carregando...</p>;
  }

  if (!peca) {
    return <p className="px-6 py-10 text-sm text-red-600">Peça não encontrada.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link to="/estoque" className="text-sm text-slate-500 hover:text-slate-900">
        ← Estoque
      </Link>

      <header className="mb-8 mt-3 flex items-start justify-between">
        <div>
          <p className="font-mono text-sm text-slate-500">{peca.sku}</p>
          <h1 className="mt-1 text-lg font-medium text-slate-900">{peca.nome}</h1>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-400">Em estoque</p>
          <p className="text-2xl font-semibold text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>
            {Number(peca.quantidadeEstoque)}
          </p>
        </div>
      </header>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 text-sm">
        {editando ? (
          <form onSubmit={handleSalvarEdicao} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">SKU</label>
              <input
                required
                value={skuEdicao}
                onChange={(e) => setSkuEdicao(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Nome</label>
              <input
                required
                value={nomeEdicao}
                onChange={(e) => setNomeEdicao(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Valor unitário (R$)</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={valorEdicao}
                onChange={(e) => setValorEdicao(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>
            {erroEdicao && <p className="text-sm text-red-600 sm:col-span-3">{erroEdicao}</p>}
            <div className="flex gap-3 sm:col-span-3">
              <button
                type="submit"
                disabled={salvandoEdicao}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {salvandoEdicao ? "Salvando..." : "Salvar alterações"}
              </button>
              <button
                type="button"
                onClick={() => setEditando(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Valor unitário</p>
              <p className="mt-1 font-medium text-slate-900">{formatarMoeda(peca.valorUnitario)}</p>
            </div>
            {podeEditar && (
              <button
                onClick={abrirEdicao}
                className="text-xs font-medium text-slate-600 hover:underline"
              >
                Editar
              </button>
            )}
          </div>
        )}
      </div>

      {podeEditar && (
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Registrar movimentação</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoMovimentacao)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            >
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
          </div>
          <div className="w-24">
            <label className="mb-1 block text-xs font-medium text-slate-600">Quantidade</label>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">Motivo (opcional)</label>
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="ex: uso na OS #12"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Registrar"}
          </button>
        </form>
        {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
      </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Histórico de movimentações</h2>
        {peca.movimentacoes.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma movimentação registrada.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {peca.movimentacoes.map((mov) => (
              <li key={mov.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="text-slate-900">
                    <span
                      className={
                        mov.tipo === "entrada"
                          ? "font-medium text-emerald-600"
                          : "font-medium text-red-600"
                      }
                    >
                      {mov.tipo === "entrada" ? "+" : "-"}
                      {Number(mov.quantidade)}
                    </span>{" "}
                    · {mov.usuario.nome}
                  </p>
                  {mov.motivo && <p className="text-slate-500">{mov.motivo}</p>}
                </div>
                <p className="text-xs text-slate-400">
                  {new Date(mov.criadoEm).toLocaleString("pt-BR")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
