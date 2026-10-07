import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { usePermissao } from "../hooks/usePermissao";
import { PAPEL_LABEL } from "../types/auth";
import type { Modulo } from "../types/permissao";

const NAV_ITEMS: { to: string; label: string; end?: boolean; modulo: Modulo }[] = [
  { to: "/", label: "Início", end: true, modulo: "dashboard" },
  { to: "/ordens-servico", label: "Ordens de serviço", modulo: "ordens_servico" },
  { to: "/orcamentos", label: "Orçamentos", modulo: "orcamentos" },
  { to: "/pagamentos-pendentes", label: "Pagamentos a prazo", modulo: "financeiro" },
  { to: "/clientes", label: "Clientes", modulo: "clientes" },
  { to: "/estoque", label: "Estoque", modulo: "estoque" },
  { to: "/usuarios", label: "Usuários", modulo: "usuarios" },
];

export function AppLayout() {
  const { usuario, logout } = useAuth();
  const { pode, ehGestorDePermissoes } = usePermissao();

  const itensVisiveis = NAV_ITEMS.filter((item) => pode(item.modulo, "ver"));

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="px-5 py-5">
          <img src="/logo_fluxos_wordmark.png" alt="FluxOS" className="h-7 w-auto" />
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {itensVisiveis.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}

          {ehGestorDePermissoes && (
            <NavLink
              to="/permissoes"
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              Permissões
            </NavLink>
          )}

          {usuario?.papel === "desenvolvedor" && (
            <NavLink
              to="/admin/empresas"
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              Empresas (admin)
            </NavLink>
          )}
        </nav>

        <div className="border-t border-slate-200 px-4 py-4">
          <p className="truncate text-sm font-medium text-slate-900">{usuario?.nome}</p>
          <p className="text-xs text-slate-500">{usuario && PAPEL_LABEL[usuario.papel]}</p>
          <button
            onClick={logout}
            className="mt-3 w-full rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
