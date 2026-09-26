import type { ReactNode } from "react";
import { usePermissao } from "../hooks/usePermissao";
import type { Modulo } from "../types/permissao";

export function RotaComPermissao({ modulo, children }: { modulo: Modulo; children: ReactNode }) {
  const { pode } = usePermissao();

  if (!pode(modulo, "ver")) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-lg font-medium text-slate-900">Sem permissão</p>
        <p className="mt-2 text-sm text-slate-500">
          Você não tem permissão para acessar esta tela. Fale com um administrador para liberar o acesso.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
