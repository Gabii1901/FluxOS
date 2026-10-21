import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { STATUS_ORCAMENTO_CALHA_LABEL, type OrcamentoCalhaResumo, type StatusOrcamentoCalha } from "../types/calha";

function formatarMoeda(valor: string) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_STYLE: Record<StatusOrcamentoCalha, string> = {
  rascunho: "bg-slate-100 text-slate-600",
  enviado: "bg-amber-100 text-amber-800",
  aprovado: "bg-emerald-100 text-emerald-700",
  recusado: "bg-red-100 text-red-700",
};

export function CalhaOrcamentosPage() {
  const navigate = useNavigate();
  const [orcamentos, setOrcamentos] = useState<OrcamentoCalhaResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  function carregar() {
    setCarregando(true);
    return api
      .get<OrcamentoCalhaResumo[]>("/calhas/orcamentos")
      .then((resposta) => setOrcamentos(resposta.data))
      .finally(() => setCarregando(false));
  }

  async function handleNovoOrcamento() {
    setCriando(true);
    try {
      const resposta = await api.post("/calhas/orcamentos", {});
      navigate(`/orcamento-calhas/${resposta.data.id}`);
    } finally {
      setCriando(false);
    }
  }

  async function handleExcluir(evento: React.MouseEvent, id: string) {
    evento.stopPropagation();
    if (!window.confirm("Excluir esse orçamento? Essa ação não pode ser desfeita.")) return;
    try {
      await api.delete(`/calhas/orcamentos/${id}`);
      carregar();
    } catch (e: any) {
      window.alert(e?.response?.data?.erro ?? "Não foi possível excluir o orçamento.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Orçamento de Calhas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Orçamentos com cálculo de corte de chapa, mão de obra e margem de lucro.
          </p>
        </div>
        <button
          type="button"
          onClick={handleNovoOrcamento}
          disabled={criando}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {criando ? "Criando..." : "+ Novo orçamento"}
        </button>
      </header>

      {carregando && <p className="text-sm text-slate-500">Carregando...</p>}

      {!carregando && orcamentos.length === 0 && (
        <p className="text-sm text-slate-500">Nenhum orçamento de calhas criado ainda.</p>
      )}

      {orcamentos.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nº</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">OS</th>
                <th className="px-4 py-3">Preço final</th>
                <th className="px-4 py-3">Criado em</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orcamentos.map((orcamento) => (
                <tr
                  key={orcamento.id}
                  onClick={() => navigate(`/orcamento-calhas/${orcamento.id}`)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-mono text-slate-600">#{orcamento.numero}</td>
                  <td className="px-4 py-3 text-slate-900">{orcamento.cliente?.nome ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{orcamento.os ? `#${orcamento.os.numero}` : "—"}</td>
                  <td className="px-4 py-3 text-slate-600" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatarMoeda(orcamento.precoTotal)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(orcamento.criadoEm).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[orcamento.status]}`}
                    >
                      {STATUS_ORCAMENTO_CALHA_LABEL[orcamento.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        to={`/orcamento-calhas/${orcamento.id}/imprimir`}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-medium text-slate-600 hover:underline"
                      >
                        Imprimir
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => handleExcluir(e, orcamento.id)}
                        className="text-xs font-medium text-red-700 hover:underline"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
