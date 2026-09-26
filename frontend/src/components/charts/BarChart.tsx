import { useState } from "react";
import { chartTokens } from "../../lib/chartTokens";

export interface BarChartDatum {
  id: string;
  label: string;
  value: number;
}

interface Props {
  data: BarChartDatum[];
  ariaLabel: string;
}

const BAR_HEIGHT = 20;
const ROW_GAP = 14;
const LABEL_WIDTH = 168;

export function BarChart({ data, ariaLabel }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const rowHeight = BAR_HEIGHT + ROW_GAP;
  const chartHeight = data.length * rowHeight;

  if (data.length === 0) {
    return <p className="text-sm text-slate-500">Sem dados para exibir.</p>;
  }

  return (
    <div role="img" aria-label={ariaLabel} className="w-full overflow-x-auto">
      <svg width="100%" height={chartHeight} viewBox={`0 0 640 ${chartHeight}`} preserveAspectRatio="none">
        {data.map((item, index) => {
          const y = index * rowHeight;
          const trackX = LABEL_WIDTH;
          const trackWidth = 640 - LABEL_WIDTH - 56;
          const barWidth = (item.value / maxValue) * trackWidth;
          const isHovered = hoveredId === item.id;

          return (
            <g
              key={item.id}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(item.id)}
              onBlur={() => setHoveredId(null)}
              tabIndex={0}
              style={{ cursor: "default", outline: "none" }}
            >
              <rect
                x={0}
                y={y}
                width={640}
                height={rowHeight}
                fill={isHovered ? chartTokens.gridline : "transparent"}
                opacity={isHovered ? 0.4 : 1}
                rx={6}
                style={{ transition: "fill 120ms ease" }}
              />

              <text
                x={trackX - 12}
                y={y + rowHeight / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={13}
                fill={chartTokens.secondaryInk}
              >
                {item.label}
              </text>

              <rect
                x={trackX}
                y={y + (rowHeight - BAR_HEIGHT) / 2}
                width={trackWidth}
                height={BAR_HEIGHT}
                rx={2}
                fill={chartTokens.gridline}
              />

              <rect
                x={trackX}
                y={y + (rowHeight - BAR_HEIGHT) / 2}
                width={Math.max(barWidth, item.value > 0 ? 4 : 0)}
                height={BAR_HEIGHT}
                rx={5}
                fill={chartTokens.seriesBlue}
                opacity={isHovered ? 0.85 : 1}
                style={{ transition: "opacity 120ms ease, width 300ms ease" }}
              />

              <text
                x={trackX + barWidth + 10}
                y={y + rowHeight / 2}
                dominantBaseline="middle"
                fontSize={13}
                fontWeight={600}
                fill={chartTokens.primaryInk}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {item.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
