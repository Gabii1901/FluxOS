import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { PAPEL_LABEL, type Papel } from "../types/auth";
import { MODULOS, MODULO_LABEL, mapaPermissoesVazio, type Acao, type MapaPermissoes } from "../types/permissao";

interface UsuarioResumo {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  ativo: boolean;
}

const ACOES: { chave: Acao; label: string }[] = [
  { chave: "ver", label: "Ver" },
  { chave: "criar", label: "Criar" },
  { chave: "editar", label: "Editar" },
  { chave: "apagar", label: "Apagar" },
];

export function PermissoesPage() {
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [permissoes, setPermissoes] = useState<MapaPermissoes>(mapaPermissoesVazio());
  const [carregandoPermissoes, setCarregandoPermissoes] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    api
      .get<UsuarioResumo[]>("/permissoes/usuarios")
      .then((resposta) => setUsuarios(resposta.data))
      .finally(() => setCarregando(false));
  }, []);

  function selecionar(usuarioId: string) {
    setSelecionadoId(usuarioId);
    setErro(null);
    setSucesso(false);
    setCarregandoPermissoes(true);
    api
      .get<{ permissoes: MapaPermissoes }>(`/permissoes/usuarios/${usuarioId}`)
      .then((resposta) => setPermissoes(resposta.data.permissoes))
      .finally(() => setCarregandoPermissoes(false));
  }

  function alternar(modulo: (typeof MODULOS)[number], acao: Acao) {
    setPermissoes((atual) => ({
      ...atual,
      [modulo]: { ...atual[modulo], [acao]: !atual[modulo][acao] },
    }));
  }

  function marcarLinhaToda(modulo: (typeof MODULOS)[number], valor: boolean) {
    setPermissoes((atual) => ({
      ...atual,
      [modulo]: { ver: valor, criar: valor, editar: valor, apagar: valor },
    }));
  }

  async function salvar() {
    if (!selecionadoId) return;
    setErro(null);
    setSucesso(false);
    setSalvando(true);
    try {
      await api.put(`/permissoes/usuarios/${selecionadoId}`, { permissoes });
      setSucesso(true);
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? "Não foi possível salvar as permissões.");
    } finally {
      setSalvando(false);
    }
  }

  const usuarioSelecionado = usuarios.find((u) => u.id === selecionadoId);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Permissões</h1>
        <p className="mt-1 text-sm text-slate-500">
          Defina o que cada pessoa pode ver, criar, editar e apagar em cada tela do FluxOS. Usuários com
          papel Desenvolvedor sempre têm acesso total e não aparecem aqui.
        </p>
      </header>

      {carregando && <p className="text-sm text-slate-500">Carregando...</p>}

      {!carregando && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-2">
            {usuarios
              .filter((u) => u.papel !== "desenvolvedor")
              .map((usuario) => (
                <button
                  key={usuario.id}
                  onClick={() => selecionar(usuario.id)}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    selecionadoId === usuario.id
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="block font-medium">{usuario.nome}</span>
                  <span
                    className={`block text-xs ${
                      selecionadoId === usuario.id ? "text-slate-300" : "text-slate-400"
                    }`}
                  >
                    {PAPEL_LABEL[usuario.papel]}
                    {!usuario.ativo && " · inativo"}
                  </span>
                </button>
              ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            {!selecionadoId && (
              <p className="text-sm text-slate-500">Selecione uma pessoa à esquerda para editar as permissões.</p>
            )}

            {selecionadoId && carregandoPermissoes && (
              <p className="text-sm text-slate-500">Carregando permissões...</p>
            )}

            {selecionadoId && !carregandoPermissoes && (
              <>
                <h2 className="mb-4 text-sm font-semibold text-slate-900">
                  Permissões de {usuarioSelecionado?.nome}
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="py-2 pr-4">Tela</th>
                        {ACOES.map((acao) => (
                          <th key={acao.chave} className="py-2 px-3 text-center">
                            {acao.label}
                          </th>
                        ))}
                        <th className="py-2 pl-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {MODULOS.map((modulo) => (
                        <tr key={modulo}>
                          <td className="py-2.5 pr-4 font-medium text-slate-900">{MODULO_LABEL[modulo]}</td>
                          {ACOES.map((acao) => (
                            <td key={acao.chave} className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={permissoes[modulo][acao.chave]}
                                onChange={() => alternar(modulo, acao.chave)}
                                className="h-4 w-4 rounded border-slate-300"
                              />
                            </td>
                          ))}
                          <td className="py-2.5 pl-3 text-right">
                            <button
                              onClick={() => marcarLinhaToda(modulo, true)}
                              className="text-xs font-medium text-slate-500 hover:underline"
                            >
                              Tudo
                            </button>
                            <span className="mx-1 text-slate-300">·</span>
                            <button
                              onClick={() => marcarLinhaToda(modulo, false)}
                              className="text-xs font-medium text-slate-500 hover:underline"
                            >
                              Nada
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {erro && <p className="mt-4 text-sm text-red-600">{erro}</p>}
                {sucesso && <p className="mt-4 text-sm text-emerald-600">Permissões salvas.</p>}

                <button
                  onClick={salvar}
                  disabled={salvando}
                  className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {salvando ? "Salvando..." : "Salvar permissões"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
