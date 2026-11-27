import { useState } from "react";
import { api } from "../lib/api";
import type { DesenhoPerfil, SegmentoPerfil } from "../types/calha";
import { PerfilCalhaDesenho } from "./PerfilCalhaDesenho";
import { PerfilMaoLivre } from "./PerfilMaoLivre";
import { QuadroCroqui } from "./QuadroCroqui";

const DIRECOES: { graus: number; seta: string }[] = [
  { graus: 0, seta: "→" },
  { graus: 45, seta: "↗" },
  { graus: 90, seta: "↑" },
  { graus: 135, seta: "↖" },
  { graus: 180, seta: "←" },
  { graus: 225, seta: "↙" },
  { graus: 270, seta: "↓" },
  { graus: 315, seta: "↘" },
];

type Aba = "mao" | "medidas" | "croqui";

export interface ResultadoDesenhos {
  /** null quando o desenho principal não foi mexido (corte e preço ficam como estão). */
  principal: SegmentoPerfil[] | null;
  extras: DesenhoPerfil[];
  croquis: string[];
}

const chip = (ativo: boolean) =>
  `rounded-full border px-3 py-1 text-xs font-medium ${
    ativo ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-600 hover:border-slate-900"
  }`;

/**
 * Janela de desenho de um item: vários desenhos de perfil (o 1º é o principal,
 * que define o corte da chapa) e vários croquis livres.
 */
