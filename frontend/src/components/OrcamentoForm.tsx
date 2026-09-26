import { useState } from "react";
import { api } from "../lib/api";
import type { Peca } from "../types/peca";
import { TIPO_ITEM_LABEL, type TipoItemOrcamento } from "../types/orcamento";

interface LinhaItem {
  chave: string;
  tipo: TipoItemOrcamento;
  descricao: string;
  quantidade: string;
  valorUnitario: string;
  pecaId: string;
}

function novaLinha(): LinhaItem {
  return {
    chave: crypto.randomUUID(),
    tipo: "mao_de_obra",
    descricao: "",
    quantidade: "1",
    valorUnitario: "0",
    pecaId: "",
  };
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface Props {
  osId: string;
  pecasDisponiveis: Peca[];
  onCriado: () => void;
  onCancelar: () => void;
}

export function OrcamentoForm({ osId, pecasDisponiveis, onCriado, onCancelar }: Props) {
  const [linhas, setLinhas] = useState<LinhaItem[]>([novaLinha()]);
  const [validadeDias, setValidadeDias] = useState("7");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function atualizarLinha(chave: string, campos: Partial<LinhaItem>) {
    setLinhas((atual) => atual.map((linha) => (linha.chave === chave ? { ...linha, ...campos } : linha)));
  }

  function selecionarPeca(chave: string, pecaId: string) {
    const peca = pecasDisponiveis.find((p) => p.id === pecaId);
    atualizarLinha(chave, {
      pecaId,
      descricao: peca?.nome ?? "",
      valorUnitario: peca?.valorUnitario ?? "0",
    });
  }

  function removerLinha(chave: string) {
    setLinhas((atual) => (atual.length > 1 ? atual.filter((linha) => linha.chave !== chave) : atual));
  }

  const total = linhas.reduce(
    (soma, linha) => soma + (Number(linha.quantidade) || 0) * (Number(linha.valorUnitario) || 0),
    0,
  );

  async function handleSubmit() {
    setErro(null);

    const itens = linhas.map((linha) => ({
      tipo: linha.tipo,
      descricao: linha.descricao,
      quantidade: Number(linha.quantidade),
      valorUnitario: Number(linha.valorUnitario),
      pecaId: linha.tipo === "peca" && linha.pecaId ? linha.pecaId : undefined,
    }));

    if (itens.some((item) => !item.descricao || item.quantidade <= 0)) {
      setErro("Preencha a descrição e uma quantidade válida em todos os itens.");
      return;
    }

    setSalvando(true);
    try {
      await api.post(`/ordens-servico/${osId}/orcamentos`, {
        validadeDias: Number(validadeDias) || 7,
        itens,
      });
      onCriado();
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? "Não foi possível criar o orçamento.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Novo orçamento</h2>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-slate-600">Validade (dias)</label>
          <input
            type="number"
            min="1"
            value={validadeDias}
            onChange={(e) => setValidadeDias(e.target.value)}
            className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
        </div>
      </div>

      <div className="space-y-3">
        {linhas.map((linha) => (
          <div key={linha.chave} className="flex flex-col gap-2 rounded-lg border border-slate-100 p-3 sm:flex-row sm:items-end">
            <div className="w-full sm:w-36">
              <label className="mb-1 block text-xs font-medium text-slate-600">Tipo</label>
              <select
                value={linha.tipo}
                onChange={(e) => atualizarLinha(linha.chave, { tipo: e.target.value as TipoItemOrcamento, pecaId: "" })}
                className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              >
                {Object.entries(TIPO_ITEM_LABEL).map(([valor, label]) => (
                  <option key={valor} value={valor}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {linha.tipo === "peca" ? (
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-600">Peça</label>
                <select
                  value={linha.pecaId}
                  onChange={(e) => selecionarPeca(linha.chave, e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">Selecione...</option>
                  {pecasDisponiveis.map((peca) => (
                    <option key={peca.id} value={peca.id}>
                      {peca.nome}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-600">Descrição</label>
                <input
                  value={linha.descricao}
                  onChange={(e) => atualizarLinha(linha.chave, { descricao: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>
            )}

            <div className="w-full sm:w-20">
              <label className="mb-1 block text-xs font-medium text-slate-600">Qtd.</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={linha.quantidade}
                onChange={(e) => atualizarLinha(linha.chave, { quantidade: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="w-full sm:w-28">
              <label className="mb-1 block text-xs font-medium text-slate-600">Valor unit. (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={linha.valorUnitario}
                onChange={(e) => atualizarLinha(linha.chave, { valorUnitario: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <button
              onClick={() => removerLinha(linha.chave)}
              disabled={linhas.length === 1}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() => setLinhas((atual) => [...atual, novaLinha()])}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          + Adicionar item
        </button>
        <p className="text-sm font-semibold text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>
          Total: {formatarMoeda(total)}
        </p>
      </div>

      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={salvando}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {salvando ? "Salvando..." : "Enviar orçamento"}
        </button>
        <button
          onClick={onCancelar}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
