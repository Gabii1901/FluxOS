import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

const INTERVALO_MS = 3000;
const MAX_TENTATIVAS = 20; // ~1 minuto

export function PagamentoRetornoPage() {
  const { atualizarUsuario } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verificando" | "demorando">("verificando");
  const tentativas = useRef(0);

  useEffect(() => {
    let cancelado = false;

    async function verificar() {
      tentativas.current += 1;
      try {
        const resposta = await api.get<{ statusAssinatura: string }>("/pagamentos/status");
        if (cancelado) return;

        if (resposta.data.statusAssinatura === "ativo") {
          await atualizarUsuario();
          navigate("/", { replace: true });
          return;
        }
      } catch {
        // tenta de novo no próximo ciclo
      }

      if (tentativas.current >= MAX_TENTATIVAS) {
        setStatus("demorando");
        return;
      }
      setTimeout(verificar, INTERVALO_MS);
    }

    verificar();
    return () => {
      cancelado = true;
    };
  }, [atualizarUsuario, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex justify-center">
          <img src="/logo_fluxos_full_trimmed.png" alt="FluxOS" className="h-24 w-auto" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {status === "verificando" ? (
            <p className="text-sm text-slate-600">Confirmando seu pagamento...</p>
          ) : (
            <>
              <p className="text-lg font-medium text-slate-900">Ainda processando</p>
              <p className="mt-2 text-sm text-slate-600">
                Pagamentos via boleto podem levar até 2 dias úteis para compensar. Assim que
                confirmado, seu acesso libera automaticamente — pode fechar esta página.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
