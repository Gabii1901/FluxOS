export interface DespesaRelatorio {
  id: string;
  descricao: string;
  fornecedor: string | null;
  categoria: string;
  vencimento: string;
  pagoEm: string | null;
  valor: number;
  situacao: "paga" | "aberta" | "vencida";
}

export interface ReceitaRelatorio {
  id: string;
  data: string;
  valor: number;
  metodo: string;
  situacao: "recebida" | "a_receber";
  osId: string;
  osNumero: number;
  cliente: string;
}

export interface MesRelatorio {
  mes: string; // YYYY-MM
  receitaRecebida: number;
  receitaAReceber: number;
  despesaPaga: number;
  despesaEmAberto: number;
  saldoRealizado: number;
  saldoPrevisto: number;
  saldoAcumulado: number;
}

export interface RelatorioFinanceiro {
  inicio: string;
  fim: string;
  despesas: DespesaRelatorio[];
  receitas: ReceitaRelatorio[];
  meses: MesRelatorio[];
}
