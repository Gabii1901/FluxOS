import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "../lib/api";
import { lerToken, limparToken, salvarToken } from "../lib/sessao";
import type { UsuarioLogado } from "../types/auth";

export interface EmpresaDisponivel {
  empresaId: string;
  empresaNome: string;
}

export type ResultadoLogin =
  | { tipo: "ok" }
  | { tipo: "escolher_empresa"; preAuthToken: string; empresas: EmpresaDisponivel[] };

export class EmailNaoConfirmadoError extends Error {}

interface AuthContextValue {
  usuario: UsuarioLogado | null;
  carregando: boolean;
  login: (email: string, senha: string, lembrar?: boolean) => Promise<ResultadoLogin>;
  selecionarEmpresa: (preAuthToken: string, empresaId: string) => Promise<void>;
  confirmarEmail: (token: string) => Promise<void>;
  atualizarUsuario: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);
  const [carregando, setCarregando] = useState(true);
  // Guardado entre o login e a escolha de empresa (quando a conta tem mais de uma).
  const lembrarRef = useRef(false);

  useEffect(() => {
    const token = lerToken();
    if (!token) {
      setCarregando(false);
      return;
    }

    api
      .get<UsuarioLogado>("/auth/me")
      .then((resposta) => setUsuario(resposta.data))
      .catch(() => limparToken())
      .finally(() => setCarregando(false));
  }, []);

  function aplicarSessao(dados: { token: string; usuario: UsuarioLogado }, lembrar = lembrarRef.current) {
    salvarToken(dados.token, lembrar);
    setUsuario(dados.usuario);
  }

  async function login(email: string, senha: string, lembrar = false): Promise<ResultadoLogin> {
    lembrarRef.current = lembrar;
    try {
      const resposta = await api.post<
        | { token: string; usuario: UsuarioLogado }
        | { precisaEscolherEmpresa: true; preAuthToken: string; empresas: EmpresaDisponivel[] }
      >("/auth/login", { email, senha, lembrar });

      if ("precisaEscolherEmpresa" in resposta.data) {
        return {
          tipo: "escolher_empresa",
          preAuthToken: resposta.data.preAuthToken,
          empresas: resposta.data.empresas,
        };
      }

      aplicarSessao(resposta.data);
      return { tipo: "ok" };
    } catch (erro: any) {
      if (erro?.response?.data?.precisaConfirmarEmail) {
        throw new EmailNaoConfirmadoError();
      }
      throw erro;
    }
  }

  async function selecionarEmpresa(preAuthToken: string, empresaId: string) {
    const resposta = await api.post<{ token: string; usuario: UsuarioLogado }>(
      "/auth/selecionar-empresa",
      { preAuthToken, empresaId },
    );
    aplicarSessao(resposta.data);
  }

  async function confirmarEmail(token: string) {
    const resposta = await api.post<{ token: string; usuario: UsuarioLogado }>(
      "/auth/confirmar-email",
      { token },
    );
    aplicarSessao(resposta.data, true);
  }

  async function atualizarUsuario() {
    const resposta = await api.get<UsuarioLogado>("/auth/me");
    setUsuario(resposta.data);
  }

  function logout() {
    limparToken();
    setUsuario(null);
  }

  const value = useMemo(
    () => ({ usuario, carregando, login, selecionarEmpresa, confirmarEmail, atualizarUsuario, logout }),
    [usuario, carregando],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}
