export interface BarChartDatum {
  id: string;
  label: string;
  value: number;
}

interface Props {
  data: BarChartDatum[];
  ariaLabel: string;
  /** Formata o número exibido ao lado da barra (ex.: moeda). */
  formatValue?: (valor: number) => string;
}

/** Barras horizontais em HTML: o texto nunca deforma, seja qual for a largura do card. */
export function BarChart({ data, ariaLabel, formatValue = (v) => v.toLocaleString("pt-BR") }: Props) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500">Sem dados para exibir.</p>;
  }

  const maior = Math.max(1, ...data.map((d) => d.value));

  return (
    <ul role="img" aria-label={ariaLabel} className="space-y-3">
      {data.map((item) => (
        <li key={item.id} title={`${item.label}: ${formatValue(item.value)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-slate-700">{item.label}</span>
            <span className="font-medium text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatValue(item.value)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-800"
              style={{ width: item.value > 0 ? `${Math.max(2, (item.value / maior) * 100)}%` : 0 }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
