import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PerfilCalhaDesenho } from "../components/PerfilCalhaDesenho";
import { api } from "../lib/api";
import {
  SERVICOS_EM_CHAPA,
  TIPO_SERVICO_LABEL,
  croquisDoItem,
  type OrcamentoCalha,
  type OrcamentoCalhaItem,
  type UnidadeComprimento,
} from "../types/calha";

// Folha de produção (oficina): desenhos pequenos lado a lado, medida de cada
// segmento, corte da chapa e resumo de materiais. Sem nenhum valor em R$.

const SETAS: Record<number, string> = { 0: "→", 45: "↗", 90: "↑", 135: "↖", 180: "←", 225: "↙", 270: "↓", 315: "↘" };

function paraMetros(valor: number, unidade: UnidadeComprimento | null) {
  if (unidade === "cm") return valor / 100;
  if (unidade === "mm") return valor / 1000;
  return valor;
}

const num = (v: number, casas = 2) => v.toLocaleString("pt-BR", { maximumFractionDigits: casas });

function nomeItem(item: OrcamentoCalhaItem) {
  return item.tipoServico === "venda" ? "Venda" : TIPO_SERVICO_LABEL[item.tipoServico];
}

function nomeMaterial(item: OrcamentoCalhaItem) {
  const m = item.material;
  if (!m) return "Sem material";
  return [m.nome, m.espessuraMm ? `${num(Number(m.espessuraMm))} mm` : null, m.tipo, m.cor].filter(Boolean).join(" · ");
}

