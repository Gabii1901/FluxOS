import type { StatusOs } from "../types/ordemServico";
import { STATUS_LABEL } from "../types/ordemServico";

const STATUS_STYLE: Record<StatusOs, string> = {
  aberta: "bg-slate-100 text-slate-700",
  em_diagnostico: "bg-blue-100 text-blue-700",
  aguardando_aprovacao: "bg-amber-100 text-amber-800",
  aprovada: "bg-teal-100 text-teal-700",
  em_execucao: "bg-indigo-100 text-indigo-700",
  em_qa: "bg-purple-100 text-purple-700",
  concluida: "bg-emerald-100 text-emerald-700",
  faturada: "bg-cyan-100 text-cyan-700",
  entregue: "bg-green-100 text-green-700",
  cancelada: "bg-red-100 text-red-700",
  aguardando_peca: "bg-orange-100 text-orange-700",
  reaberta: "bg-pink-100 text-pink-700",
};

export function StatusBadge({ status }: { status: StatusOs }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
