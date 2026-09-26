import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../lib/api";
import type { UsuarioLogado } from "../types/auth";

interface AuthContextValue {
  usuario: UsuarioLogado | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "fluxos:token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setCarregando(false);
      return;
    }

    api
      .get<UsuarioLogado>("/auth/me")
      .then((resposta) => setUsuario(resposta.data))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setCarregando(false));
  }, []);

  async function login(email: string, senha: string) {
    const resposta = await api.post<{ token: string; usuario: UsuarioLogado }>(
      "/auth/login",
      { email, senha },
    );
    localStorage.setItem(TOKEN_KEY, resposta.data.token);
    setUsuario(resposta.data.usuario);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUsuario(null);
  }

  const value = useMemo(
    () => ({ usuario, carregando, login, logout }),
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
