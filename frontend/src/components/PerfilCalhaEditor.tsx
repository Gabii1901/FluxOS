import { useState } from "react";
import { api } from "../lib/api";
import type { SegmentoPerfil } from "../types/calha";
import { PerfilCalhaDesenho } from "./PerfilCalhaDesenho";

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

export function PerfilCalhaEditor({
  segmentosIniciais,
  nomeInicial,
  onUsar,
  onFechar,
}: {
  segmentosIniciais: SegmentoPerfil[];
  nomeInicial?: string;
  onUsar: (segmentos: SegmentoPerfil[]) => void;
  onFechar: () => void;
}) {
  const [segmentos, setSegmentos] = useState<SegmentoPerfil[]>(
    segmentosIniciais.length > 0
      ? segmentosIniciais.map((s) => ({ ...s, anguloGraus: s.anguloGraus ?? 0 }))
      : [{ nome: "Segmento 1", valorCm: 10, anguloGraus: 90 }],
  );
  const [salvando, setSalvando] = useState(false);

  const totalCm = segmentos.reduce((soma, s) => soma + s.valorCm, 0);

  function atualizarSegmento(indice: number, mudanca: Partial<SegmentoPerfil>) {
    setSegmentos((atual) => atual.map((s, i) => (i === indice ? { ...s, ...mudanca } : s)));
  }

  function removerSegmento(indice: number) {
    setSegmentos((atual) => atual.filter((_, i) => i !== indice));
  }

  function adicionarSegmento() {
    const anterior = segmentos[segmentos.length - 1];
    const proximoAngulo = anterior ? ((anterior.anguloGraus ?? 0) + 270) % 360 : 90;
    setSegmentos((atual) => [...atual, { nome: `Segmento ${atual.length + 1}`, valorCm: 5, anguloGraus: proximoAngulo }]);
  }

  async function handleSalvarComoModelo() {
    const nome = window.prompt("Nome do modelo:", nomeInicial ?? "");
    if (!nome) return;
    setSalvando(true);
    try {
      await api.post("/calhas/perfis", { nome, segmentos });
      onUsar(segmentos);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8">
      <div className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Formato</p>
            <p className="text-xs text-slate-500">{nomeInicial ?? "Perfil personalizado"}</p>
          </div>
          <button type="button" onClick={onFechar} className="text-slate-400 hover:text-slate-900">✕</button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <div className="mb-4 flex items-center justify-center rounded-lg border border-slate-100 bg-slate-50 py-4">
            <PerfilCalhaDesenho segmentos={segmentos} />
          </div>

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
                  <button type="button" onClick={() => removerSegmento(i)} className="text-xs font-medium text-red-700 hover:underline">
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
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={handleSalvarComoModelo}
            disabled={salvando}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Salvar como modelo"}
          </button>
          <button
            type="button"
            onClick={() => onUsar(segmentos)}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Usar este formato
          </button>
        </div>
      </div>
    </div>
  );
}
