import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { SeletorEmpresa } from "./SeletorEmpresa";
import { useAuth } from "../contexts/AuthContext";
import { usePermissao } from "../hooks/usePermissao";
import { rotularTabelas } from "../lib/tabelaCards";
import { PAPEL_LABEL } from "../types/auth";
import type { Modulo } from "../types/permissao";

const NAV_ITEMS: { to: string; label: string; end?: boolean; modulo: Modulo }[] = [
  { to: "/", label: "Início", end: true, modulo: "dashboard" },
  { to: "/ordens-servico", label: "Ordens de serviço", modulo: "ordens_servico" },
  { to: "/orcamentos", label: "Orçamentos", modulo: "orcamentos" },
  { to: "/orcamento-calhas", label: "Orçamento de Calhas", modulo: "orcamento_calhas" },
  { to: "/orcamento-calhas-materiais", label: "Materiais (calhas)", modulo: "orcamento_calhas" },
  { to: "/pagamentos-pendentes", label: "Pagamentos a prazo", modulo: "financeiro" },
  { to: "/contas-pagar", label: "Contas a pagar", modulo: "financeiro" },
  { to: "/relatorios", label: "Relatórios", modulo: "financeiro" },
  { to: "/clientes", label: "Clientes", modulo: "clientes" },
  { to: "/estoque", label: "Estoque", modulo: "estoque" },
  { to: "/usuarios", label: "Usuários", modulo: "usuarios" },
];

const classeLink = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:py-2 ${
    isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

const logo = `${import.meta.env.BASE_URL}logo_fluxos_wordmark.png`;

// No computador o menu fica fixo à esquerda; no celular vira uma gaveta aberta pelo
// botão da barra superior e fecha sozinha ao trocar de tela.
export function AppLayout() {
  const { usuario, logout } = useAuth();
  const { pode, ehGestorDePermissoes } = usePermissao();
  const [menuAberto, setMenuAberto] = useState(false);
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  // Rótulos das tabelas que viram cartões no celular.
  useEffect(() => (mainRef.current ? rotularTabelas(mainRef.current) : undefined), []);

  useEffect(() => setMenuAberto(false), [location.pathname]);

  useEffect(() => {
    if (!menuAberto) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setMenuAberto(false);
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [menuAberto]);

  const itensVisiveis = NAV_ITEMS.filter((item) => pode(item.modulo, "ver"));

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50">
      {menuAberto && (
        <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setMenuAberto(false)} aria-hidden="true" />
      )}

      <aside
        id="menu-principal"
        className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:w-60 lg:flex-shrink-0 lg:translate-x-0 ${
          menuAberto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <img src={logo} alt="FluxOS" className="h-7 w-auto" />
          <button
            type="button"
            onClick={() => setMenuAberto(false)}
            className="-mr-2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Fechar menu"
          >
            ✕
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-2">
          {itensVisiveis.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={classeLink}>
              {item.label}
            </NavLink>
          ))}
          {ehGestorDePermissoes && (
            <NavLink to="/minha-empresa" className={classeLink}>
              Minha empresa
            </NavLink>
          )}
          {ehGestorDePermissoes && (
            <NavLink to="/permissoes" className={classeLink}>
              Permissões
            </NavLink>
          )}
          {usuario?.papel === "desenvolvedor" && (
            <NavLink to="/admin/empresas" className={classeLink}>
              Empresas (admin)
            </NavLink>
          )}
        </nav>

        <div className="border-t border-slate-200 px-4 py-4">
          <p className="truncate text-sm font-medium text-slate-900">{usuario?.nome}</p>
          <p className="text-xs text-slate-500">{usuario && PAPEL_LABEL[usuario.papel]}</p>
          <SeletorEmpresa />
          <button
            onClick={logout}
            className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            className="-ml-1 rounded-lg p-2 text-slate-700 hover:bg-slate-100"
            aria-label="Abrir menu"
            aria-expanded={menuAberto}
            aria-controls="menu-principal"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <img src={logo} alt="FluxOS" className="h-6 w-auto" />
        </header>

        <main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
