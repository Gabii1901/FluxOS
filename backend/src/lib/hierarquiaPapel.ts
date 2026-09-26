import { PapelUsuario } from "@prisma/client";

const NIVEL: Record<PapelUsuario, number> = {
  desenvolvedor: 2,
  admin: 1,
  colaborador: 0,
};

function nivel(papel: string) {
  return NIVEL[papel as PapelUsuario] ?? 0;
}

/** Um usuário só pode criar/gerenciar outro cujo papel esteja no mesmo nível ou abaixo do seu. */
export function podeGerenciarPapel(papelSolicitante: string, papelAlvo: string) {
  return nivel(papelSolicitante) >= nivel(papelAlvo);
}
