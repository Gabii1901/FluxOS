import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, urlArquivo } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { STATUS_LABEL, type OrdemServicoDetalhe } from "../types/ordemServico";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function OrdemServicoImpressaoPage() {
  const { id } = useParams<{ id: string }>();
  const { usuario } = useAuth();
  const [os, setOs] = useState<OrdemServicoDetalhe | null>(null);

  useEffect(() => {
    api.get<OrdemServicoDetalhe>(`/ordens-servico/${id}`).then((resposta) => setOs(resposta.data));
  }, [id]);

  if (!os) {
    return <p className="p-10 text-sm text-slate-500">Carregando...</p>;
  }

  const totalPecas = os.pecasUtilizadas.reduce(
    (soma, item) => soma + Number(item.quantidade) * Number(item.valorUnitario),
    0,
  );

  return (
    <div className="mx-auto max-w-2xl px-8 py-10 text-slate-900">
      <div className="mb-6 flex justify-end print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Imprimir
        </button>
      </div>

      <header className="mb-8 flex items-start justify-between border-b border-slate-300 pb-6">
        <div>
          <img src={`${import.meta.env.BASE_URL}logo_fluxos_wordmark.png`} alt="FluxOS" className="h-8 w-auto" />
          <p className="mt-2 text-sm text-slate-500">{usuario?.empresaNome}</p>
        </div>
        <div className="text-right">
          <h1 className="text-xl font-semibold">Ordem de Serviço</h1>
          <p className="font-mono text-sm text-slate-500">#{os.numero}</p>
          <p className="text-sm text-slate-500">{new Date(os.criadoEm).toLocaleDateString("pt-BR")}</p>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Cliente</p>
          <p className="font-medium">{os.cliente.nome}</p>
          {os.cliente.telefone && <p className="text-slate-600">{os.cliente.telefone}</p>}
          {os.cliente.email && <p className="text-slate-600">{os.cliente.email}</p>}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
          <p className="font-medium">{STATUS_LABEL[os.status]}</p>
          <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">Técnico</p>
          <p className="font-medium">{os.tecnico?.nome ?? "—"}</p>
        </div>
      </section>

      <section className="mb-6">
        <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">Problema relatado</p>
        <p className="rounded-lg border border-slate-200 p-3 text-sm">{os.problemaRelatado}</p>
      </section>

      {os.pecasUtilizadas.length > 0 && (
        <section className="mb-6">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Peças utilizadas</p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-xs uppercase text-slate-500">
                <th className="py-1.5">Peça</th>
                <th className="py-1.5 text-right">Qtd.</th>
                <th className="py-1.5 text-right">Valor unit.</th>
                <th className="py-1.5 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {os.pecasUtilizadas.map((item) => (
                <tr key={item.id}>
                  <td className="py-1.5">{item.peca.nome}</td>
                  <td className="py-1.5 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {Number(item.quantidade)}
                  </td>
                  <td className="py-1.5 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatarMoeda(Number(item.valorUnitario))}
                  </td>
                  <td className="py-1.5 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatarMoeda(Number(item.quantidade) * Number(item.valorUnitario))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-300 font-semibold">
                <td className="py-1.5" colSpan={3}>
                  Total em peças
                </td>
                <td className="py-1.5 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatarMoeda(totalPecas)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>
      )}

      {os.fotos.length > 0 && (
        <section className="mb-6 break-inside-avoid">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Fotos</p>
          <div className="grid grid-cols-3 gap-3">
            {os.fotos.map((foto) => (
              <img
                key={foto.id}
                src={urlArquivo(foto.url)}
                alt={foto.legenda ?? "Foto da OS"}
                className="h-32 w-full rounded-lg border border-slate-200 object-cover"
              />
            ))}
          </div>
        </section>
      )}

      <section className="mt-16 grid grid-cols-2 gap-12 text-center text-sm">
        <div>
          <div className="border-t border-slate-400 pt-2">Assinatura do cliente</div>
        </div>
        <div>
          <div className="border-t border-slate-400 pt-2">Assinatura do técnico</div>
        </div>
      </section>
    </div>
  );
}
