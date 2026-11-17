import { useEffect, useState } from "react";
import { api, urlArquivo } from "../lib/api";
import { formatarDocumento } from "../lib/cnpj";
import type { DadosEmpresa } from "../types/empresa";

/**
 * Bloco da esquerda do cabeçalho das impressões: logo da empresa (ou a do FluxOS,
 * se ela ainda não enviou uma), nome, CNPJ e cidade.
 */
export function CabecalhoEmpresaImpressao({ nomeEmpresa }: { nomeEmpresa?: string | null }) {
  const [empresa, setEmpresa] = useState<DadosEmpresa | null>(null);

  useEffect(() => {
    api
      .get<DadosEmpresa>("/empresa")
      .then((r) => setEmpresa(r.data))
      .catch(() => {});
  }, []);

  const nome = empresa?.nome ?? nomeEmpresa;
  const cidade = empresa?.enderecoCidade ? `${empresa.enderecoCidade}${empresa.enderecoUf ? `/${empresa.enderecoUf}` : ""}` : null;

  return (
    <div>
      {empresa?.logoUrl ? (
        <img src={urlArquivo(empresa.logoUrl)} alt={nome ?? "Logo"} className="h-14 w-auto max-w-[220px] object-contain" />
      ) : (
        <img src={`${import.meta.env.BASE_URL}logo_fluxos_wordmark.png`} alt="FluxOS" className="h-8 w-auto" />
      )}
      {nome && <p className="mt-2 text-sm font-medium text-slate-700">{nome}</p>}
      {(empresa?.cnpj || cidade) && (
        <p className="text-xs text-slate-500">
          {[empresa?.cnpj && `CNPJ ${formatarDocumento(empresa.cnpj)}`, cidade].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}
