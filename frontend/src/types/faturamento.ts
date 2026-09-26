export type StatusPagamento = "pendente" | "parcial" | "pago" | "cancelado";
export type StatusParcela = "pendente" | "pago" | "cancelado";

export const STATUS_PAGAMENTO_LABEL: Record<StatusPagamento, string> = {
  pendente: "Pendente",
  parcial: "Parcial",
  pago: "Pago",
  cancelado: "Cancelado",
};

export const STATUS_PARCELA_LABEL: Record<StatusParcela, string> = {
  pendente: "Aguardando pagamento",
  pago: "Pago",
  cancelado: "Cancelado",
};

export interface Pagamento {
  id: string;
  valor: string;
  metodo: string;
  status: StatusParcela;
  vencimento: string | null;
  pagoEm: string | null;
}

export interface Fatura {
  id: string;
  numero: number;
  valorTotal: string;
  status: StatusPagamento;
  emitidaEm: string;
  pagamentos: Pagamento[];
}

export interface PagamentoPendente extends Pagamento {
  fatura: {
    id: string;
    numero: number;
    ordemServico: {
      id: string;
      numero: number;
      cliente: { nome: string };
    };
  };
}

export interface Entrega {
  id: string;
  entreguePor: string | null;
  confirmadoPorCliente: boolean;
  entregueEm: string;
}

export interface Garantia {
  id: string;
  prazoFim: string;
  termos: string | null;
}
