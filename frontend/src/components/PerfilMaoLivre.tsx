import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import type { SegmentoPerfil } from "../types/calha";

const LARGURA = 480;
const ALTURA = 320;
const PX_QUADRADO = 24;
const ESCALAS = [1, 2, 5]; // cm por quadrado

type Ponto = { x: number; y: number };

// Ramer–Douglas–Peucker: reduz o traço tremido aos cantos principais.
function simplificar(pontos: Ponto[], tolerancia: number): Ponto[] {
  if (pontos.length < 3) return pontos;
  const [a, b] = [pontos[0], pontos[pontos.length - 1]];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const comp = Math.hypot(dx, dy) || 1;
  let maior = 0;
  let indice = 0;
  for (let i = 1; i < pontos.length - 1; i++) {
    const d = Math.abs(dy * pontos[i].x - dx * pontos[i].y + b.x * a.y - b.y * a.x) / comp;
    if (d > maior) {
      maior = d;
      indice = i;
    }
  }
  if (maior <= tolerancia) return [a, b];
  return [...simplificar(pontos.slice(0, indice + 1), tolerancia).slice(0, -1), ...simplificar(pontos.slice(indice), tolerancia)];
}

function segmentosDoTraco(pontos: Ponto[], cmPorPx: number, travarAngulos: boolean) {
  const cantos = simplificar(pontos, 7);
  const lista: { valorCm: number; anguloGraus: number }[] = [];
  for (let i = 1; i < cantos.length; i++) {
    const dx = cantos[i].x - cantos[i - 1].x;
    const dy = cantos[i].y - cantos[i - 1].y;
    const cm = Math.round(Math.hypot(dx, dy) * cmPorPx * 2) / 2; // 0,5 cm
    if (cm < 0.5) continue;
    let graus = (Math.atan2(-dy, dx) * 180) / Math.PI;
    graus = travarAngulos ? Math.round(graus / 15) * 15 : Math.round(graus);
    lista.push({ valorCm: cm, anguloGraus: ((graus % 360) + 360) % 360 });
  }
  return lista;
}

/** Junta os traços em um único perfil: cada traço continua de onde o anterior terminou. */
function juntarTracos(tracos: Ponto[][], cmPorPx: number, travarAngulos: boolean): SegmentoPerfil[] {
  const segmentos: SegmentoPerfil[] = [];
  for (const traco of tracos) {
    for (const s of segmentosDoTraco(traco, cmPorPx, travarAngulos)) {
      const anterior = segmentos[segmentos.length - 1];
      if (anterior && anterior.anguloGraus === s.anguloGraus) anterior.valorCm += s.valorCm;
      else segmentos.push({ nome: `Segmento ${segmentos.length + 1}`, ...s });
    }
  }
  return segmentos;
}

/**
 * Área quadriculada para traçar o perfil da calha com mouse, dedo ou caneta.
 * Pode desenhar em vários traços: cada um é endireitado em segmentos e emendado
 * no final do anterior (ponto verde). Desfazer remove o último traço.
 */
export function PerfilMaoLivre({ onSegmentos }: { onSegmentos: (segmentos: SegmentoPerfil[]) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tracos, setTracos] = useState<Ponto[][]>([]);
  const [atual, setAtual] = useState<Ponto[] | null>(null);
  const [cmPorQuadrado, setCmPorQuadrado] = useState(2);
  const [travarAngulos, setTravarAngulos] = useState(true);

  const cmPorPx = cmPorQuadrado / PX_QUADRADO;
  const segmentos = useMemo(() => juntarTracos(tracos, cmPorPx, travarAngulos), [tracos, cmPorPx, travarAngulos]);

  // Pontos do perfil endireitado, a partir do início do primeiro traço.
  const cantos = useMemo(() => {
    if (tracos.length === 0) return [];
    let { x, y } = tracos[0][0];
    const lista = [{ x, y }];
    for (const s of segmentos) {
      const rad = ((s.anguloGraus ?? 0) * Math.PI) / 180;
      x += (Math.cos(rad) * s.valorCm) / cmPorPx;
      y -= (Math.sin(rad) * s.valorCm) / cmPorPx;
      lista.push({ x, y });
    }
    return lista;
  }, [tracos, segmentos, cmPorPx]);

  // Não mexe nos segmentos existentes só por abrir a aba; depois do 1º traço, acompanha tudo.
  const jaDesenhou = useRef(false);
  useEffect(() => {
    if (tracos.length > 0) jaDesenhou.current = true;
    if (jaDesenhou.current) onSegmentos(segmentos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentos]);

  useEffect(() => {
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.clearRect(0, 0, LARGURA, ALTURA);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Perfil endireitado
    if (cantos.length > 1) {
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 3;
      ctx.beginPath();
      cantos.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      cantos.slice(0, -1).forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    // Ponto de onde o próximo traço continua
    const fim = cantos[cantos.length - 1];
    if (fim) {
      ctx.fillStyle = "#16a34a";
      ctx.beginPath();
      ctx.arc(fim.x, fim.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Traço sendo feito agora, emendado no ponto verde
    if (atual && atual.length > 0) {
      const dx = fim ? fim.x - atual[0].x : 0;
      const dy = fim ? fim.y - atual[0].y : 0;
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 3;
      ctx.beginPath();
      atual.forEach((p, i) => (i ? ctx.lineTo(p.x + dx, p.y + dy) : ctx.moveTo(p.x + dx, p.y + dy)));
      ctx.stroke();
    }
  }, [cantos, atual]);

  function ponto(e: PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * LARGURA, y: ((e.clientY - r.top) / r.height) * ALTURA };
  }

  function terminar() {
    if (!atual) return;
    if (segmentosDoTraco(atual, cmPorPx, travarAngulos).length > 0) setTracos((t) => [...t, atual]);
    setAtual(null);
  }

  function apagarTudo() {
    setTracos([]);
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
        <label className="flex items-center gap-1.5">
          Cada quadrado =
          <select
            value={cmPorQuadrado}
            onChange={(e) => setCmPorQuadrado(Number(e.target.value))}
            className="rounded border border-slate-300 px-1.5 py-0.5"
          >
            {ESCALAS.map((cm) => (
              <option key={cm} value={cm}>
                {cm} cm
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={travarAngulos} onChange={(e) => setTravarAngulos(e.target.checked)} />
          Ajustar ângulos de 15 em 15°
        </label>
      </div>
      <canvas
        ref={canvasRef}
        width={LARGURA}
        height={ALTURA}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setAtual([ponto(e)]);
        }}
        onPointerMove={(e) => atual && setAtual((t) => (t ? [...t, ponto(e)] : t))}
        onPointerUp={terminar}
        onPointerCancel={terminar}
        className="w-full cursor-crosshair touch-none rounded-lg border border-slate-200 bg-white"
        style={{
          aspectRatio: `${LARGURA} / ${ALTURA}`,
          backgroundImage:
            "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
          backgroundSize: `${(PX_QUADRADO / LARGURA) * 100}% ${(PX_QUADRADO / ALTURA) * 100}%`,
        }}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {tracos.length === 0
            ? "Desenhe o perfil. Pode tirar o dedo e continuar: o próximo traço emenda no ponto verde."
            : `${tracos.length} ${tracos.length === 1 ? "traço" : "traços"} · o próximo continua do ponto verde.`}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setTracos((t) => t.slice(0, -1))}
            disabled={tracos.length === 0}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            Desfazer último traço
          </button>
          <button
            type="button"
            onClick={apagarTudo}
            disabled={tracos.length === 0}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
          >
            Apagar tudo
          </button>
        </div>
      </div>
    </div>
  );
}
