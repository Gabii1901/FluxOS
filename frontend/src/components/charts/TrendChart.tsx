export interface TrendChartDatum {
  label: string;
  value: number;
}

interface Props {
  data: TrendChartDatum[];
  ariaLabel: string;
}

/**
 * Uma coluna por dia (contagens pequenas leem melhor como colunas do que como
 * linha). O último dia — hoje — fica destacado; dias sem registro viram um traço.
 */
export function TrendChart({ data, ariaLabel }: Props) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500">Sem dados para exibir.</p>;
  }

  const maior = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">
        {total === 0 ? "Nenhuma OS aberta no período." : `${total} ${total === 1 ? "OS aberta" : "OS abertas"} no período`}
      </p>
      <div role="img" aria-label={ariaLabel} className="flex items-end gap-1 sm:gap-2">
        {data.map((dia, i) => {
          const hoje = i === data.length - 1;
          return (
            <div key={dia.label} className="flex min-w-0 flex-1 flex-col items-center" title={`${dia.label}: ${dia.value}`}>
              <span
                className={`mb-1 text-xs font-medium ${dia.value > 0 ? "text-slate-700" : "invisible"}`}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {dia.value}
              </span>
              <div className="flex h-28 w-full items-end justify-center">
                <div
                  className={`w-full max-w-8 rounded-t ${
                    hoje ? "bg-slate-900" : dia.value > 0 ? "bg-slate-300" : "bg-slate-200"
                  }`}
                  style={{ height: dia.value > 0 ? `${Math.max(6, (dia.value / maior) * 100)}%` : 3 }}
                />
              </div>
              <span
                className={`mt-1.5 text-[11px] ${hoje ? "font-semibold text-slate-900" : "text-slate-400"} ${
                  i % 2 === (data.length - 1) % 2 ? "" : "max-sm:invisible"
                }`}
              >
                {hoje ? "Hoje" : dia.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
