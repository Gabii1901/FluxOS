import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PerfilCalhaDesenho } from "../components/PerfilCalhaDesenho";
import { api } from "../lib/api";
import {
  SERVICOS_EM_CHAPA,
  STATUS_ORCAMENTO_CALHA_LABEL,
  TIPO_SERVICO_LABEL,
  type OrcamentoCalha,
  type OrcamentoCalhaItem,
} from "../types/calha";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function nomeServico(item: OrcamentoCalhaItem) {
  return item.tipoServico === "venda" ? "Venda" : TIPO_SERVICO_LABEL[item.tipoServico];
}

function medida(item: OrcamentoCalhaItem) {
  if (!SERVICOS_EM_CHAPA.includes(item.tipoServico)) return `${Number(item.quantidade)} un`;
  const corte = item.corteLargura ? ` · corte ${Number(item.corteLargura)}${item.unidadeCorte}` : "";
  return `${Number(item.quantidade)}${item.unidadeQuantidade}${corte}`;
}

// Documento para o cliente: mostra só preços finais — custo, margem e lucro ficam de fora.
export function CalhaOrcamentoImpressaoPage() {
  const { id } = useParams<{ id: string }>();
  const [orcamento, setOrcamento] = useState<OrcamentoCalha | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    api
      .get<OrcamentoCalha>(`/calhas/orcamentos/${id}`)
      .then((resposta) => setOrcamento(resposta.data))
      .catch(() => setErro(true));
  }, [id]);

  if (erro) return <p className="p-10 text-sm text-slate-500">Orçamento não encontrado.</p>;
  if (!orcamento) return <p className="p-10 text-sm text-slate-500">Carregando...</p>;

  const totalMaoDeObra = orcamento.maoDeObra.reduce((soma, m) => soma + Number(m.custoTotal), 0);
  const horasMaoDeObra = orcamento.maoDeObra.reduce((soma, m) => soma + Number(m.horas), 0);
  const itensComFormato = orcamento.itens
    .map((item) => ({ item, segmentos: item.segmentosCustom ?? item.perfil?.segmentos ?? null }))
    .filter((x): x is { item: OrcamentoCalhaItem; segmentos: NonNullable<typeof x.segmentos> } => !!x.segmentos?.length);

  return (
    <div className="mx-auto max-w-2xl px-8 py-10 text-slate-900">
      <div className="mb-6 flex items-center justify-end gap-3 print:hidden">
        <p className="text-xs text-slate-400">Para gerar PDF, escolha "Salvar como PDF" na janela de impressão.</p>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Imprimir / PDF
        </button>
      </div>

      <header className="mb-8 flex items-start justify-between border-b border-slate-300 pb-6">
        <div>
          <img src={`${import.meta.env.BASE_URL}logo_fluxos_wordmark.png`} alt="FluxOS" className="h-8 w-auto" />
          {orcamento.empresa && <p className="mt-2 text-sm text-slate-500">{orcamento.empresa.nome}</p>}
        </div>
        <div className="text-right">
          <h1 className="text-xl font-semibold">Orçamento de Calhas</h1>
          <p className="text-sm text-slate-500">
            Nº {orcamento.numero}
            {orcamento.os && ` · OS #${orcamento.os.numero}`}
          </p>
          <p className="text-sm text-slate-500">{new Date(orcamento.criadoEm).toLocaleDateString("pt-BR")}</p>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Cliente</p>
          <p className="font-medium">{orcamento.cliente?.nome ?? "—"}</p>
          {orcamento.cliente?.documento && <p className="text-slate-600">{orcamento.cliente.documento}</p>}
          {orcamento.cliente?.telefone && <p className="text-slate-600">{orcamento.cliente.telefone}</p>}
          {orcamento.cliente?.email && <p className="text-slate-600">{orcamento.cliente.email}</p>}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
          <p className="font-medium">{STATUS_ORCAMENTO_CALHA_LABEL[orcamento.status]}</p>
        </div>
      </section>

      {orcamento.os?.problemaRelatado && (
        <section className="mb-6">
          <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">Referente a</p>
          <p className="rounded-lg border border-slate-200 p-3 text-sm">{orcamento.os.problemaRelatado}</p>
        </section>
      )}

      <section className="mb-6">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-xs uppercase text-slate-500">
              <th className="py-1.5">Serviço / produto</th>
              <th className="py-1.5">Medida</th>
              <th className="py-1.5">Material</th>
              <th className="py-1.5 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orcamento.itens.map((item) => (
              <tr key={item.id}>
                <td className="py-1.5">
                  {nomeServico(item)}
                  {item.descricao && <span className="block text-xs text-slate-500">{item.descricao}</span>}
                  {item.perfil && <span className="block text-xs text-slate-500">{item.perfil.nome}</span>}
                </td>
                <td className="py-1.5 text-slate-600">{medida(item)}</td>
                <td className="py-1.5 text-slate-600">
                  {item.material ? `${item.material.nome}${item.material.tipo ? ` · ${item.material.tipo}` : ""}` : "—"}
                </td>
                <td className="py-1.5 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatarMoeda(Number(item.precoCalculado))}
                </td>
              </tr>
            ))}
            {totalMaoDeObra > 0 && (
              <tr>
                <td className="py-1.5">Mão de obra</td>
                <td className="py-1.5 text-slate-600">{horasMaoDeObra}h</td>
                <td className="py-1.5 text-slate-600">—</td>
                <td className="py-1.5 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatarMoeda(totalMaoDeObra)}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-300 text-base font-semibold">
              <td className="py-2" colSpan={3}>
                Total
              </td>
              <td className="py-2 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatarMoeda(Number(orcamento.precoTotal))}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      {itensComFormato.length > 0 && (
        <section className="mb-6 break-inside-avoid">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Formato das peças</p>
          <div className="space-y-4">
            {itensComFormato.map(({ item, segmentos }) => (
              <div key={item.id} className="break-inside-avoid rounded-lg border border-slate-200 p-3">
                <p className="mb-1 text-sm font-medium">
                  {nomeServico(item)}
                  {item.perfil ? ` · ${item.perfil.nome}` : ""}
                  <span className="font-normal text-slate-500"> — {medida(item)}</span>
                </p>
                <div className="flex justify-center">
                  <PerfilCalhaDesenho segmentos={segmentos} className="w-full max-w-[420px]" />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Largura da chapa (soma das dobras):{" "}
                  {segmentos.reduce((s, x) => s + x.valorCm, 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} cm
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

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
