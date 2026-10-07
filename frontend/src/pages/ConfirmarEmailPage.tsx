import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function ConfirmarEmailPage() {
  const { confirmarEmail } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"confirmando" | "erro">("confirmando");
  const executado = useRef(false);

  useEffect(() => {
    if (executado.current) return;
    executado.current = true;

    const token = searchParams.get("token");
    if (!token) {
      setStatus("erro");
      return;
    }

    confirmarEmail(token)
      .then(() => navigate("/", { replace: true }))
      .catch(() => setStatus("erro"));
  }, [searchParams, confirmarEmail, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex justify-center">
          <img src="/logo_fluxos_full_trimmed.png" alt="FluxOS" className="h-24 w-auto" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {status === "confirmando" ? (
            <p className="text-sm text-slate-600">Confirmando seu e-mail...</p>
          ) : (
            <>
              <p className="text-lg font-medium text-slate-900">Link inválido ou expirado</p>
              <p className="mt-2 text-sm text-slate-600">
                Faça login para solicitar um novo link de confirmação.
              </p>
              <Link to="/login" className="mt-6 inline-block text-sm font-medium text-slate-900 underline">
                Ir para o login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
