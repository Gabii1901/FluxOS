import { useEffect, useRef, useState, type PointerEvent } from "react";

/**
 * Área para desenhar a assinatura com mouse, dedo ou caneta. Devolve um PNG
 * (data URL) com fundo transparente, recortado nas bordas do traço.
 */
export function QuadroAssinatura({ onChange }: { onChange: (imagem: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const [vazio, setVazio] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const escala = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * escala;
    canvas.height = canvas.offsetHeight * escala;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(escala, escala);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  }, []);

  function ponto(e: PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function iniciar(e: PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    desenhando.current = true;
    const ctx = e.currentTarget.getContext("2d")!;
    const { x, y } = ponto(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  }

  function mover(e: PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const { x, y } = ponto(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function terminar() {
    if (!desenhando.current) return;
    desenhando.current = false;
    setVazio(false);
    onChange(exportarRecortado(canvasRef.current!));
  }

  function limpar() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setVazio(true);
    onChange(null);
  }

  return (
    <div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          onPointerDown={iniciar}
          onPointerMove={mover}
          onPointerUp={terminar}
          onPointerLeave={terminar}
          className="h-40 w-full touch-none rounded-lg border border-slate-300 bg-white"
        />
        {vazio && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            Assine aqui
          </span>
        )}
        <div className="pointer-events-none absolute inset-x-8 bottom-8 border-b border-slate-200" />
      </div>
      <button type="button" onClick={limpar} className="mt-2 text-xs font-medium text-slate-600 hover:underline">
        Limpar
      </button>
    </div>
  );
}

function exportarRecortado(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  const pixels = ctx.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const margem = 8;
  minX = Math.max(0, minX - margem);
  minY = Math.max(0, minY - margem);
  maxX = Math.min(width - 1, maxX + margem);
  maxY = Math.min(height - 1, maxY + margem);
  const saida = document.createElement("canvas");
  saida.width = maxX - minX + 1;
  saida.height = maxY - minY + 1;
  saida.getContext("2d")!.drawImage(canvas, minX, minY, saida.width, saida.height, 0, 0, saida.width, saida.height);
  return saida.toDataURL("image/png");
}
