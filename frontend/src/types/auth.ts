import type { MapaPermissoes } from "./permissao";

export type Papel = "desenvolvedor" | "admin" | "colaborador";

export const NIVEL_PAPEL: Record<Papel, number> = {
  desenvolvedor: 2,
  admin: 1,
  colaborador: 0,
};

export type Plano = "basico" | "intermediario" | "avancado" | "personalizado";
export type StatusAssinatura = "pendente" | "ativo" | "inadimplente" | "cancelado";

export const PLANO_LABEL: Record<Plano, string> = {
  basico: "Básico",
  intermediario: "Intermediário",
  avancado: "Avançado",
  personalizado: "Personalizado",
};

export interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  empresaId: string;
  empresaNome: string;
  plano: Plano | null;
  statusAssinatura: StatusAssinatura;
  permissoes: MapaPermissoes;
}

export const PAPEL_LABEL: Record<Papel, string> = {
  desenvolvedor: "Desenvolvedor",
  admin: "Administrador",
  colaborador: "Colaborador",
};
