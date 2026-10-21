import { useAuth } from "../contexts/AuthContext";
import type { Plano } from "../types/auth";
import type { Acao, Modulo } from "../types/permissao";

// Espelha backend/src/lib/planos.ts — o backend continua sendo quem bloqueia de fato.
const MODULOS_BASICO: Modulo[] = ["dashboard", "usuarios", "clientes", "ordens_servico"];
const MODULOS_INTERMEDIARIO: Modulo[] = [...MODULOS_BASICO, "estoque"];
const MODULOS_AVANCADO: Modulo[] = [...MODULOS_INTERMEDIARIO, "orcamentos", "orcamento_calhas", "financeiro"];

const MODULOS_POR_PLANO: Record<Exclude<Plano, "personalizado">, Modulo[]> = {
  basico: MODULOS_BASICO,
  intermediario: MODULOS_INTERMEDIARIO,
  avancado: MODULOS_AVANCADO,
};

function moduloNoPlano(plano: Plano | null, modulo: Modulo) {
  if (!plano) return false;
  if (plano === "personalizado") return true;
  return MODULOS_POR_PLANO[plano].includes(modulo);
}

export function usePermissao() {
  const { usuario } = useAuth();

  function pode(modulo: Modulo, acao: Acao) {
    if (!usuario) return false;
    if (usuario.papel === "desenvolvedor") return true;
    if (!moduloNoPlano(usuario.plano, modulo)) return false;
    return usuario.permissoes[modulo]?.[acao] ?? false;
  }

  const ehGestorDePermissoes = usuario?.papel === "admin" || usuario?.papel === "desenvolvedor";

  return { pode, ehGestorDePermissoes };
}
