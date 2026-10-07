import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  EmailNaoConfirmadoError,
  useAuth,
  type EmpresaDisponivel,
} from "../contexts/AuthContext";
import { api } from "../lib/api";

export function LoginPage() {
  const { login, selecionarEmpresa } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [emailNaoConfirmado, setEmailNaoConfirmado] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);

  const [escolhendoEmpresa, setEscolhendoEmpresa] = useState(false);
  const [preAuthToken, setPreAuthToken] = useState("");
  const [empresas, setEmpresas] = useState<EmpresaDisponivel[]>([]);

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEmailNaoConfirmado(false);
    setReenviado(false);
    setEnviando(true);
    try {
      const resultado = await login(email, senha);
      if (resultado.tipo === "escolher_empresa") {
        setPreAuthToken(resultado.preAuthToken);
        setEmpresas(resultado.empresas);
        setEscolhendoEmpresa(true);
        return;
      }
      navigate("/", { replace: true });
    } catch (erro) {
      if (erro instanceof EmailNaoConfirmadoError) {
        setEmailNaoConfirmado(true);
      } else {
        setErro("E-mail ou senha inválidos.");
      }
    } finally {
      setEnviando(false);
    }
  }

  async function handleEscolherEmpresa(empresaId: string) {
    setErro(null);
    setEnviando(true);
    try {
      await selecionarEmpresa(preAuthToken, empresaId);
      navigate("/", { replace: true });
    } catch {
      setErro("Não foi possível entrar nessa empresa. Faça login novamente.");
      setEscolhendoEmpresa(false);
    } finally {
      setEnviando(false);
    }
  }

  async function handleReenviar() {
    setReenviando(true);
    try {
      await api.post("/auth/reenviar-confirmacao", { email });
      setReenviado(true);
    } finally {
      setReenviando(false);
    }
  }

  if (escolhendoEmpresa) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center">
            <img src={`${import.meta.env.BASE_URL}logo_fluxos_full_trimmed.png`} alt="FluxOS" className="h-24 w-auto" />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="mb-4 text-sm font-medium text-slate-700">Escolha a empresa</p>
            <div className="space-y-2">
              {empresas.map((empresa) => (
                <button
                  key={empresa.empresaId}
                  type="button"
                  disabled={enviando}
                  onClick={() => handleEscolherEmpresa(empresa.empresaId)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-left text-sm font-medium text-slate-900 hover:border-slate-900 disabled:opacity-60"
                >
                  {empresa.empresaNome}
                </button>
              ))}
            </div>
            {erro && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <img src={`${import.meta.env.BASE_URL}logo_fluxos_full_trimmed.png`} alt="FluxOS" className="h-24 w-auto" />
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              placeholder="voce@empresa.com"
            />
          </div>

          <div className="mb-5">
            <label htmlFor="senha" className="mb-1 block text-sm font-medium text-slate-700">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              placeholder="••••••••"
            />
          </div>

          {erro && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
          )}

          {emailNaoConfirmado && (
            <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <p>Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.</p>
              {reenviado ? (
                <p className="mt-1 font-medium">Link reenviado! Confira seu e-mail.</p>
              ) : (
                <button
                  type="button"
                  onClick={handleReenviar}
                  disabled={reenviando}
                  className="mt-1 font-medium underline disabled:opacity-60"
                >
                  {reenviando ? "Enviando..." : "Reenviar e-mail de confirmação"}
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {enviando ? "Entrando..." : "Entrar"}
          </button>

          <p className="mt-4 text-center text-sm text-slate-500">
            Ainda não tem conta?{" "}
            <Link to="/cadastro" className="font-medium text-slate-900 underline">
              Cadastre sua empresa
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
