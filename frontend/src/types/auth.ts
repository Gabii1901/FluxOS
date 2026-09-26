import type { MapaPermissoes } from "./permissao";

export type Papel = "desenvolvedor" | "admin" | "colaborador";

export const NIVEL_PAPEL: Record<Papel, number> = {
  desenvolvedor: 2,
  admin: 1,
  colaborador: 0,
};

export interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  empresaId: string;
  empresaNome: string;
  permissoes: MapaPermissoes;
}

export const PAPEL_LABEL: Record<Papel, string> = {
  desenvolvedor: "Desenvolvedor",
  admin: "Administrador",
  colaborador: "Colaborador",
};
