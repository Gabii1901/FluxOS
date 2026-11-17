import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

interface EmpresaAcesso {
  empresaId: string;
  empresaNome: string;
  papel: string;
  atual: boolean;
}

/**
 * Mostra a empresa atual no rodapé do menu. Se a conta tiver acesso a mais de
 * uma empresa, vira uma lista para trocar sem precisar sair.
 */
export function SeletorEmpresa() {
  const { usuario, trocarEmpresa } = useAuth();
  const [empresas, setEmpresas] = useState<EmpresaAcesso[]>([]);
  const [trocando, setTrocando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<EmpresaAcesso[]>("/auth/empresas")
      .then((r) => setEmpresas(r.data))
      .catch(() => {});
  }, [usuario?.empresaId]);

  if (!usuario) return null;

  if (empresas.length <= 1) {
    return <p className="mt-1 truncate text-xs text-slate-500" title={usuario.empresaNome}>{usuario.empresaNome}</p>;
  }

  async function handleTrocar(empresaId: string) {
    if (empresaId === usuario!.empresaId) return;
    setErro(null);
    setTrocando(true);
    try {
      await trocarEmpresa(empresaId);
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? "Não foi possível trocar de empresa.");
      setTrocando(false);
    }
  }

  return (
    <div className="mt-2">
      <label htmlFor="seletor-empresa" className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
        Empresa
      </label>
      <select
        id="seletor-empresa"
        value={usuario.empresaId}
        disabled={trocando}
        onChange={(e) => handleTrocar(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-slate-900 disabled:opacity-60"
      >
        {empresas.map((e) => (
          <option key={e.empresaId} value={e.empresaId}>
            {e.empresaNome}
          </option>
        ))}
      </select>
      {trocando && <p className="mt-1 text-xs text-slate-500">Trocando...</p>}
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
