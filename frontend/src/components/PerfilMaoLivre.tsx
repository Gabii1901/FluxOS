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
  return medirCantos(simplificar(pontos, 7), cmPorPx, travarAngulos);
}

/** Medida (0,5 cm) e ângulo de cada trecho entre cantos já definidos. */
function medirCantos(cantos: Ponto[], cmPorPx: number, travarAngulos: boolean) {
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

// Distância (px) em que a ponta de um traço "gruda" numa ponta do desenho.
const DISTANCIA_EMENDA = PX_QUADRADO * 1.5;

const distancia = (a: Ponto, b: Ponto) => Math.hypot(a.x - b.x, a.y - b.y);

/** Cantos do traço já endireitado, na posição em que foi desenhado. */
function cantosDoTraco(traco: Ponto[], cmPorPx: number, travarAngulos: boolean): Ponto[] {
  let { x, y } = traco[0];
  const lista = [{ x, y }];
  for (const s of segmentosDoTraco(traco, cmPorPx, travarAngulos)) {
    const rad = (s.anguloGraus * Math.PI) / 180;
    x += (Math.cos(rad) * s.valorCm) / cmPorPx;
    y -= (Math.sin(rad) * s.valorCm) / cmPorPx;
    lista.push({ x, y });
  }
  return lista;
}

/**
 * Junta os traços num perfil único. Cada traço fica onde foi desenhado e é
 * emendado na ponta do desenho (início ou fim) mais próxima de uma das suas
 * pontas. Perto o bastante, gruda exatamente; longe, uma reta liga os dois.
 */
function montarCadeia(tracos: Ponto[][], cmPorPx: number, travarAngulos: boolean): Ponto[] {
  let cadeia: Ponto[] = [];
  for (const traco of tracos) {
    const pontos = cantosDoTraco(traco, cmPorPx, travarAngulos);
    if (pontos.length < 2) continue;
    if (cadeia.length === 0) {
      cadeia = pontos;
      continue;
    }
    const inicio = cadeia[0];
    const fim = cadeia[cadeia.length - 1];
    const a = pontos[0];
    const b = pontos[pontos.length - 1];
    const opcoes = [
      { d: distancia(a, fim), noFim: true, inverter: false },
      { d: distancia(b, fim), noFim: true, inverter: true },
      { d: distancia(b, inicio), noFim: false, inverter: false },
      { d: distancia(a, inicio), noFim: false, inverter: true },
    ].sort((x, y) => x.d - y.d);
    const melhor = opcoes[0];
    const orientado = melhor.inverter ? [...pontos].reverse() : pontos;
    const grudar = melhor.d <= DISTANCIA_EMENDA;

    if (melhor.noFim) {
      // A primeira ponta do traço encosta no fim do desenho.
      const dx = grudar ? fim.x - orientado[0].x : 0;
      const dy = grudar ? fim.y - orientado[0].y : 0;
      const movido = orientado.map((p) => ({ x: p.x + dx, y: p.y + dy }));
      cadeia = [...cadeia, ...(grudar ? movido.slice(1) : movido)];
    } else {
      // A última ponta do traço encosta no início do desenho.
      const ultimo = orientado[orientado.length - 1];
      const dx = grudar ? inicio.x - ultimo.x : 0;
      const dy = grudar ? inicio.y - ultimo.y : 0;
      const movido = orientado.map((p) => ({ x: p.x + dx, y: p.y + dy }));
      cadeia = [...(grudar ? movido.slice(0, -1) : movido), ...cadeia];
    }
  }
  return cadeia;
}

function segmentosDaCadeia(cadeia: Ponto[], cmPorPx: number, travarAngulos: boolean): SegmentoPerfil[] {
  const segmentos: SegmentoPerfil[] = [];
  for (const s of medirCantos(cadeia, cmPorPx, travarAngulos)) {
    const anterior = segmentos[segmentos.length - 1];
    if (anterior && anterior.anguloGraus === s.anguloGraus) anterior.valorCm += s.valorCm;
    else segmentos.push({ nome: `Segmento ${segmentos.length + 1}`, ...s });
  }
  return segmentos;
}

/**
 * Área quadriculada para traçar o perfil da calha com mouse, dedo ou caneta.
 * Pode desenhar em vários traços, em qualquer ponto: cada um é endireitado, fica
 * onde foi desenhado e se emenda na ponta verde mais próxima. Desfazer remove o último traço.
 */
export function PerfilMaoLivre({ onSegmentos }: { onSegmentos: (segmentos: SegmentoPerfil[]) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tracos, setTracos] = useState<Ponto[][]>([]);
  const [atual, setAtual] = useState<Ponto[] | null>(null);
  const [cmPorQuadrado, setCmPorQuadrado] = useState(2);
  const [travarAngulos, setTravarAngulos] = useState(true);

  const cmPorPx = cmPorQuadrado / PX_QUADRADO;
  const cadeia = useMemo(() => montarCadeia(tracos, cmPorPx, travarAngulos), [tracos, cmPorPx, travarAngulos]);
  const segmentos = useMemo(() => segmentosDaCadeia(cadeia, cmPorPx, travarAngulos), [cadeia, cmPorPx, travarAngulos]);

  // Pontos do perfil final (com medidas arredondadas), partindo do início da cadeia.
  const cantos = useMemo(() => {
    if (cadeia.length === 0) return [];
    let { x, y } = cadeia[0];
    const lista = [{ x, y }];
    for (const s of segmentos) {
      const rad = ((s.anguloGraus ?? 0) * Math.PI) / 180;
      x += (Math.cos(rad) * s.valorCm) / cmPorPx;
      y -= (Math.sin(rad) * s.valorCm) / cmPorPx;
      lista.push({ x, y });
    }
    return lista;
  }, [cadeia, segmentos, cmPorPx]);

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

    // As duas pontas livres, onde um traço novo pode grudar
    if (cantos.length > 1) {
      ctx.fillStyle = "#16a34a";
      [cantos[0], cantos[cantos.length - 1]].forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Traço sendo feito agora, exatamente onde o dedo está
    if (atual && atual.length > 0) {
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 3;
      ctx.beginPath();
      atual.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
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
        onPointerMove={(e) => {
          if (!atual) return;
          // Lê a posição já aqui: o evento não existe mais quando o React aplica o setState.
          const p = ponto(e);
          setAtual((t) => (t ? [...t, p] : t));
        }}
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
            ? "Desenhe em qualquer ponto. Pode tirar o dedo e continuar: perto de uma ponta verde, o traço gruda nela."
            : `${tracos.length} ${tracos.length === 1 ? "traço" : "traços"} · comece perto de uma ponta verde para emendar.`}
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