export function CalhaProducaoImpressaoPage() {
  const { id } = useParams<{ id: string }>();
  const [orcamento, setOrcamento] = useState<OrcamentoCalha | null>(null);
  const [erro, setErro] = useState(false);
  const [colunas, setColunas] = useState(3);
  const [comCroquis, setComCroquis] = useState(true);

  useEffect(() => {
    api
      .get<OrcamentoCalha>(`/calhas/orcamentos/${id}`)
      .then((r) => setOrcamento(r.data))
      .catch(() => setErro(true));
  }, [id]);

  const pecas = useMemo(
    () =>
      (orcamento?.itens ?? [])
        .filter((item) => SERVICOS_EM_CHAPA.includes(item.tipoServico))
        .map((item) => ({ item, segmentos: item.segmentosCustom ?? item.perfil?.segmentos ?? [] })),
    [orcamento],
  );

  // Cada desenho complementar vira um quadradinho a mais, logo depois da sua peça.
  const quadros = useMemo(
    () =>
      pecas.flatMap(({ item, segmentos }, i) => [
        { item, segmentos, rotulo: `${i + 1}`, nomeDesenho: null as string | null, principal: true },
        ...(item.desenhosExtras ?? []).map((d, j) => ({
          item,
          segmentos: d.segmentos,
          rotulo: `${i + 1}${String.fromCharCode(98 + j)}`,
          nomeDesenho: d.nome,
          principal: false,
        })),
      ]),
    [pecas],
  );

  const outrosItens = (orcamento?.itens ?? []).filter((item) => !SERVICOS_EM_CHAPA.includes(item.tipoServico));

  // Resumo por material, com os cortes agrupados pela largura da chapa.
  const materiais = useMemo(() => {
    const mapa = new Map<
      string,
      { nome: string; pecas: number; metros: number; areaM2: number; cortes: Map<number, number> }
    >();
    for (const { item } of pecas) {
      const chave = item.materialId ?? "sem";
      const atual = mapa.get(chave) ?? { nome: nomeMaterial(item), pecas: 0, metros: 0, areaM2: 0, cortes: new Map() };
      const metros = paraMetros(Number(item.quantidade), item.unidadeQuantidade);
      const corteCm = item.corteLargura ? paraMetros(Number(item.corteLargura), item.unidadeCorte) * 100 : 0;
      atual.pecas += 1;
      atual.metros += metros;
      atual.areaM2 += metros * (corteCm / 100);
      if (corteCm > 0) atual.cortes.set(corteCm, (atual.cortes.get(corteCm) ?? 0) + metros);
      mapa.set(chave, atual);
    }
    return [...mapa.values()];
  }, [pecas]);

  if (erro) return <p className="p-10 text-sm text-slate-500">Orçamento não encontrado.</p>;
  if (!orcamento) return <p className="p-10 text-sm text-slate-500">Carregando...</p>;

  const gradeCls = colunas === 2 ? "grid-cols-2" : colunas === 4 ? "grid-cols-4" : "grid-cols-3";

  return (
    <div className="mx-auto max-w-[210mm] px-3 py-6 sm:px-6 sm:py-8 text-slate-900 print:max-w-none print:p-0">
      <style>{`@page { size: A4; margin: 10mm; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 print:hidden">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2 text-slate-700">
            Desenhos por linha
            <select
              value={colunas}
              onChange={(e) => setColunas(Number(e.target.value))}
              className="rounded-md border border-slate-300 px-2 py-1"
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-slate-700">
            <input type="checkbox" checked={comCroquis} onChange={(e) => setComCroquis(e.target.checked)} />
            Incluir croquis
          </label>
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Imprimir / PDF
        </button>
      </div>

      <header className="mb-4 flex items-baseline justify-between border-b border-slate-300 pb-2">
        <h1 className="text-base font-semibold">
          Folha de produção · Orçamento nº {orcamento.numero}
          {orcamento.os && ` · OS #${orcamento.os.numero}`}
        </h1>
        <p className="text-xs text-slate-600">
          {orcamento.cliente?.nome ?? ""} · {new Date().toLocaleDateString("pt-BR")}
        </p>
      </header>

      {pecas.length === 0 ? (
        <p className="text-sm text-slate-500">Este orçamento não tem peças em chapa.</p>
      ) : (
        <section className={`grid ${gradeCls} gap-2.5`}>
          {quadros.map(({ item, segmentos, rotulo, nomeDesenho, principal }) => {
            const corte = segmentos.reduce((s, x) => s + x.valorCm, 0);
            return (
              <article key={`${item.id}-${rotulo}`} className="break-inside-avoid rounded-md border border-slate-300 p-2 text-[11px] leading-tight">
                <p className="font-semibold">
                  {rotulo}. {nomeItem(item)}
                  {nomeDesenho
                    ? ` · ${nomeDesenho}`
                    : item.perfil
                      ? ` · ${item.perfil.nome}`
                      : item.segmentosCustom
                        ? " · personalizado"
                        : ""}
                </p>
                <p className="text-slate-600">
                  {num(Number(item.quantidade))}
                  {item.unidadeQuantidade}
                  {item.corteLargura && ` · corte ${num(Number(item.corteLargura), 1)}${item.unidadeCorte}`}
                </p>
                <p className="truncate text-slate-500">{nomeMaterial(item)}</p>
                {item.descricao && <p className="truncate text-slate-500">{item.descricao}</p>}

                {segmentos.length > 0 ? (
                  <>
                    <PerfilCalhaDesenho segmentos={segmentos} className="my-1 w-full" tamanhoTexto={colunas >= 4 ? 26 : colunas === 3 ? 22 : 16} />
                    <table className="w-full">
                      <tbody>
                        {segmentos.map((s, j) => (
                          <tr key={j} className="border-t border-slate-100">
                            <td className="w-4 py-0.5 text-slate-400">{j + 1}</td>
                            <td className="truncate py-0.5">{s.nome}</td>
                            <td className="w-4 py-0.5 text-center text-slate-500">{SETAS[s.anguloGraus ?? 0] ?? `${s.anguloGraus}°`}</td>
                            <td className="w-14 py-0.5 text-right font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                              {num(s.valorCm, 1)} cm
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t border-slate-300 font-semibold">
                          <td />
                          <td className="py-0.5" colSpan={2}>
                            Chapa
                          </td>
                          <td className="py-0.5 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                            {num(corte, 1)} cm
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </>
                ) : (
                  <p className="my-3 text-center text-slate-400">Sem desenho de perfil</p>
                )}

                {comCroquis &&
                  principal &&
                  croquisDoItem(item).map((c, j) => (
                    <img key={j} src={c} alt={`Croqui ${rotulo}.${j + 1}`} className="mt-1 w-full rounded border border-slate-200" />
                  ))}
              </article>
            );
          })}
        </section>
      )}

      {materiais.length > 0 && (
        <section className="mt-5 break-inside-avoid">
          <h2 className="mb-1.5 text-sm font-semibold">Resumo de materiais</h2>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-300 text-slate-500">
                <th className="py-1 font-medium">Material</th>
                <th className="py-1 font-medium">Cortes (largura × metros)</th>
                <th className="py-1 text-right font-medium">Peças</th>
                <th className="py-1 text-right font-medium">Metros</th>
                <th className="py-1 text-right font-medium">Área</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100" style={{ fontVariantNumeric: "tabular-nums" }}>
              {materiais.map((m) => (
                <tr key={m.nome} className="align-top">
                  <td className="py-1 pr-2 font-medium">{m.nome}</td>
                  <td className="py-1 pr-2 text-slate-700">
                    {[...m.cortes.entries()]
                      .sort((a, b) => b[0] - a[0])
                      .map(([cm, metros]) => `${num(cm, 1)} cm × ${num(metros)} m`)
                      .join(" · ") || "—"}
                  </td>
                  <td className="py-1 text-right">{m.pecas}</td>
                  <td className="py-1 text-right">{num(m.metros)} m</td>
                  <td className="py-1 text-right">{num(m.areaM2)} m²</td>
                </tr>
              ))}
            </tbody>
            {materiais.length > 1 && (
              <tfoot style={{ fontVariantNumeric: "tabular-nums" }}>
                <tr className="border-t border-slate-300 font-semibold">
                  <td className="py-1" colSpan={2}>
                    Total
                  </td>
                  <td className="py-1 text-right">{materiais.reduce((s, m) => s + m.pecas, 0)}</td>
                  <td className="py-1 text-right">{num(materiais.reduce((s, m) => s + m.metros, 0))} m</td>
                  <td className="py-1 text-right">{num(materiais.reduce((s, m) => s + m.areaM2, 0))} m²</td>
                </tr>
              </tfoot>
            )}
          </table>
        </section>
      )}

      {outrosItens.length > 0 && (
        <section className="mt-4 break-inside-avoid text-xs">
          <h2 className="mb-1 text-sm font-semibold">Outros itens</h2>
          <ul className="list-inside list-disc text-slate-700">
            {outrosItens.map((item) => (
              <li key={item.id}>
                {nomeItem(item)}
                {item.descricao ? ` — ${item.descricao}` : ""} · {num(Number(item.quantidade))} un
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
