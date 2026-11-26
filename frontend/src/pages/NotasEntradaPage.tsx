import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePermissao } from "../hooks/usePermissao";
import { api } from "../lib/api";
import type { NotaEntrada, NotaEntradaDetalhe } from "../types/notaEntrada";

function moeda(valor: string | number) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function qtd(valor: string) {
  return Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
}

export function NotasEntradaPage() {
  const { pode } = usePermissao();
  const [notas, setNotas] = useState<NotaEntrada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberta, setAberta] = useState<NotaEntradaDetalhe | null>(null);

  useEffect(() => {
    api
      .get<NotaEntrada[]>("/notas-entrada")
      .then((r) => setNotas(r.data))
      .finally(() => setCarregando(false));
  }, []);

  const [excluindo, setExcluindo] = useState(false);

  async function excluir(nota: NotaEntradaDetalhe) {
    const confirmou = window.confirm(
      `Excluir a NF-e ${nota.numero}?\n\n` +
        "Isso desfaz o lançamento: tira do estoque o que entrou, apaga as contas a pagar geradas " +
        "e remove os produtos cadastrados por esta nota (se não foram usados em mais nada).",
    );
    if (!confirmou) return;
    setExcluindo(true);
    try {
      await api.delete(`/notas-entrada/${nota.id}`);
      setNotas((atual) => atual.filter((n) => n.id !== nota.id));
      setAberta(null);
    } catch (e: any) {
      window.alert(e?.response?.data?.erro ?? "Não foi possível excluir a nota.");
    } finally {
      setExcluindo(false);
    }
  }

  async function alternar(id: string) {
    if (aberta?.id === id) return setAberta(null);
    const { data } = await api.get<NotaEntradaDetalhe>(`/notas-entrada/${id}`);
    setAberta(data);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <Link to="/estoque" className="text-sm text-slate-500 hover:underline">
            ← Estoque
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Notas de entrada</h1>
          <p className="mt-1 text-sm text-slate-500">NF-e de compra lançadas por XML.</p>
        </div>
        {pode("estoque", "criar") && (
          <Link
            to="/estoque/notas/importar"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Importar XML
          </Link>
        )}
      </header>

      {carregando && <p className="text-sm text-slate-500">Carregando...</p>}
      {!carregando && notas.length === 0 && (
        <p className="text-sm text-slate-500">Nenhuma nota lançada ainda.</p>
      )}

      {notas.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nota</th>
                <th className="px-4 py-3">Fornecedor</th>
                <th className="px-4 py-3">Emissão</th>
                <th className="px-4 py-3">Itens</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {notas.map((nota) => (
                <Fragment key={nota.id}>
                  <tr onClick={() => alternar(nota.id)} className="cursor-pointer hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {nota.numero}
                      {nota.serie ? `/${nota.serie}` : ""}
                    </td>
                    <td className="px-4 py-3 text-slate-900">{nota.fornecedorNome}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(nota.dataEmissao).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{nota._count?.itens ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {moeda(nota.valorTotal)}
                    </td>
                  </tr>
                  {aberta?.id === nota.id && (
                    <tr>
                      <td colSpan={5} className="bg-slate-50 px-4 py-3">
                        <table className="w-full text-xs">
                          <thead className="text-slate-500">
                            <tr>
                              <th className="py-1 text-left">Item na nota</th>
                              <th className="py-1 text-left">Produto</th>
                              <th className="py-1 text-right">Entrada</th>
                              <th className="py-1 text-right">Custo un.</th>
                              <th className="py-1 text-right">Venda</th>
                            </tr>
                          </thead>
                          <tbody>
                            {aberta.itens.map((item) => (
                              <tr key={item.id} className="border-t border-slate-200">
                                <td className="py-1.5 text-slate-600">
                                  {qtd(item.quantidadeXml)} {item.unidadeXml} · {item.descricaoXml}
                                </td>
                                <td className="py-1.5">
                                  <Link to={`/estoque/${item.peca.id}`} className="text-slate-900 hover:underline">
                                    {item.peca.sku} — {item.peca.nome}
                                  </Link>
                                </td>
                                <td className="py-1.5 text-right">
                                  {qtd(item.quantidadeEntrada)} {item.peca.unidade}
                                </td>
                                <td className="py-1.5 text-right">{moeda(item.custoUnitario)}</td>
                                <td className="py-1.5 text-right">{moeda(item.precoVenda)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {aberta.contasPagar.length > 0 && (
                          <div className="mt-3 text-xs">
                            <p className="mb-1 font-medium text-slate-600">Contas a pagar</p>
                            {aberta.contasPagar.map((conta) => (
                              <p key={conta.id} className="text-slate-600">
                                {new Date(conta.vencimento).toLocaleDateString("pt-BR", { timeZone: "UTC" })} ·{" "}
                                {moeda(conta.valor)} · {conta.pagoEm ? "Paga" : "Em aberto"}
                              </p>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <p className="break-all font-mono text-[11px] text-slate-400">Chave: {aberta.chaveAcesso}</p>
                          {pode("estoque", "apagar") && (
                            <button
                              onClick={() => excluir(aberta)}
                              disabled={excluindo}
                              className="ml-4 whitespace-nowrap text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                            >
                              {excluindo ? "Excluindo..." : "Excluir nota e desfazer lançamento"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
