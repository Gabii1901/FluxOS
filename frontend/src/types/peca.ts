export interface Peca {
  id: string;
  sku: string;
  nome: string;
  quantidadeEstoque: string;
  valorUnitario: string;
  ativo: boolean;
}

export type TipoMovimentacao = "entrada" | "saida";

export interface Movimentacao {
  id: string;
  tipo: TipoMovimentacao;
  quantidade: string;
  motivo: string | null;
  criadoEm: string;
  usuario: { id: string; nome: string };
}

export interface PecaDetalhe extends Peca {
  movimentacoes: Movimentacao[];
}
