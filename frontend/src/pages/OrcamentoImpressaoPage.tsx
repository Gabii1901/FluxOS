import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { STATUS_ORCAMENTO_LABEL, TIPO_ITEM_LABEL, type OrcamentoImpressao } from "../types/orcamento";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function somarDias(data: Date, dias: number) {
  const resultado = new Date(data);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

export function OrcamentoImpressaoPage() {
  const { id } = useParams<{ id: string }>();
  const [orcamento, setOrcamento] = useState<OrcamentoImpressao | null>(null);

  useEffect(() => {
    api.get<OrcamentoImpressao>(`/orcamentos/${id}`).then((resposta) => setOrcamento(resposta.data));
  }, [id]);

  if (!orcamento) {
    return <p className="p-10 text-sm text-slate-500">Carregando...</p>;
  }

  const dataBase = orcamento.enviadoEm ? new Date(orcamento.enviadoEm) : new Date(orcamento.criadoEm);
  const validoAte = somarDias(dataBase, orcamento.validadeDias);

  return (
    <div className="mx-auto max-w-2xl px-8 py-10 text-slate-900">
      <div className="mb-6 flex justify-end print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Imprimir
        </button>
      </div>

      <header className="mb-8 flex items-start justify-between border-b border-slate-300 pb-6">
        <div>
          <img src="/logo_fluxos_wordmark.png" alt="FluxOS" className="h-8 w-auto" />
          <p className="mt-2 text-sm text-slate-500">{orcamento.ordemServico.empresa.nome}</p>
        </div>
        <div className="text-right">
          <h1 className="text-xl font-semibold">Orçamento</h1>
          <p className="text-sm text-slate-500">OS #{orcamento.ordemServico.numero}</p>
          <p className="text-sm text-slate-500">{dataBase.toLocaleDateString("pt-BR")}</p>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Cliente</p>
          <p className="font-medium">{orcamento.ordemServico.cliente.nome}</p>
          {orcamento.ordemServico.cliente.documento && (
            <p className="text-slate-600">{orcamento.ordemServico.cliente.documento}</p>
          )}
          {orcamento.ordemServico.cliente.telefone && (
            <p className="text-slate-600">{orcamento.ordemServico.cliente.telefone}</p>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
          <p className="font-medium">{STATUS_ORCAMENTO_LABEL[orcamento.status]}</p>
          <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">Válido até</p>
          <p className="font-medium">{validoAte.toLocaleDateString("pt-BR")}</p>
        </div>
      </section>

      <section className="mb-6">
        <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">Referente a</p>
        <p className="rounded-lg border border-slate-200 p-3 text-sm">
          {orcamento.ordemServico.problemaRelatado}
        </p>
      </section>

      <section className="mb-6">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-xs uppercase text-slate-500">
              <th className="py-1.5">Item</th>
              <th className="py-1.5">Tipo</th>
              <th className="py-1.5 text-right">Qtd.</th>
              <th className="py-1.5 text-right">Valor unit.</th>
              <th className="py-1.5 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orcamento.itens.map((item) => (
              <tr key={item.id}>
                <td className="py-1.5">{item.descricao}</td>
                <td className="py-1.5 text-slate-600">{TIPO_ITEM_LABEL[item.tipo]}</td>
                <td className="py-1.5 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {Number(item.quantidade)}
                </td>
                <td className="py-1.5 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatarMoeda(Number(item.valorUnitario))}
                </td>
                <td className="py-1.5 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatarMoeda(Number(item.quantidade) * Number(item.valorUnitario))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-300 text-base font-semibold">
              <td className="py-2" colSpan={4}>
                Total
              </td>
              <td className="py-2 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatarMoeda(Number(orcamento.valorTotal))}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="mt-16 grid grid-cols-2 gap-12 text-center text-sm">
        <div>
          <div className="border-t border-slate-400 pt-2">Assinatura do cliente</div>
        </div>
        <div>
          <div className="border-t border-slate-400 pt-2">Data</div>
        </div>
      </section>
    </div>
  );
}
