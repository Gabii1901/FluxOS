import type { Cliente } from "./cliente";
import type { Entrega, Fatura, Garantia } from "./faturamento";
import type { Orcamento } from "./orcamento";
import type { Peca } from "./peca";

export type StatusOs =
  | "aberta"
  | "em_diagnostico"
  | "aguardando_aprovacao"
  | "aprovada"
  | "em_execucao"
  | "em_qa"
  | "concluida"
  | "faturada"
  | "entregue"
  | "cancelada"
  | "aguardando_peca"
  | "reaberta";

export const STATUS_LABEL: Record<StatusOs, string> = {
  aberta: "Aberta",
  em_diagnostico: "Em diagnóstico",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovada: "Aprovada",
  em_execucao: "Em execução",
  em_qa: "Em QA",
  concluida: "Concluída",
  faturada: "Faturada",
  entregue: "Entregue",
  cancelada: "Cancelada",
  aguardando_peca: "Aguardando peça",
  reaberta: "Reaberta",
};

export const TODOS_STATUS = Object.keys(STATUS_LABEL) as StatusOs[];

export interface Usuario {
  id: string;
  nome: string;
}

export interface OrdemServico {
  id: string;
  numero: number;
  status: StatusOs;
  prioridade: "baixa" | "normal" | "alta" | "urgente";
  problemaRelatado: string;
  criadoEm: string;
  cliente: Cliente;
  tecnico: Usuario | null;
}

export interface StatusHistoricoItem {
  id: string;
  statusAnterior: StatusOs | null;
  statusNovo: StatusOs;
  observacao: string | null;
  criadoEm: string;
}

export interface OsPecaUtilizada {
  id: string;
  quantidade: string;
  valorUnitario: string;
  peca: Peca;
}

export interface FotoOs {
  id: string;
  url: string;
  legenda: string | null;
  criadoEm: string;
}

export interface OrdemServicoDetalhe extends OrdemServico {
  atendente: Usuario | null;
  statusHistorico: StatusHistoricoItem[];
  pecasUtilizadas: OsPecaUtilizada[];
  orcamentos: Orcamento[];
  faturas: Fatura[];
  entregas: Entrega[];
  garantias: Garantia[];
  fotos: FotoOs[];
}
