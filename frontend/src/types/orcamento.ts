export type StatusOrcamento = "pendente" | "aprovado" | "recusado" | "expirado";
export type TipoItemOrcamento = "peca" | "mao_de_obra" | "servico_terceiro";

export const STATUS_ORCAMENTO_LABEL: Record<StatusOrcamento, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  recusado: "Recusado",
  expirado: "Expirado",
};

export const TIPO_ITEM_LABEL: Record<TipoItemOrcamento, string> = {
  peca: "Peça",
  mao_de_obra: "Mão de obra",
  servico_terceiro: "Serviço de terceiro",
};

export interface OrcamentoItem {
  id: string;
  tipo: TipoItemOrcamento;
  descricao: string;
  quantidade: string;
  valorUnitario: string;
  pecaId: string | null;
}

export interface Orcamento {
  id: string;
  osId: string;
  status: StatusOrcamento;
  valorTotal: string;
  enviadoEm: string | null;
  respondidoEm: string | null;
  validadeDias: number;
  criadoEm: string;
  itens: OrcamentoItem[];
}

export interface OrcamentoResumo extends Orcamento {
  ordemServico: {
    numero: number;
    cliente: { nome: string };
  };
}

export interface OrcamentoImpressao extends Orcamento {
  ordemServico: {
    id: string;
    numero: number;
    problemaRelatado: string;
    cliente: { nome: string; telefone: string | null; email: string | null; documento: string | null };
    tecnico: { nome: string } | null;
    empresa: { nome: string };
  };
}
