import { useMemo } from "react";
import type { SegmentoPerfil } from "../types/calha";

const LARGURA_DESENHO = 420;
const ALTURA_DESENHO = 260;
const MARGEM_DESENHO = 40;
const MAX_PX_POR_CM = 14;

// Pontos em cm (y para cima); a escala é aplicada depois para o desenho sempre caber na área.
function pontosEmCm(segmentos: SegmentoPerfil[]) {
  let x = 0;
  let y = 0;
  const lista: { x: number; y: number }[] = [{ x, y }];
  for (const seg of segmentos) {
    const rad = ((seg.anguloGraus ?? 0) * Math.PI) / 180;
    x += Math.cos(rad) * seg.valorCm;
    y -= Math.sin(rad) * seg.valorCm;
    lista.push({ x, y });
  }
  return lista;
}

export function PerfilCalhaDesenho({ segmentos, className }: { segmentos: SegmentoPerfil[]; className?: string }) {
  const pts = useMemo(() => {
    const brutos = pontosEmCm(segmentos);
    const xs = brutos.map((p) => p.x);
    const ys = brutos.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const larguraCm = Math.max(...xs) - minX;
    const alturaCm = Math.max(...ys) - minY;
    const escala = Math.min(
      larguraCm > 0 ? (LARGURA_DESENHO - MARGEM_DESENHO * 2) / larguraCm : MAX_PX_POR_CM,
      alturaCm > 0 ? (ALTURA_DESENHO - MARGEM_DESENHO * 2) / alturaCm : MAX_PX_POR_CM,
      MAX_PX_POR_CM,
    );
    const sobraX = (LARGURA_DESENHO - larguraCm * escala) / 2;
    const sobraY = (ALTURA_DESENHO - alturaCm * escala) / 2;
    return brutos.map((p) => ({ x: (p.x - minX) * escala + sobraX, y: (p.y - minY) * escala + sobraY }));
  }, [segmentos]);

  return (
    <svg width="100%" viewBox={`0 0 ${LARGURA_DESENHO} ${ALTURA_DESENHO}`} className={className ?? "max-w-[420px]"}>
      {segmentos.map((_, i) => (
        <line key={i} x1={pts[i].x} y1={pts[i].y} x2={pts[i + 1].x} y2={pts[i + 1].y} stroke="#2563eb" strokeWidth={3} strokeLinecap="round" />
      ))}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="white" stroke="#2563eb" strokeWidth={2} />
      ))}
      {segmentos.map((seg, i) => {
        const a = pts[i];
        const b = pts[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const comprimento = Math.hypot(dx, dy) || 1;
        // Etiqueta afastada da linha, na perpendicular, para não cobrir o traço nem as juntas.
        const cx = (a.x + b.x) / 2 + (-dy / comprimento) * 16;
        const cy = (a.y + b.y) / 2 + (dx / comprimento) * 16;
        const texto = `${seg.valorCm}cm`;
        const larguraEtiqueta = texto.length * 6 + 8;
        return (
          <g key={i}>
            <rect x={cx - larguraEtiqueta / 2} y={cy - 8} width={larguraEtiqueta} height={16} fill="#0f172a" rx={3} />
            <text x={cx} y={cy + 3.5} fontSize={10} fill="white" textAnchor="middle">
              {texto}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
