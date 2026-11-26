import { useEffect, useRef, useState, type PointerEvent } from "react";

type Ferramenta = "caneta" | "reta" | "seta" | "texto";

type Traco =
  | { tipo: "caneta"; cor: string; espessura: number; pontos: { x: number; y: number }[] }
  | { tipo: "reta" | "seta"; cor: string; espessura: number; de: { x: number; y: number }; ate: { x: number; y: number } }
  | { tipo: "texto"; cor: string; espessura: number; em: { x: number; y: number }; texto: string };

const LARGURA = 900;
const ALTURA = 560;
const CORES = [
  { valor: "#0f172a", nome: "Preto" },
  { valor: "#2563eb", nome: "Azul" },
  { valor: "#dc2626", nome: "Vermelho" },
];
const FERRAMENTAS: { id: Ferramenta; label: string }[] = [
  { id: "caneta", label: "Caneta" },
  { id: "reta", label: "Linha reta" },
  { id: "seta", label: "Seta" },
  { id: "texto", label: "Texto" },
];

function desenharTraco(ctx: CanvasRenderingContext2D, t: Traco) {
  ctx.strokeStyle = t.cor;
  ctx.fillStyle = t.cor;
  ctx.lineWidth = t.espessura;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (t.tipo === "caneta") {
    ctx.beginPath();
    t.pontos.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    if (t.pontos.length === 1) ctx.lineTo(t.pontos[0].x + 0.1, t.pontos[0].y + 0.1);
    ctx.stroke();
  } else if (t.tipo === "reta" || t.tipo === "seta") {
    ctx.beginPath();
    ctx.moveTo(t.de.x, t.de.y);
    ctx.lineTo(t.ate.x, t.ate.y);
    ctx.stroke();
    if (t.tipo === "seta") {
      const ang = Math.atan2(t.ate.y - t.de.y, t.ate.x - t.de.x);
      const tam = 10 + t.espessura * 3;
      ctx.beginPath();
      ctx.moveTo(t.ate.x, t.ate.y);
      ctx.lineTo(t.ate.x - tam * Math.cos(ang - 0.45), t.ate.y - tam * Math.sin(ang - 0.45));
      ctx.lineTo(t.ate.x - tam * Math.cos(ang + 0.45), t.ate.y - tam * Math.sin(ang + 0.45));
      ctx.closePath();
      ctx.fill();
    }
  } else if (t.tipo === "texto") {
    ctx.font = `${14 + t.espessura * 3}px system-ui, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(t.texto, t.em.x, t.em.y);
  }
}

/**
 * Quadro para croqui à mão livre (caimento, peças fora do padrão, observações).
 * Funciona com mouse, dedo ou caneta. Exporta PNG com fundo branco.
 */
export function QuadroCroqui({
  imagemInicial,
  onSalvar,
  onFechar,
  titulo = "Croqui",
}: {
  imagemInicial?: string | null;
  onSalvar: (imagem: string | null) => void;
  onFechar: () => void;
  titulo?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fundoRef = useRef<HTMLImageElement | null>(null);
  const [tracos, setTracos] = useState<Traco[]>([]);
  const [emAndamento, setEmAndamento] = useState<Traco | null>(null);
  const [ferramenta, setFerramenta] = useState<Ferramenta>("caneta");
  const [cor, setCor] = useState(CORES[0].valor);
  const [grossa, setGrossa] = useState(false);
  const [temFundo, setTemFundo] = useState(false);

  useEffect(() => {
    if (!imagemInicial) return;
    const img = new Image();
    img.onload = () => {
      fundoRef.current = img;
      setTemFundo(true);
    };
    img.src = imagemInicial;
  }, [imagemInicial]);

  useEffect(() => {
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.clearRect(0, 0, LARGURA, ALTURA);
    if (temFundo && fundoRef.current) ctx.drawImage(fundoRef.current, 0, 0, LARGURA, ALTURA);
    [...tracos, ...(emAndamento ? [emAndamento] : [])].forEach((t) => desenharTraco(ctx, t));
  }, [tracos, emAndamento, temFundo]);

  const espessura = grossa ? 5 : 2.5;

  function ponto(e: PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * LARGURA, y: ((e.clientY - r.top) / r.height) * ALTURA };
  }

  function iniciar(e: PointerEvent<HTMLCanvasElement>) {
    const p = ponto(e);
    if (ferramenta === "texto") {
      const texto = window.prompt("Texto:");
      if (texto?.trim()) setTracos((t) => [...t, { tipo: "texto", cor, espessura, em: p, texto: texto.trim() }]);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setEmAndamento(
      ferramenta === "caneta"
        ? { tipo: "caneta", cor, espessura, pontos: [p] }
        : { tipo: ferramenta, cor, espessura, de: p, ate: p },
    );
  }

  function mover(e: PointerEvent<HTMLCanvasElement>) {
    if (!emAndamento) return;
    const p = ponto(e);
    setEmAndamento((t) =>
      !t ? t : t.tipo === "caneta" ? { ...t, pontos: [...t.pontos, p] } : t.tipo === "texto" ? t : { ...t, ate: p },
    );
  }

  function terminar() {
    if (!emAndamento) return;
    setTracos((t) => [...t, emAndamento]);
    setEmAndamento(null);
  }

  function limpar() {
    if (!window.confirm("Apagar todo o desenho?")) return;
    setTracos([]);
    setTemFundo(false);
  }

  function salvar() {
    if (tracos.length === 0 && !temFundo) return onSalvar(null);
    const saida = document.createElement("canvas");
    saida.width = LARGURA;
    saida.height = ALTURA;
    const ctx = saida.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, LARGURA, ALTURA);
    ctx.drawImage(canvasRef.current!, 0, 0);
    onSalvar(saida.toDataURL("image/png"));
  }

  const botao = (ativo: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${ativo ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-6">
      <div className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{titulo}</p>
            <p className="text-xs text-slate-500">Desenhe o caimento, peças fora do padrão ou qualquer detalhe.</p>
          </div>
          <button type="button" onClick={onFechar} className="text-slate-400 hover:text-slate-900" aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-100 px-5 py-2">
          <div className="flex gap-1">
            {FERRAMENTAS.map((f) => (
              <button key={f.id} type="button" onClick={() => setFerramenta(f.id)} className={botao(ferramenta === f.id)}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {CORES.map((c) => (
              <button
                key={c.valor}
                type="button"
                title={c.nome}
                aria-label={c.nome}
                onClick={() => setCor(c.valor)}
                className={`h-7 w-7 rounded-full border-2 ${cor === c.valor ? "border-slate-900" : "border-transparent"}`}
              >
                <span className="block h-full w-full rounded-full border-2 border-white" style={{ background: c.valor }} />
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <button type="button" onClick={() => setGrossa(false)} className={botao(!grossa)}>
              Fina
            </button>
            <button type="button" onClick={() => setGrossa(true)} className={botao(grossa)}>
              Grossa
            </button>
          </div>
          <div className="ml-auto flex gap-1">
            <button
              type="button"
              onClick={() => setTracos((t) => t.slice(0, -1))}
              disabled={tracos.length === 0}
              className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            >
              Desfazer
            </button>
            <button type="button" onClick={limpar} className="rounded-md px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">
              Limpar
            </button>
          </div>
        </div>

        <div className="overflow-auto bg-slate-50 p-3 sm:p-5">
          <canvas
            ref={canvasRef}
            width={LARGURA}
            height={ALTURA}
            onPointerDown={iniciar}
            onPointerMove={mover}
            onPointerUp={terminar}
            onPointerCancel={terminar}
            className={`w-full touch-none rounded-lg border border-slate-200 bg-white ${ferramenta === "texto" ? "cursor-text" : "cursor-crosshair"}`}
            style={{
              aspectRatio: `${LARGURA} / ${ALTURA}`,
              backgroundImage:
                "linear-gradient(#eef2f6 1px, transparent 1px), linear-gradient(90deg, #eef2f6 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onFechar} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Cancelar
          </button>
          <button type="button" onClick={salvar} className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Salvar croqui
          </button>
        </div>
      </div>
    </div>
  );
}
