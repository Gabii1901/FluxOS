import { useEffect, useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CampoMoeda } from "../components/CampoMoeda";
import { api } from "../lib/api";
import { lerXmlNfe, type NfeItem, type NfeLida } from "../lib/nfe";
import type { ConferenciaNota } from "../types/notaEntrada";
import type { Peca } from "../types/peca";

const UNIDADES = ["UN", "PC", "CX", "PCT", "KG", "G", "M", "M2", "M3", "L", "ML", "RL", "PAR", "JG", "KIT"];

interface LinhaItem {
  xml: NfeItem;
  pecaId: string; // "" = cadastrar novo produto
  sku: string;
  nome: string;
  unidade: string;
  fator: string;
  precoVenda: string;
}

const inputCls =
  "w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900";

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function qtd(valor: number) {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
}

function formatarCnpj(doc: string) {
  return doc.length === 14
    ? doc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
    : doc;
}

function custoDaLinha(linha: LinhaItem) {
  const fator = Number(linha.fator) || 0;
  const quantidade = linha.xml.quantidade * fator;
  const custoTotal = linha.xml.valorTotal + linha.xml.valorFrete + linha.xml.valorIpi;
  return { quantidade, custo: quantidade > 0 ? custoTotal / quantidade : 0 };
}

export function ImportarNotaPage() {
  const navigate = useNavigate();
  const [nota, setNota] = useState<NfeLida | null>(null);
  const [linhas, setLinhas] = useState<LinhaItem[]>([]);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [jaLancada, setJaLancada] = useState<ConferenciaNota["jaLancada"]>(null);
  const [margem, setMargem] = useState("");
  const [gerarContas, setGerarContas] = useState(true);
  const [parcelas, setParcelas] = useState<{ numero: string; vencimento: string; valor: string }[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api.get<Peca[]>("/pecas").then((r) => setPecas(r.data));
  }, []);

  async function handleArquivo(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!arquivo) return;
    setErro(null);
    setNota(null);
    setLinhas([]);
    setJaLancada(null);

    let lida: NfeLida;
    try {
      lida = lerXmlNfe(await arquivo.text());
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível ler o XML.");
      return;
    }

    try {
      const { data } = await api.post<ConferenciaNota>("/notas-entrada/conferir", {
        chaveAcesso: lida.chaveAcesso,
        fornecedorCnpj: lida.fornecedorCnpj,
        codigos: lida.itens.map((i) => i.codigo),
      });
      const vinculoPorCodigo = new Map(data.vinculos.map((v) => [v.codigoFornecedor, v]));

      setJaLancada(data.jaLancada);
      setNota(lida);
      // Sem duplicatas no XML (pagamento à vista), sugere uma parcela única com o total.
      setGerarContas(true);
      setParcelas(
        lida.parcelas.length > 0
          ? lida.parcelas.map((p) => ({ numero: p.numero ?? "", vencimento: p.vencimento, valor: p.valor.toFixed(2) }))
          : [{ numero: "", vencimento: lida.dataEmissao.slice(0, 10), valor: lida.valorTotal.toFixed(2) }],
      );
      setLinhas(
        lida.itens.map((item) => {
          const vinculo = vinculoPorCodigo.get(item.codigo);
          if (vinculo) {
            return {
              xml: item,
              pecaId: vinculo.peca.id,
              sku: vinculo.peca.sku,
              nome: vinculo.peca.nome,
              unidade: vinculo.peca.unidade,
              fator: String(Number(vinculo.fatorConversao)),
              precoVenda: Number(vinculo.peca.valorUnitario) > 0 ? Number(vinculo.peca.valorUnitario).toFixed(2) : "",
            };
          }
          return {
            xml: item,
            pecaId: "",
            sku: item.codigo,
            nome: item.descricao,
            unidade: item.unidade,
            fator: "1",
            precoVenda: "",
          };
        }),
      );
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? "Não foi possível conferir a nota.");
    }
  }

  function alterar(indice: number, mudancas: Partial<LinhaItem>) {
    setLinhas((atual) => atual.map((l, i) => (i === indice ? { ...l, ...mudancas } : l)));
  }

  function escolherPeca(indice: number, pecaId: string) {
    const linha = linhas[indice];
    if (!pecaId) {
      alterar(indice, { pecaId: "", sku: linha.xml.codigo, nome: linha.xml.descricao, unidade: linha.xml.unidade });
      return;
    }
    const peca = pecas.find((p) => p.id === pecaId);
    if (!peca) return;
    alterar(indice, {
      pecaId,
      sku: peca.sku,
      nome: peca.nome,
      unidade: peca.unidade,
      precoVenda: Number(peca.valorUnitario) > 0 ? Number(peca.valorUnitario).toFixed(2) : linha.precoVenda,
    });
  }

  function aplicarMargem() {
    const percentual = Number(margem.replace(",", "."));
    if (!Number.isFinite(percentual)) return;
    setLinhas((atual) =>
      atual.map((l) => ({ ...l, precoVenda: (custoDaLinha(l).custo * (1 + percentual / 100)).toFixed(2) })),
    );
  }

  async function lancar() {
    if (!nota) return;
    setErro(null);

    const invalida = linhas.findIndex(
      (l) => !l.nome.trim() || !(Number(l.fator) > 0) || (!l.pecaId && !l.sku.trim()),
    );
    if (invalida >= 0) {
      setErro(`Item ${invalida + 1}: confira nome, SKU e fator de conversão.`);
      return;
    }

    if (gerarContas && parcelas.some((p) => !p.vencimento || !(Number(p.valor) > 0))) {
      setErro("Confira o vencimento e o valor de todas as parcelas.");
      return;
    }

    setSalvando(true);
    try {
      await api.post("/notas-entrada", {
        chaveAcesso: nota.chaveAcesso,
        numero: nota.numero,
        serie: nota.serie,
        fornecedorCnpj: nota.fornecedorCnpj,
        fornecedorNome: nota.fornecedorNome,
        dataEmissao: nota.dataEmissao,
        valorProdutos: nota.valorProdutos,
        valorTotal: nota.valorTotal,
        itens: linhas.map((l) => ({
          codigoFornecedor: l.xml.codigo,
          descricaoXml: l.xml.descricao,
          ncm: l.xml.ncm,
          unidadeXml: l.xml.unidade,
          quantidadeXml: l.xml.quantidade,
          valorUnitarioXml: l.xml.valorUnitario,
          valorTotal: l.xml.valorTotal,
          valorFrete: l.xml.valorFrete,
          valorIpi: l.xml.valorIpi,
          pecaId: l.pecaId || null,
          sku: l.pecaId ? null : l.sku.trim(),
          nome: l.nome.trim(),
          unidade: l.unidade,
          fatorConversao: Number(l.fator),
          precoVenda: Number(l.precoVenda) || 0,
        })),
        parcelas: gerarContas
          ? parcelas.map((p) => ({ numero: p.numero || null, vencimento: p.vencimento, valor: Number(p.valor) }))
          : [],
      });
      navigate("/estoque/notas");
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? "Não foi possível lançar a nota.");
    } finally {
      setSalvando(false);
    }
  }

  const somaItens = linhas.reduce((s, l) => s + l.xml.valorTotal, 0);
  const pecasAtivas = pecas.filter((p) => p.ativo);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <Link to="/estoque/notas" className="text-sm text-slate-500 hover:underline">
            ← Notas de entrada
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Importar NF-e (XML)</h1>
          <p className="mt-1 text-sm text-slate-500">
            Selecione o XML, confira os itens, ajuste nomes, conversões e preços e lance no estoque.
          </p>
        </div>
        <label className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          {nota ? "Trocar XML" : "Selecionar XML"}
          <input type="file" accept=".xml,text/xml,application/xml" className="hidden" onChange={handleArquivo} />
        </label>
      </header>

      {erro && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}

      {!nota && !erro && (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
          Nenhum XML carregado.
        </div>
      )}

      {nota && (
        <>
          <section className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-5 text-sm sm:grid-cols-4">
            <div className="col-span-2">
              <p className="text-xs uppercase text-slate-500">Fornecedor</p>
              <p className="font-medium text-slate-900">{nota.fornecedorNome}</p>
              <p className="text-slate-500">{formatarCnpj(nota.fornecedorCnpj)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Nota / Série</p>
              <p className="font-medium text-slate-900">
                {nota.numero}
                {nota.serie ? ` / ${nota.serie}` : ""}
              </p>
              <p className="text-slate-500">
                {nota.dataEmissao ? new Date(nota.dataEmissao).toLocaleDateString("pt-BR") : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Total da nota</p>
              <p className="font-medium text-slate-900">{moeda(nota.valorTotal)}</p>
              <p className="text-slate-500">Produtos: {moeda(nota.valorProdutos)}</p>
            </div>
            <p className="col-span-2 break-all font-mono text-xs text-slate-400 sm:col-span-4">
              Chave: {nota.chaveAcesso}
            </p>
          </section>

          {jaLancada && (
            <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Esta nota já foi lançada em {new Date(jaLancada.criadoEm).toLocaleDateString("pt-BR")}. Não é
              possível lançar de novo.
            </p>
          )}
          {Math.abs(somaItens - nota.valorProdutos) > 0.05 && (
            <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              A soma dos itens ({moeda(somaItens)}) não bate com o total de produtos da nota.
            </p>
          )}

          <div className="mb-4 flex flex-wrap items-end gap-2 text-sm">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Margem sobre o custo (%)</label>
              <input
                value={margem}
                onChange={(e) => setMargem(e.target.value)}
                inputMode="decimal"
                placeholder="ex: 60"
                className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-900"
              />
            </div>
            <button
              type="button"
              onClick={aplicarMargem}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Aplicar a todos os itens
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">Item na nota</th>
                  <th className="px-3 py-3">Produto no estoque</th>
                  <th className="px-3 py-3">Conversão</th>
                  <th className="px-3 py-3 text-right">Custo un.</th>
                  <th className="px-3 py-3">Preço de venda</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 align-top">
                {linhas.map((linha, i) => {
                  const { quantidade, custo } = custoDaLinha(linha);
                  const venda = Number(linha.precoVenda) || 0;
                  const margemItem = custo > 0 && venda > 0 ? ((venda - custo) / custo) * 100 : null;
                  return (
                    <tr key={i}>
                      <td className="max-w-xs px-3 py-3">
                        <p className="font-medium text-slate-900">{linha.xml.descricao}</p>
                        <p className="text-xs text-slate-500">
                          Cód. {linha.xml.codigo}
                          {linha.xml.ncm ? ` · NCM ${linha.xml.ncm}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-slate-600" style={{ fontVariantNumeric: "tabular-nums" }}>
                          {qtd(linha.xml.quantidade)} {linha.xml.unidade} × {moeda(linha.xml.valorUnitario)} ={" "}
                          {moeda(linha.xml.valorTotal)}
                        </p>
                        {(linha.xml.valorFrete > 0 || linha.xml.valorIpi > 0) && (
                          <p className="text-xs text-slate-500" style={{ fontVariantNumeric: "tabular-nums" }}>
                            {linha.xml.valorFrete > 0 && <>+ frete {moeda(linha.xml.valorFrete)} </>}
                            {linha.xml.valorIpi > 0 && <>+ IPI {moeda(linha.xml.valorIpi)}</>}
                          </p>
                        )}
                      </td>
                      <td className="w-80 space-y-1.5 px-3 py-3">
                        <select
                          value={linha.pecaId}
                          onChange={(e) => escolherPeca(i, e.target.value)}
                          className={inputCls}
                        >
                          <option value="">+ Cadastrar como novo produto</option>
                          {pecasAtivas.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku} — {p.nome}
                            </option>
                          ))}
                        </select>
                        {!linha.pecaId && (
                          <input
                            value={linha.sku}
                            onChange={(e) => alterar(i, { sku: e.target.value })}
                            placeholder="SKU"
                            className={`${inputCls} font-mono`}
                          />
                        )}
                        <input
                          value={linha.nome}
                          onChange={(e) => alterar(i, { nome: e.target.value })}
                          placeholder="Nome do produto"
                          className={inputCls}
                        />
                      </td>
                      <td className="w-56 px-3 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <span className="whitespace-nowrap">1 {linha.xml.unidade} =</span>
                          <input
                            value={linha.fator}
                            onChange={(e) => alterar(i, { fator: e.target.value.replace(",", ".") })}
                            inputMode="decimal"
                            className={`${inputCls} w-16 text-right`}
                          />
                          <select
                            value={linha.unidade}
                            onChange={(e) => alterar(i, { unidade: e.target.value })}
                            className={`${inputCls} w-20`}
                          >
                            {[...new Set([linha.unidade, ...UNIDADES])].map((u) => (
                              <option key={u}>{u}</option>
                            ))}
                          </select>
                        </div>
                        <p className="mt-1.5 text-xs font-medium text-emerald-700">
                          Entra no estoque: {qtd(quantidade)} {linha.unidade}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right text-slate-700" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {moeda(custo)}
                        <p className="text-xs text-slate-400">/{linha.unidade}</p>
                      </td>
                      <td className="w-36 px-3 py-3">
                        <CampoMoeda
                          value={linha.precoVenda}
                          onChange={(valor) => alterar(i, { precoVenda: valor })}
                          className={`${inputCls} text-right`}
                        />
                        {margemItem !== null && (
                          <p className={`mt-1 text-xs ${margemItem < 0 ? "text-red-600" : "text-slate-500"}`}>
                            Margem {margemItem.toFixed(1)}%
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 text-sm">
            <label className="flex items-center gap-2 font-medium text-slate-900">
              <input type="checkbox" checked={gerarContas} onChange={(e) => setGerarContas(e.target.checked)} />
              Gerar contas a pagar
              <span className="font-normal text-slate-500">
                ({nota.parcelas.length > 0 ? `${nota.parcelas.length} parcela(s) no XML` : "nota sem duplicatas"})
              </span>
            </label>

            {gerarContas && (
              <div className="mt-4 space-y-2">
                {parcelas.map((p, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <span className="w-16 text-xs text-slate-500">Parcela {i + 1}</span>
                    <input
                      type="date"
                      value={p.vencimento}
                      onChange={(e) =>
                        setParcelas((atual) => atual.map((x, j) => (j === i ? { ...x, vencimento: e.target.value } : x)))
                      }
                      className={`${inputCls} w-40`}
                    />
                    <CampoMoeda
                      value={p.valor}
                      onChange={(valor) => setParcelas((atual) => atual.map((x, j) => (j === i ? { ...x, valor } : x)))}
                      className={`${inputCls} w-32 text-right`}
                    />
                    {parcelas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setParcelas((atual) => atual.filter((_, j) => j !== i))}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex items-center gap-4 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setParcelas((atual) => [
                        ...atual,
                        { numero: "", vencimento: atual[atual.length - 1]?.vencimento ?? "", valor: "" },
                      ])
                    }
                    className="text-xs font-medium text-slate-700 hover:underline"
                  >
                    + Adicionar parcela
                  </button>
                  {(() => {
                    const soma = parcelas.reduce((s, p) => s + (Number(p.valor) || 0), 0);
                    const diferente = Math.abs(soma - nota.valorTotal) > 0.01;
                    return (
                      <span className={`text-xs ${diferente ? "text-amber-700" : "text-slate-500"}`}>
                        Soma das parcelas: {moeda(soma)}
                        {diferente ? ` (total da nota: ${moeda(nota.valorTotal)})` : ""}
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
          </section>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={lancar}
              disabled={salvando || !!jaLancada}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              {salvando ? "Lançando..." : "Lançar nota e dar entrada no estoque"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
