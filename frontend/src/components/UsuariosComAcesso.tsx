import { useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { PAPEL_LABEL, type Papel } from "../types/auth";

interface Vinculo {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  ativo: boolean;
}

const campo =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900";

/** Admin (desenvolvedor): quem tem acesso a uma empresa, e vincular contas existentes a ela. */
export function UsuariosComAcesso({ empresaId }: { empresaId: string }) {
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<"admin" | "colaborador">("colaborador");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [removendoId, setRemovendoId] = useState<string | null>(null);

  function carregar() {
    return api
      .get<Vinculo[]>(`/admin/empresas/${empresaId}/usuarios`)
      .then((r) => setVinculos(r.data))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  async function handleVincular(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      await api.post(`/admin/empresas/${empresaId}/usuarios`, { email: email.trim(), papel });
      setEmail("");
      setPapel("colaborador");
      await carregar();
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? "Não foi possível dar acesso.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleRemover(v: Vinculo) {
    if (!window.confirm(`Remover o acesso de ${v.nome} (${v.email}) a esta empresa?`)) return;
    setRemovendoId(v.id);
    try {
      await api.delete(`/admin/empresas/${empresaId}/usuarios/${v.id}`);
      await carregar();
    } catch (e: any) {
      window.alert(e?.response?.data?.erro ?? "Não foi possível remover o acesso.");
    } finally {
      setRemovendoId(null);
    }
  }

  const ativos = vinculos.filter((v) => v.ativo);

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 text-sm font-semibold text-slate-900">Usuários com acesso</h2>
      <p className="mb-4 text-xs text-slate-500">
        Para dar acesso a alguém que já tem conta no FluxOS (em outra empresa), informe o e-mail. A pessoa entra com a
        mesma senha e troca de empresa pelo menu.
      </p>

      {carregando ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : ativos.length === 0 ? (
        <p className="mb-4 text-sm text-slate-500">Nenhum usuário com acesso.</p>
      ) : (
        <ul className="mb-5 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {ativos.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{v.nome}</p>
                <p className="truncate text-xs text-slate-500">{v.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {v.papel === "desenvolvedor" ? "Suporte FluxOS" : PAPEL_LABEL[v.papel]}
                </span>
                <button
                  type="button"
                  disabled={removendoId === v.id}
                  onClick={() => handleRemover(v)}
                  className="text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleVincular} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">E-mail da conta</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@email.com" className={campo} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Papel nesta empresa</label>
          <select value={papel} onChange={(e) => setPapel(e.target.value as "admin" | "colaborador")} className={campo}>
            <option value="colaborador">{PAPEL_LABEL.colaborador}</option>
            <option value="admin">{PAPEL_LABEL.admin}</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={salvando}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
        >
          {salvando ? "Salvando..." : "Dar acesso"}
        </button>
      </form>
      {papel === "colaborador" && (
        <p className="mt-2 text-xs text-slate-500">Colaborador entra sem permissões; libere os módulos na tela de Permissões da empresa.</p>
      )}
      {erro && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
    </section>
  );
}
