import { useState } from "react";
import { chartTokens } from "../../lib/chartTokens";

export interface ResumoFinanceiroData {
  totalFaturado: number;
  totalRecebido: number;
  totalEmAberto: number;
  totalAgendado: number;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const ALTURA_BARRA = 28;

export function ResumoFinanceiro({ totalFaturado, totalRecebido, totalEmAberto }: ResumoFinanceiroData) {
  const [segmentoAtivo, setSegmentoAtivo] = useState<"recebido" | "aberto" | null>(null);

  if (totalFaturado <= 0) {
    return (
      <p className="text-sm text-slate-500">
        Nenhuma fatura gerada ainda. O resumo financeiro aparece assim que a primeira fatura for emitida.
      </p>
    );
  }

  const pctRecebido = Math.min(100, (totalRecebido / totalFaturado) * 100);
  const pctAberto = Math.max(0, 100 - pctRecebido);
  const gap = totalRecebido > 0 && totalEmAberto > 0 ? 0.6 : 0;

  return (
    <div role="img" aria-label="Resumo financeiro: valor recebido comparado ao valor em aberto">
      <svg width="100%" height={ALTURA_BARRA} viewBox={`0 0 100 ${ALTURA_BARRA}`} preserveAspectRatio="none">
        <rect x={0} y={0} width={100} height={ALTURA_BARRA} rx={6} fill={chartTokens.gridline} />
        {totalRecebido > 0 && (
          <rect
            x={0}
            y={0}
            width={Math.max(pctRecebido - gap, 0)}
            height={ALTURA_BARRA}
            rx={6}
            fill={chartTokens.statusGood}
            opacity={segmentoAtivo === "aberto" ? 0.55 : 1}
            style={{ transition: "opacity 120ms ease", cursor: "default" }}
            onMouseEnter={() => setSegmentoAtivo("recebido")}
            onMouseLeave={() => setSegmentoAtivo(null)}
          />
        )}
        {totalEmAberto > 0 && (
          <rect
            x={pctRecebido + gap}
            y={0}
            width={Math.max(pctAberto - gap, 0)}
            height={ALTURA_BARRA}
            rx={6}
            fill={chartTokens.statusWarning}
            opacity={segmentoAtivo === "recebido" ? 0.55 : 1}
            style={{ transition: "opacity 120ms ease", cursor: "default" }}
            onMouseEnter={() => setSegmentoAtivo("aberto")}
            onMouseLeave={() => setSegmentoAtivo(null)}
          />
        )}
      </svg>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          className="rounded-lg border border-slate-100 p-3"
          onMouseEnter={() => setSegmentoAtivo("recebido")}
          onMouseLeave={() => setSegmentoAtivo(null)}
        >
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-400">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: chartTokens.statusGood }} />
            Recebido
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatarMoeda(totalRecebido)}
          </p>
          <p className="text-xs text-slate-500">{pctRecebido.toFixed(0)}% do faturado</p>
        </div>

        <div
          className="rounded-lg border border-slate-100 p-3"
          onMouseEnter={() => setSegmentoAtivo("aberto")}
          onMouseLeave={() => setSegmentoAtivo(null)}
        >
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-400">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: chartTokens.statusWarning }} />
            Em aberto
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatarMoeda(totalEmAberto)}
          </p>
          <p className="text-xs text-slate-500">{pctAberto.toFixed(0)}% do faturado</p>
        </div>

        <div className="rounded-lg border border-slate-100 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Total faturado</p>
          <p className="mt-1 text-lg font-semibold text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatarMoeda(totalFaturado)}
          </p>
          <p className="text-xs text-slate-500">soma de todas as faturas</p>
        </div>
      </div>
    </div>
  );
}
