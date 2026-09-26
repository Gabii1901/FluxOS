import type { Papel } from "./auth";

export interface UsuarioResumo {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  ativo: boolean;
  criadoEm: string;
}
