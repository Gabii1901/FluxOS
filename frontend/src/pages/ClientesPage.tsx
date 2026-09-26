import { useEffect, useMemo, useState, type FormEvent } from "react";
import { usePermissao } from "../hooks/usePermissao";
import { api } from "../lib/api";
import type { Cliente } from "../types/cliente";

type FiltroStatus = "todos" | "ativos" | "inativos";

export function ClientesPage() {
  const { pode } = usePermissao();
  const podeCriar = pode("clientes", "criar");
  const podeEditar = pode("clientes", "editar");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [documento, setDocumento] = useState("");

  const [filtroNome, setFiltroNome] = useState("");
  const [filtroContato, setFiltroContato] = useState("");
  const [filtroDocumento, setFiltroDocumento] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("ativos");

  function carregarClientes() {
    return api.get<Cliente[]>("/clientes").then((resposta) => setClientes(resposta.data));
  }

  useEffect(() => {
    carregarClientes().finally(() => setCarregando(false));
  }, []);

  function limparFormulario() {
    setNome("");
    setTelefone("");
    setEmail("");
    setDocumento("");
  }

  function abrirNovo() {
    setEditandoId(null);
    limparFormulario();
    setErro(null);
    setMostrarForm(true);
  }

  function abrirEdicao(cliente: Cliente) {
    setEditandoId(cliente.id);
    setNome(cliente.nome);
    setTelefone(cliente.telefone ?? "");
    setEmail(cliente.email ?? "");
    setDocumento(cliente.documento ?? "");
    setErro(null);
    setMostrarForm(true);
  }

  function fecharForm() {
    setMostrarForm(false);
    setEditandoId(null);
    limparFormulario();
  }

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const dados = {
        nome,
        telefone: telefone || undefined,
        email: email || undefined,
        documento: documento || undefined,
      };
      if (editandoId) {
        await api.patch(`/clientes/${editandoId}`, dados);
      } else {
        await api.post("/clientes", dados);
      }
      await carregarClientes();
      fecharForm();
    } catch {
      setErro("Não foi possível salvar o cliente. Confira os dados e tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleToggleAtivo(cliente: Cliente) {
    setAtualizandoId(cliente.id);
    try {
      await api.patch(`/clientes/${cliente.id}`, { ativo: !cliente.ativo });
      await carregarClientes();
    } finally {
      setAtualizandoId(null);
    }
  }

  const clientesFiltrados = useMemo(() => {
    const nomeBusca = filtroNome.trim().toLowerCase();
    const contatoBusca = filtroContato.trim().toLowerCase();
    const documentoBusca = filtroDocumento.trim().toLowerCase();

    return clientes.filter((cliente) => {
      if (filtroStatus === "ativos" && !cliente.ativo) return false;
      if (filtroStatus === "inativos" && cliente.ativo) return false;
      if (nomeBusca && !cliente.nome.toLowerCase().includes(nomeBusca)) return false;
      if (
        contatoBusca &&
        !(cliente.telefone ?? "").toLowerCase().includes(contatoBusca) &&
        !(cliente.email ?? "").toLowerCase().includes(contatoBusca)
      ) {
        return false;
      }
      if (documentoBusca && !(cliente.documento ?? "").toLowerCase().includes(documentoBusca)) return false;
      return true;
    });
  }, [clientes, filtroNome, filtroContato, filtroDocumento, filtroStatus]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Clientes</h1>
          <p className="mt-1 text-sm text-slate-500">Cadastro de clientes do FluxOS.</p>
        </div>
        {podeCriar && (
          <button
            onClick={() => (mostrarForm ? fecharForm() : abrirNovo())}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {mostrarForm ? "Cancelar" : "Novo cliente"}
          </button>
        )}
      </header>

      {mostrarForm && (editandoId ? podeEditar : podeCriar) && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2"
        >
          <h2 className="text-sm font-semibold text-slate-900 sm:col-span-2">
            {editandoId ? "Editar cliente" : "Novo cliente"}
          </h2>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Nome *</label>
            <input
              required
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Telefone</label>
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Documento (CPF/CNPJ)
            </label>
            <input
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {erro && <p className="sm:col-span-2 text-sm text-red-600">{erro}</p>}

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Salvar cliente"}
            </button>
          </div>
        </form>
      )}

      {carregando && <p className="text-sm text-slate-500">Carregando...</p>}

      {!carregando && clientes.length === 0 && (
        <p className="text-sm text-slate-500">Nenhum cliente cadastrado ainda.</p>
      )}

      {clientes.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Telefone / e-mail</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Status</th>
                {podeEditar && <th className="px-4 py-3"></th>}
              </tr>
              <tr className="border-t border-slate-100">
                <th className="px-4 py-2">
                  <input
                    value={filtroNome}
                    onChange={(e) => setFiltroNome(e.target.value)}
                    placeholder="Filtrar..."
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-normal normal-case text-slate-700 outline-none focus:border-slate-400"
                  />
                </th>
                <th className="px-4 py-2">
                  <input
                    value={filtroContato}
                    onChange={(e) => setFiltroContato(e.target.value)}
                    placeholder="Filtrar..."
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-normal normal-case text-slate-700 outline-none focus:border-slate-400"
                  />
                </th>
                <th className="px-4 py-2">
                  <input
                    value={filtroDocumento}
                    onChange={(e) => setFiltroDocumento(e.target.value)}
                    placeholder="Filtrar..."
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-normal normal-case text-slate-700 outline-none focus:border-slate-400"
                  />
                </th>
                <th className="px-4 py-2">
                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)}
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-normal normal-case text-slate-700 outline-none focus:border-slate-400"
                  >
                    <option value="todos">Todos</option>
                    <option value="ativos">Ativos</option>
                    <option value="inativos">Inativos</option>
                  </select>
                </th>
                {podeEditar && <th className="px-4 py-2"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientesFiltrados.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900">{cliente.nome}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {cliente.telefone ?? "—"}
                    {cliente.email ? ` · ${cliente.email}` : ""}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{cliente.documento ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        cliente.ativo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {cliente.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  {podeEditar && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => abrirEdicao(cliente)}
                        className="text-xs font-medium text-slate-600 hover:underline"
                      >
                        Editar
                      </button>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <button
                        onClick={() => handleToggleAtivo(cliente)}
                        disabled={atualizandoId === cliente.id}
                        className={`text-xs font-medium hover:underline disabled:opacity-40 ${
                          cliente.ativo ? "text-red-600" : "text-emerald-600"
                        }`}
                      >
                        {cliente.ativo ? "Inativar" : "Ativar"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {clientesFiltrados.length === 0 && (
                <tr>
                  <td colSpan={podeEditar ? 5 : 4} className="px-4 py-6 text-center text-slate-500">
                    Nenhum cliente encontrado com esses filtros.
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
