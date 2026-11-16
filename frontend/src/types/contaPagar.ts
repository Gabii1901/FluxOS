export type StatusContaPagar = "aberta" | "vencida" | "paga";

export interface CategoriaContaPagar {
  id: string;
  nome: string;
}

export interface ContaPagar {
  id: string;
  descricao: string;
  categoriaId: string | null;
  categoria: CategoriaContaPagar | null;
  fornecedorNome: string | null;
  fornecedorDocumento: string | null;
  valor: string;
  vencimento: string;
  pagoEm: string | null;
  formaPagamento: string | null;
  observacao: string | null;
  grupoRecorrenciaId: string | null;
  parcela: number | null;
  totalParcelas: number | null;
  criadoEm: string;
}

interface Total {
  valor: number;
  quantidade: number;
}

export interface ResumoContasPagar {
  emAberto: Total;
  vencido: Total;
  proximos7Dias: Total;
  pagoNoMes: Total;
}

export const FORMAS_PAGAMENTO = ["PIX", "Boleto", "Cartão de crédito", "Cartão de débito", "Dinheiro", "Transferência"];

export const STATUS_CONTA_LABEL: Record<StatusContaPagar, string> = {
  aberta: "Em aberto",
  vencida: "Vencida",
  paga: "Paga",
};

export function statusDaConta(conta: Pick<ContaPagar, "pagoEm" | "vencimento">): StatusContaPagar {
  if (conta.pagoEm) return "paga";
  const hoje = hojeIso();
  return conta.vencimento.slice(0, 10) < hoje ? "vencida" : "aberta";
}

// Data de hoje no fuso do usuário, no formato YYYY-MM-DD.
export function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