export function PerfilCalhaEditor({
  segmentosIniciais,
  extrasIniciais = [],
  croquisIniciais = [],
  nomeInicial,
  onUsar,
  onFechar,
}: {
  segmentosIniciais: SegmentoPerfil[];
  extrasIniciais?: DesenhoPerfil[];
  croquisIniciais?: string[];
  nomeInicial?: string;
  onUsar: (resultado: ResultadoDesenhos) => void;
  onFechar: () => void;
}) {
  const [desenhos, setDesenhos] = useState<DesenhoPerfil[]>(() => [
    {
      nome: "Principal",
      segmentos: segmentosIniciais.map((s) => ({ ...s, anguloGraus: s.anguloGraus ?? 0 })),
    },
    ...extrasIniciais.map((d) => ({ ...d, segmentos: d.segmentos.map((s) => ({ ...s, anguloGraus: s.anguloGraus ?? 0 })) })),
  ]);
  const [ativo, setAtivo] = useState(0);
  const [croquis, setCroquis] = useState<(string | null)[]>(croquisIniciais.length ? croquisIniciais : [null]);
  const [croquiAtivo, setCroquiAtivo] = useState(0);
  // Muda a chave do quadro para remontá-lo ao trocar/remover croqui.
  const [versaoCroqui, setVersaoCroqui] = useState(0);
  const [principalAlterado, setPrincipalAlterado] = useState(false);
  const [aba, setAba] = useState<Aba>(segmentosIniciais.length === 0 ? "mao" : "medidas");
  const [salvando, setSalvando] = useState(false);

  const segmentos = desenhos[ativo]?.segmentos ?? [];
  const totalCm = segmentos.reduce((soma, s) => soma + s.valorCm, 0);

  function definirSegmentos(novos: SegmentoPerfil[] | ((atual: SegmentoPerfil[]) => SegmentoPerfil[])) {
    if (ativo === 0) setPrincipalAlterado(true);
    setDesenhos((lista) =>
      lista.map((d, i) => (i === ativo ? { ...d, segmentos: typeof novos === "function" ? novos(d.segmentos) : novos } : d)),
    );
  }

  function atualizarSegmento(indice: number, mudanca: Partial<SegmentoPerfil>) {
    definirSegmentos((atual) => atual.map((s, i) => (i === indice ? { ...s, ...mudanca } : s)));
  }

  function adicionarSegmento() {
    const anterior = segmentos[segmentos.length - 1];
    const proximoAngulo = anterior ? ((anterior.anguloGraus ?? 0) + 270) % 360 : 90;
    definirSegmentos((atual) => [...atual, { nome: `Segmento ${atual.length + 1}`, valorCm: 5, anguloGraus: proximoAngulo }]);
  }

  function novoDesenho() {
    setDesenhos((lista) => [...lista, { nome: `Desenho ${lista.length + 1}`, segmentos: [] }]);
    setAtivo(desenhos.length);
    setAba("mao");
  }

  function removerDesenho() {
    if (ativo === 0) return;
    if (!window.confirm(`Remover "${desenhos[ativo].nome}"?`)) return;
    setDesenhos((lista) => lista.filter((_, i) => i !== ativo));
    setAtivo(0);
  }

  function novoCroqui() {
    setCroquis((lista) => [...lista, null]);
    setCroquiAtivo(croquis.length);
    setVersaoCroqui((v) => v + 1);
  }

  function removerCroqui() {
    if (!window.confirm(`Remover o croqui ${croquiAtivo + 1}?`)) return;
    setCroquis((lista) => {
      const restante = lista.filter((_, i) => i !== croquiAtivo);
      return restante.length ? restante : [null];
    });
    setCroquiAtivo(0);
    setVersaoCroqui((v) => v + 1);
  }

  function usar() {
    onUsar({
      principal: principalAlterado ? desenhos[0].segmentos : null,
      extras: desenhos.slice(1).filter((d) => d.segmentos.length > 0),
      croquis: croquis.filter((c): c is string => !!c),
    });
  }

  async function handleSalvarComoModelo() {
    if (segmentos.length === 0) return window.alert("Desenhe o perfil antes de salvar como modelo.");
    const nome = window.prompt("Nome do modelo:", ativo === 0 ? nomeInicial ?? "" : desenhos[ativo].nome);
    if (!nome) return;
    setSalvando(true);
    try {
      await api.post("/calhas/perfis", { nome, segmentos });
      window.alert("Modelo salvo.");
    } finally {
      setSalvando(false);
    }
  }

  const qtdCroquis = croquis.filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 sm:px-4 sm:py-8">
      <div className="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-white sm:h-auto sm:max-h-full sm:rounded-2xl sm:shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Desenhos da peça</p>
            <p className="text-xs text-slate-500">{nomeInicial ?? "Perfil personalizado"}</p>
          </div>
          <button type="button" onClick={onFechar} className="text-slate-400 hover:text-slate-900" aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="mb-4 grid grid-cols-3 rounded-lg bg-slate-100 p-1 text-sm">
            {(
              [
                { id: "mao", label: "À mão" },
                { id: "medidas", label: "Medidas" },
                { id: "croqui", label: `Croquis${qtdCroquis ? ` (${qtdCroquis})` : ""}` },
              ] as { id: Aba; label: string }[]
            ).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAba(a.id)}
                className={`rounded-md px-2 py-1.5 font-medium ${
                  aba === a.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          {aba !== "croqui" ? (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                {desenhos.map((d, i) => (
                  <button key={i} type="button" onClick={() => setAtivo(i)} className={chip(ativo === i)}>
                    {i === 0 ? "Principal" : d.nome}
                    {d.segmentos.length > 0 && <span className="ml-1 opacity-60">{d.segmentos.length}</span>}
                  </button>
                ))}
                <button type="button" onClick={novoDesenho} className={chip(false)}>
                  + Novo desenho
                </button>
                {ativo > 0 && (
                  <>
                    <input
                      value={desenhos[ativo].nome}
                      onChange={(e) =>
                        setDesenhos((lista) => lista.map((d, i) => (i === ativo ? { ...d, nome: e.target.value } : d)))
                      }
                      className="ml-auto w-36 rounded-md border border-slate-300 px-2 py-1 text-xs"
                      aria-label="Nome do desenho"
                    />
                    <button type="button" onClick={removerDesenho} className="text-xs font-medium text-red-700 hover:underline">
                      Remover
                    </button>
                  </>
                )}
              </div>
              {ativo === 0 ? (
                <p className="mb-3 text-xs text-slate-500">O desenho principal define o corte da chapa e o preço do item.</p>
              ) : (
                <p className="mb-3 text-xs text-slate-500">Desenho complementar: sai na impressão e na folha de produção.</p>
              )}

              {aba === "mao" && (
                <div className="mb-4">
                  <PerfilMaoLivre key={ativo} onSegmentos={definirSegmentos} />
                </div>
              )}

              {aba === "medidas" && (
                <div className="mb-4 flex items-center justify-center rounded-lg border border-slate-100 bg-slate-50 py-4">
                  {segmentos.length > 0 ? (
                    <PerfilCalhaDesenho segmentos={segmentos} />
                  ) : (
                    <p className="py-10 text-sm text-slate-400">Sem desenho ainda.</p>
                  )}
                </div>
              )}

              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Medidas dos segmentos</p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  Total: {totalCm.toFixed(1)} cm
                </span>
              </div>

              <div className="space-y-3">
                {segmentos.map((seg, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <input
                        value={seg.nome}
                        onChange={(e) => atualizarSegmento(i, { nome: e.target.value })}
                        className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-sm font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => definirSegmentos((atual) => atual.filter((_, j) => j !== i))}
                        className="text-xs font-medium text-red-700 hover:underline"
                      >
                        Remover
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => atualizarSegmento(i, { valorCm: Math.max(0, Math.round((seg.valorCm - 0.1) * 10) / 10) })}
                          className="h-8 w-8 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100"
                        >
                          −
                        </button>
                        <input
                          value={seg.valorCm}
                          onChange={(e) => atualizarSegmento(i, { valorCm: Number(e.target.value.replace(",", ".")) || 0 })}
                          className="w-16 rounded-md border border-slate-200 px-2 py-1 text-center text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => atualizarSegmento(i, { valorCm: Math.round((seg.valorCm + 0.1) * 10) / 10 })}
                          className="h-8 w-8 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100"
                        >
                          +
                        </button>
                        <span className="text-xs text-slate-400">cm</span>
                      </div>

                      <div className="flex flex-1 flex-wrap justify-end gap-1">
                        {DIRECOES.map((dir) => (
                          <button
                            key={dir.graus}
                            type="button"
                            onClick={() => atualizarSegmento(i, { anguloGraus: dir.graus })}
                            className={`h-8 w-8 rounded-md border text-sm ${
                              (seg.anguloGraus ?? 0) === dir.graus
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-200 text-slate-500 hover:border-slate-400"
                            }`}
                          >
                            {dir.seta}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={adicionarSegmento}
                className="mt-3 w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700"
              >
                + Adicionar segmento
              </button>
            </>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                {croquis.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setCroquiAtivo(i);
                      setVersaoCroqui((v) => v + 1);
                    }}
                    className={chip(croquiAtivo === i)}
                  >
                    Croqui {i + 1}
                    {!c && <span className="ml-1 opacity-60">vazio</span>}
                  </button>
                ))}
                <button type="button" onClick={novoCroqui} className={chip(false)}>
                  + Novo croqui
                </button>
                {croquis[croquiAtivo] && (
                  <button type="button" onClick={removerCroqui} className="ml-auto text-xs font-medium text-red-700 hover:underline">
                    Remover croqui
                  </button>
                )}
              </div>
              <p className="mb-2 text-xs text-slate-500">
                Desenho livre: caimento, sentido da água, peças fora do padrão. Sai junto no orçamento.
              </p>
              <QuadroCroqui
                key={`${croquiAtivo}-${versaoCroqui}`}
                embutido
                imagemInicial={croquis[croquiAtivo]}
                onChange={(img) => setCroquis((lista) => lista.map((c, i) => (i === croquiAtivo ? img : c)))}
              />
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={handleSalvarComoModelo}
            disabled={salvando || aba === "croqui"}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40"
          >
            {salvando ? "Salvando..." : "Salvar desenho como modelo"}
          </button>
          <button
            type="button"
            onClick={usar}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Usar estes desenhos
          </button>
        </div>
      </div>
    </div>
  );
}
