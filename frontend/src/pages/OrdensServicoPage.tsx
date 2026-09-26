import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NovaOsForm } from "../components/NovaOsForm";
import { StatusBadge } from "../components/StatusBadge";
import { usePermissao } from "../hooks/usePermissao";
import { api } from "../lib/api";
import { STATUS_LABEL, TODOS_STATUS, type OrdemServico, type StatusOs } from "../types/ordemServico";

export function OrdensServicoPage() {
  const navigate = useNavigate();
  const { pode } = usePermissao();
  const podeCriar = pode("ordens_servico", "criar");
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [filtroBusca, setFiltroBusca] = useState("");
  const [filtroTecnico, setFiltroTecnico] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState<StatusOs | "todos">("todos");

  function carregarOrdens() {
    return api
      .get<OrdemServico[]>("/ordens-servico")
      .then((resposta) => setOrdens(resposta.data))
      .catch(() => setErro("Não foi possível carregar as ordens de serviço."));
  }

  useEffect(() => {
    carregarOrdens().finally(() => setCarregando(false));
  }, []);

  const tecnicos = useMemo(() => {
    const nomes = new Set(ordens.map((os) => os.tecnico?.nome).filter((nome): nome is string => !!nome));
    return Array.from(nomes).sort();
  }, [ordens]);

  const ordensFiltradas = useMemo(() => {
    const busca = filtroBusca.trim().toLowerCase();

    return ordens.filter((os) => {
      if (filtroStatus !== "todos" && os.status !== filtroStatus) return false;
      if (filtroTecnico === "sem_tecnico" && os.tecnico) return false;
      if (filtroTecnico !== "todos" && filtroTecnico !== "sem_tecnico" && os.tecnico?.nome !== filtroTecnico) {
        return false;
      }
      if (
        busca &&
        !os.cliente.nome.toLowerCase().includes(busca) &&
        !os.problemaRelatado.toLowerCase().includes(busca) &&
        !String(os.numero).includes(busca)
      ) {
        return false;
      }
      return true;
    });
  }, [ordens, filtroBusca, filtroTecnico, filtroStatus]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Ordens de serviço</h1>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe todas as OS em andamento no FluxOS.
          </p>
        </div>
        {podeCriar && (
          <button
            onClick={() => setMostrarForm((valor) => !valor)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {mostrarForm ? "Cancelar" : "Nova OS"}
          </button>
        )}
      </header>

      {mostrarForm && (
        <NovaOsForm
          onCriada={() => {
            setMostrarForm(false);
            carregarOrdens();
          }}
          onCancelar={() => setMostrarForm(false)}
        />
      )}

      {carregando && <p className="text-sm text-slate-500">Carregando...</p>}
      {erro && <p className="text-sm text-red-600">{erro}</p>}

      {!carregando && !erro && ordens.length === 0 && (
        <p className="text-sm text-slate-500">Nenhuma ordem de serviço cadastrada ainda.</p>
      )}

      {ordens.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">OS</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Problema relatado</th>
                <th className="px-4 py-3">Técnico</th>
                <th className="px-4 py-3">Status</th>
              </tr>
              <tr className="border-t border-slate-100">
                <th className="px-4 py-2" colSpan={2}>
                  <input
                    value={filtroBusca}
                    onChange={(e) => setFiltroBusca(e.target.value)}
                    placeholder="Filtrar por nº, cliente ou problema..."
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-normal normal-case text-slate-700 outline-none focus:border-slate-400"
                  />
                </th>
                <th className="px-4 py-2"></th>
                <th className="px-4 py-2">
                  <select
                    value={filtroTecnico}
                    onChange={(e) => setFiltroTecnico(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-normal normal-case text-slate-700 outline-none focus:border-slate-400"
                  >
                    <option value="todos">Todos</option>
                    <option value="sem_tecnico">Sem técnico</option>
                    {tecnicos.map((nome) => (
                      <option key={nome} value={nome}>
                        {nome}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="px-4 py-2">
                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value as StatusOs | "todos")}
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-normal normal-case text-slate-700 outline-none focus:border-slate-400"
                  >
                    <option value="todos">Todos</option>
                    {TODOS_STATUS.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABEL[status]}
                      </option>
                    ))}
                  </select>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ordensFiltradas.map((os) => (
                <tr
                  key={os.id}
                  onClick={() => navigate(`/ordens-servico/${os.id}`)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-mono text-slate-600">#{os.numero}</td>
                  <td className="px-4 py-3 text-slate-900">{os.cliente.nome}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-600">
                    {os.problemaRelatado}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{os.tecnico?.nome ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={os.status} />
                  </td>
                </tr>
              ))}
              {ordensFiltradas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Nenhuma ordem de serviço encontrada com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
