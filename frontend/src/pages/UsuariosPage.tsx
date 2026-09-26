import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../contexts/AuthContext";
import { usePermissao } from "../hooks/usePermissao";
import { NIVEL_PAPEL, PAPEL_LABEL, type Papel } from "../types/auth";
import { api } from "../lib/api";
import type { UsuarioResumo } from "../types/usuario";

const TODOS_PAPEIS: Papel[] = ["desenvolvedor", "admin", "colaborador"];
type FiltroStatus = "todos" | "ativos" | "inativos";
type FiltroPapel = "todos" | Papel;

export function UsuariosPage() {
  const { usuario: usuarioLogado } = useAuth();
  const { pode } = usePermissao();
  const podeCriar = pode("usuarios", "criar");
  const podeEditar = pode("usuarios", "editar");
  const meuNivel = usuarioLogado ? NIVEL_PAPEL[usuarioLogado.papel] : -1;
  const papeisAtribuiveis = TODOS_PAPEIS.filter((p) => NIVEL_PAPEL[p] <= meuNivel);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [papel, setPapel] = useState<Papel>("colaborador");
  const [ativo, setAtivo] = useState(true);

  const [filtroBusca, setFiltroBusca] = useState("");
  const [filtroPapel, setFiltroPapel] = useState<FiltroPapel>("todos");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("ativos");

  function carregarUsuarios() {
    return api.get<UsuarioResumo[]>("/usuarios").then((resposta) => setUsuarios(resposta.data));
  }

  useEffect(() => {
    carregarUsuarios().finally(() => setCarregando(false));
  }, []);

  function limparFormulario() {
    setNome("");
    setEmail("");
    setSenha("");
    setPapel("colaborador");
    setAtivo(true);
  }

  function abrirNovo() {
    setEditandoId(null);
    limparFormulario();
    setErro(null);
    setMostrarForm(true);
  }

  function abrirEdicao(usuario: UsuarioResumo) {
    setEditandoId(usuario.id);
    setNome(usuario.nome);
    setEmail(usuario.email);
    setSenha("");
    setPapel(usuario.papel);
    setAtivo(usuario.ativo);
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
      if (editandoId) {
        await api.patch(`/usuarios/${editandoId}`, {
          nome,
          email,
          papel,
          ativo,
          senha: senha || undefined,
        });
      } else {
        await api.post("/usuarios", { nome, email, senha, papel });
      }
      await carregarUsuarios();
      fecharForm();
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? "Não foi possível salvar o usuário.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleToggleAtivo(usuario: UsuarioResumo) {
    setAtualizandoId(usuario.id);
    try {
      await api.patch(`/usuarios/${usuario.id}`, { ativo: !usuario.ativo });
      await carregarUsuarios();
    } finally {
      setAtualizandoId(null);
    }
  }

  const usuariosFiltrados = useMemo(() => {
    const busca = filtroBusca.trim().toLowerCase();

    return usuarios.filter((usuario) => {
      if (filtroStatus === "ativos" && !usuario.ativo) return false;
      if (filtroStatus === "inativos" && usuario.ativo) return false;
      if (filtroPapel !== "todos" && usuario.papel !== filtroPapel) return false;
      if (
        busca &&
        !usuario.nome.toLowerCase().includes(busca) &&
        !usuario.email.toLowerCase().includes(busca)
      ) {
        return false;
      }
      return true;
    });
  }, [usuarios, filtroBusca, filtroPapel, filtroStatus]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Usuários</h1>
          <p className="mt-1 text-sm text-slate-500">Equipe com acesso ao FluxOS.</p>
        </div>
        {podeCriar && (
          <button
            onClick={() => (mostrarForm ? fecharForm() : abrirNovo())}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {mostrarForm ? "Cancelar" : "Novo usuário"}
          </button>
        )}
      </header>

      {mostrarForm && (editandoId ? podeEditar : podeCriar) && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2"
        >
          <h2 className="text-sm font-semibold text-slate-900 sm:col-span-2">
            {editandoId ? "Editar usuário" : "Novo usuário"}
          </h2>
          <div>
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
            <label className="mb-1 block text-sm font-medium text-slate-700">E-mail *</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {editandoId ? "Nova senha (opcional)" : "Senha *"}
            </label>
            <input
              required={!editandoId}
              type="password"
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              placeholder={editandoId ? "deixe em branco para manter" : "mínimo 6 caracteres"}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Papel *</label>
            <select
              value={papel}
              onChange={(e) => setPapel(e.target.value as Papel)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            >
              {papeisAtribuiveis.map((p) => (
                <option key={p} value={p}>
                  {PAPEL_LABEL[p]}
                </option>
              ))}
            </select>
          </div>

          {editandoId && (
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Usuário ativo
            </label>
          )}

          {erro && <p className="sm:col-span-2 text-sm text-red-600">{erro}</p>}

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Salvar usuário"}
            </button>
          </div>
        </form>
      )}

      {carregando && <p className="text-sm text-slate-500">Carregando...</p>}

      {!carregando && usuarios.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">Status</th>
                {podeEditar && <th className="px-4 py-3"></th>}
              </tr>
              <tr className="border-t border-slate-100">
                <th className="px-4 py-2" colSpan={2}>
                  <input
                    value={filtroBusca}
                    onChange={(e) => setFiltroBusca(e.target.value)}
                    placeholder="Filtrar por nome ou e-mail..."
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-normal normal-case text-slate-700 outline-none focus:border-slate-400"
                  />
                </th>
                <th className="px-4 py-2">
                  <select
                    value={filtroPapel}
                    onChange={(e) => setFiltroPapel(e.target.value as FiltroPapel)}
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-normal normal-case text-slate-700 outline-none focus:border-slate-400"
                  >
                    <option value="todos">Todos</option>
                    {TODOS_PAPEIS.map((p) => (
                      <option key={p} value={p}>
                        {PAPEL_LABEL[p]}
                      </option>
                    ))}
                  </select>
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
              {usuariosFiltrados.map((usuario) => {
                const consigoGerenciar = NIVEL_PAPEL[usuario.papel] <= meuNivel;
                const souEu = usuario.id === usuarioLogado?.id;

                return (
                <tr key={usuario.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900">{usuario.nome}</td>
                  <td className="px-4 py-3 text-slate-600">{usuario.email}</td>
                  <td className="px-4 py-3 text-slate-600">{PAPEL_LABEL[usuario.papel]}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        usuario.ativo
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {usuario.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  {podeEditar && (
                    <td className="px-4 py-3 text-right">
                      {consigoGerenciar && (
                        <>
                          <button
                            onClick={() => abrirEdicao(usuario)}
                            className="text-xs font-medium text-slate-600 hover:underline"
                          >
                            Editar
                          </button>
                          {!souEu && (
                            <>
                              <span className="mx-1.5 text-slate-300">·</span>
                              <button
                                onClick={() => handleToggleAtivo(usuario)}
                                disabled={atualizandoId === usuario.id}
                                className={`text-xs font-medium hover:underline disabled:opacity-40 ${
                                  usuario.ativo ? "text-red-600" : "text-emerald-600"
                                }`}
                              >
                                {usuario.ativo ? "Inativar" : "Ativar"}
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </td>
                  )}
                </tr>
                );
              })}
              {usuariosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={podeEditar ? 5 : 4} className="px-4 py-6 text-center text-slate-500">
                    Nenhum usuário encontrado com esses filtros.
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
