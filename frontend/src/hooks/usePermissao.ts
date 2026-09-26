import { useAuth } from "../contexts/AuthContext";
import type { Acao, Modulo } from "../types/permissao";

export function usePermissao() {
  const { usuario } = useAuth();

  function pode(modulo: Modulo, acao: Acao) {
    if (!usuario) return false;
    if (usuario.papel === "desenvolvedor") return true;
    return usuario.permissoes[modulo]?.[acao] ?? false;
  }

  const ehGestorDePermissoes = usuario?.papel === "admin" || usuario?.papel === "desenvolvedor";

  return { pode, ehGestorDePermissoes };
}
