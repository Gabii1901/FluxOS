import { useState, type MouseEvent } from "react";
import { chartTokens } from "../../lib/chartTokens";

export interface TrendChartDatum {
  label: string;
  value: number;
}

interface Props {
  data: TrendChartDatum[];
  ariaLabel: string;
}

const WIDTH = 640;
const HEIGHT = 200;
const PADDING_LEFT = 32;
const PADDING_RIGHT = 12;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 28;

export function TrendChart({ data, ariaLabel }: Props) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="text-sm text-slate-500">Sem dados para exibir.</p>;
  }

  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const plotWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: PADDING_LEFT + i * stepX,
    y: PADDING_TOP + plotHeight - (d.value / maxValue) * plotHeight,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${PADDING_TOP + plotHeight} L ${points[0].x} ${PADDING_TOP + plotHeight} Z`;

  const yTicks = [0, Math.round(maxValue / 2), maxValue];

  function handleMouseMove(evento: MouseEvent<SVGSVGElement>) {
    const svg = evento.currentTarget;
    const rect = svg.getBoundingClientRect();
    const relativeX = ((evento.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relativeX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const lastPoint = points[points.length - 1];

  return (
    <div role="img" aria-label={ariaLabel} className="relative w-full overflow-x-auto">
      <svg
        width="100%"
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="tendencia-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartTokens.seriesBlue} stopOpacity={0.22} />
            <stop offset="100%" stopColor={chartTokens.seriesBlue} stopOpacity={0} />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y = PADDING_TOP + plotHeight - (tick / maxValue) * plotHeight;
          return (
            <g key={tick}>
              <line
                x1={PADDING_LEFT}
                x2={WIDTH - PADDING_RIGHT}
                y1={y}
                y2={y}
                stroke={chartTokens.gridline}
                strokeWidth={1}
              />
              <text x={0} y={y} dominantBaseline="middle" fontSize={11} fill={chartTokens.mutedInk}>
                {tick}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#tendencia-area-fill)" stroke="none" />
        <path d={linePath} fill="none" stroke={chartTokens.seriesBlue} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p, i) => (
          <text
            key={`label-${p.label}`}
            x={p.x}
            y={HEIGHT - 6}
            textAnchor="middle"
            fontSize={10}
            fill={chartTokens.mutedInk}
            opacity={i % Math.ceil(points.length / 8 || 1) === 0 ? 1 : 0}
          >
            {p.label}
          </text>
        ))}

        <circle cx={lastPoint.x} cy={lastPoint.y} r={4} fill={chartTokens.seriesBlue} stroke={chartTokens.surface} strokeWidth={2} />
        <text
          x={lastPoint.x}
          y={lastPoint.y - 10}
          textAnchor="end"
          fontSize={12}
          fontWeight={600}
          fill={chartTokens.primaryInk}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {lastPoint.value}
        </text>

        {hovered && (
          <g>
            <line
              x1={hovered.x}
              x2={hovered.x}
              y1={PADDING_TOP}
              y2={PADDING_TOP + plotHeight}
              stroke={chartTokens.baseline}
              strokeWidth={1}
            />
            <circle cx={hovered.x} cy={hovered.y} r={4} fill={chartTokens.seriesBlue} stroke={chartTokens.surface} strokeWidth={2} />
          </g>
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
          style={{ left: `min(${(hovered.x / WIDTH) * 100}%, calc(100% - 120px))` }}
        >
          <p className="font-semibold text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>
            {hovered.value} OS
          </p>
          <p className="text-slate-500">{hovered.label}</p>
        </div>
      )}
    </div>
  );
}
