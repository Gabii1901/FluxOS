export type TipoServicoCalha =
  | "calha"
  | "algerosa"
  | "capeamento"
  | "rufo"
  | "pingadeira"
  | "tubulacao"
  | "colarinho"
  | "exaustor_eolico"
  | "adicional"
  | "venda";

export type TipoMedidaOrcamento = "metro" | "unidade";
export type UnidadeComprimento = "m" | "cm" | "mm";
export type StatusOrcamentoCalha = "rascunho" | "enviado" | "aprovado" | "recusado";

export const TIPO_SERVICO_LABEL: Record<TipoServicoCalha, string> = {
  calha: "Calha",
  algerosa: "Algerosa",
  capeamento: "Capeamento",
  rufo: "Rufo",
  pingadeira: "Pingadeira",
  tubulacao: "Tubulação",
  colarinho: "Colarinho",
  exaustor_eolico: "Exaustor Eólico",
  adicional: "Serviço adicional",
  venda: "Incluir venda",
};

export const SERVICOS_EM_CHAPA: TipoServicoCalha[] = [
  "calha",
  "algerosa",
  "capeamento",
  "rufo",
  "pingadeira",
  "tubulacao",
  "colarinho",
  "exaustor_eolico",
];

export const STATUS_ORCAMENTO_CALHA_LABEL: Record<StatusOrcamentoCalha, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

export interface DesenhoPerfil {
  nome: string;
  segmentos: SegmentoPerfil[];
}

export interface SegmentoPerfil {
  nome: string;
  valorCm: number;
  // Direção do traço em graus (0=direita, 90=cima, 180=esquerda, 270=baixo).
  anguloGraus?: number;
}

export interface MaterialChapa {
  id: string;
  nome: string;
  espessuraMm: string | null;
  tipo: string | null;
  cor: string | null;
  precoM2: string;
  ativo: boolean;
}

export interface PerfilCalha {
  id: string;
  empresaId: string | null;
  nome: string;
  descricao: string | null;
  segmentos: SegmentoPerfil[];
  padrao: boolean;
  ativo: boolean;
}

export interface OrcamentoCalhaItem {
  id: string;
  tipoServico: TipoServicoCalha;
  descricao: string | null;
  tipoMedida: TipoMedidaOrcamento;
  quantidade: string;
  unidadeQuantidade: UnidadeComprimento;
  corteLargura: string | null;
  unidadeCorte: UnidadeComprimento | null;
  materialId: string | null;
  material: MaterialChapa | null;
  perfilId: string | null;
  perfil: PerfilCalha | null;
  segmentosCustom: SegmentoPerfil[] | null;
  croqui: string | null; // antigo, só em dados anteriores
  desenhosExtras: DesenhoPerfil[] | null;
  croquis: string[] | null;
  valorUnitario: string | null;
  acrescimoPercentual: string;
  custoCalculado: string;
  precoCalculado: string;
}

export interface OrcamentoCalhaDespesa {
  id: string;
  descricao: string;
  valor: string;
}

export interface OrcamentoCalhaMaoDeObra {
  id: string;
  usuarioId: string;
  usuario: { id: string; nome: string };
  valorHora: string;
  horas: string;
  custoTotal: string;
}

export interface OrcamentoCalha {
  id: string;
  numero: number;
  clienteId: string | null;
  cliente: { id: string; nome: string; telefone?: string | null; email?: string | null; documento?: string | null } | null;
  osId: string | null;
  os: { id: string; numero: number; problemaRelatado?: string } | null;
  empresa?: { nome: string };
  status: StatusOrcamentoCalha;
  acrescimoPercentual: string;
  custoTotal: string;
  precoTotal: string;
  criadoEm: string;
  itens: OrcamentoCalhaItem[];
  maoDeObra: OrcamentoCalhaMaoDeObra[];
  despesas: OrcamentoCalhaDespesa[];
}

export interface OrcamentoCalhaResumo {
  id: string;
  numero: number;
  cliente: { id: string; nome: string } | null;
  os: { id: string; numero: number } | null;
  status: StatusOrcamentoCalha;
  precoTotal: string;
  criadoEm: string;
}

/** Croquis de um item (inclui o croqui único antigo, se houver). */
export function croquisDoItem(item: Pick<OrcamentoCalhaItem, "croqui" | "croquis">): string[] {
  if (item.croquis && item.croquis.length) return item.croquis;
  return item.croqui ? [item.croqui] : [];
}
