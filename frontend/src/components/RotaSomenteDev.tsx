import type { ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";

export function RotaSomenteDev({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();

  if (usuario?.papel !== "desenvolvedor") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-lg font-medium text-slate-900">Sem permissão</p>
        <p className="mt-2 text-sm text-slate-500">Essa área é restrita à equipe FluxOS.</p>
      </div>
    );
  }

  return <>{children}</>;
}
