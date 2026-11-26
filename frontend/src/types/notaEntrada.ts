import type { Peca } from "./peca";

export interface NotaEntrada {
  id: string;
  chaveAcesso: string;
  numero: string;
  serie: string | null;
  fornecedorCnpj: string;
  fornecedorNome: string;
  dataEmissao: string;
  valorProdutos: string;
  valorTotal: string;
  criadoEm: string;
  _count?: { itens: number };
}

export interface NotaEntradaItem {
  id: string;
  codigoFornecedor: string;
  descricaoXml: string;
  unidadeXml: string;
  quantidadeXml: string;
  valorTotal: string;
  fatorConversao: string;
  quantidadeEntrada: string;
  custoUnitario: string;
  precoVenda: string;
  peca: { id: string; sku: string; nome: string; unidade: string };
}

export interface NotaEntradaDetalhe extends NotaEntrada {
  itens: NotaEntradaItem[];
  contasPagar: { id: string; descricao: string; valor: string; vencimento: string; pagoEm: string | null }[];
}

export interface ConferenciaNota {
  jaLancada: { id: string; criadoEm: string } | null;
  vinculos: { codigoFornecedor: string; fatorConversao: string; peca: Peca }[];
}
