import type { ReactNode } from "react";
import { usePermissao } from "../hooks/usePermissao";

export function RotaAdminOuDev({ children }: { children: ReactNode }) {
  const { ehGestorDePermissoes } = usePermissao();

  if (!ehGestorDePermissoes) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-lg font-medium text-slate-900">Sem permissão</p>
        <p className="mt-2 text-sm text-slate-500">
          Apenas administradores ou desenvolvedores podem gerenciar permissões.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
