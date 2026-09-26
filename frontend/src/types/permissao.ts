export const MODULOS = [
  "dashboard",
  "ordens_servico",
  "orcamentos",
  "clientes",
  "estoque",
  "usuarios",
  "financeiro",
] as const;

export type Modulo = (typeof MODULOS)[number];
export type Acao = "ver" | "criar" | "editar" | "apagar";

export const MODULO_LABEL: Record<Modulo, string> = {
  dashboard: "Início",
  ordens_servico: "Ordens de serviço",
  orcamentos: "Orçamentos",
  clientes: "Clientes",
  estoque: "Estoque",
  usuarios: "Usuários",
  financeiro: "Financeiro",
};

export interface PermissaoModulo {
  ver: boolean;
  criar: boolean;
  editar: boolean;
  apagar: boolean;
}

export type MapaPermissoes = Record<Modulo, PermissaoModulo>;

export function mapaPermissoesVazio(): MapaPermissoes {
  const mapa = {} as MapaPermissoes;
  for (const modulo of MODULOS) {
    mapa[modulo] = { ver: false, criar: false, editar: false, apagar: false };
  }
  return mapa;
}
