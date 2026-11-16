import { api } from "./api";

// Quando o usuário sai de um orçamento de calhas vazio, ele é descartado no backend.
// As telas que listam orçamentos esperam esse descarte terminar antes de carregar,
// senão o orçamento vazio ainda apareceria na lista.
let pendente: Promise<unknown> = Promise.resolve();

export function descartarOrcamentoCalhaSeVazio(id: string) {
  pendente = api.delete(`/calhas/orcamentos/${id}/se-vazio`).catch(() => {});
}

export function aguardarDescarteOrcamentoCalha() {
  return pendente;
}
