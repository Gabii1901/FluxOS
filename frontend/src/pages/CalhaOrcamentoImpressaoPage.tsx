import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { CabecalhoEmpresaImpressao } from "../components/CabecalhoEmpresaImpressao";
import { PerfilCalhaDesenho } from "../components/PerfilCalhaDesenho";
import { usePermissao } from "../hooks/usePermissao";
import { api } from "../lib/api";
import type { DadosEmpresa } from "../types/empresa";
import {
  SERVICOS_EM_CHAPA,
  STATUS_ORCAMENTO_CALHA_LABEL,
  TIPO_SERVICO_LABEL,
  type OrcamentoCalha,
  type OrcamentoCalhaItem,
} from "../types/calha";

interface ModeloOrcamento {
  resumido: boolean;
  titulo: string;
  mostrarValoresItens: boolean;
  mostrarMedidas: boolean;
  mostrarMaterial: boolean;
  mostrarDesenhos: boolean;
  mostrarCroquis: boolean;
  mostrarMaoDeObra: boolean;
  mostrarAssinaturaCliente: boolean;
  apresentacao: string;
  prazoExecucao: string;
  condicoesPagamento: string;
  validadeDias: number;
  observacoes: string;
}

const MODELO_PADRAO: ModeloOrcamento = {
  resumido: false,
  titulo: "Orçamento de Calhas",
  mostrarValoresItens: true,
  mostrarMedidas: true,
  mostrarMaterial: true,
  mostrarDesenhos: true,
  mostrarCroquis: true,
  mostrarMaoDeObra: true,
  mostrarAssinaturaCliente: true,
  apresentacao: "",
  prazoExecucao: "",
  condicoesPagamento: "",
  validadeDias: 7,
  observacoes: "",
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function nomeServico(item: OrcamentoCalhaItem) {
  return item.tipoServico === "venda" ? "Venda" : TIPO_SERVICO_LABEL[item.tipoServico];
}

function medida(item: OrcamentoCalhaItem) {
  if (!SERVICOS_EM_CHAPA.includes(item.tipoServico)) return `${Number(item.quantidade)} un`;
  const corte = item.corteLargura ? ` · corte ${Number(item.corteLargura)}${item.unidadeCorte}` : "";
  return `${Number(item.quantidade)}${item.unidadeQuantidade}${corte}`;
}

const campo =
  "w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900";

function Opcao({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-0.5 text-sm text-slate-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
      {children}
    </label>
  );
}

function TextoCampo({ label, value, onChange, linhas = 2, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  linhas?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <textarea rows={linhas} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={campo} />
    </div>
  );
}

// Documento para o cliente: custo, margem e lucro nunca aparecem. O painel à
// esquerda (não sai na impressão) escolhe entre o modelo completo e o resumido
// e permite ajustar textos e o que é exibido.
export function CalhaOrcamentoImpressaoPage() {
  const { id } = useParams<{ id: string }>();
  const { pode } = usePermissao();
  const [orcamento, setOrcamento] = useState<OrcamentoCalha | null>(null);
  const [erro, setErro] = useState(false);
  const [modelo, setModelo] = useState<ModeloOrcamento>(MODELO_PADRAO);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<OrcamentoCalha>(`/calhas/orcamentos/${id}`)
      .then((resposta) => setOrcamento(resposta.data))
      .catch(() => setErro(true));
    api
      .get<DadosEmpresa>("/empresa")
      .then((r) => {
        if (r.data.modeloOrcamento) setModelo({ ...MODELO_PADRAO, ...(r.data.modeloOrcamento as Partial<ModeloOrcamento>) });
      })
      .catch(() => {});
  }, [id]);

  function alterar<K extends keyof ModeloOrcamento>(chave: K, valor: ModeloOrcamento[K]) {
    setModelo((m) => ({ ...m, [chave]: valor }));
    setAviso(null);
  }

  function escolherTipo(resumido: boolean) {
    setAviso(null);
    setModelo((m) => ({
      ...m,
      resumido,
      mostrarValoresItens: !resumido,
      mostrarDesenhos: !resumido,
      mostrarCroquis: !resumido,
      mostrarMaoDeObra: !resumido,
      mostrarMaterial: !resumido,
      mostrarMedidas: true,
    }));
  }

  async function salvarPadrao() {
    setSalvando(true);
    try {
      await api.put("/empresa/modelo-orcamento", modelo);
      setAviso("Salvo como padrão.");
    } catch (e: any) {
      setAviso(e?.response?.data?.erro ?? "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  if (erro) return <p className="p-10 text-sm text-slate-500">Orçamento não encontrado.</p>;
  if (!orcamento) return <p className="p-10 text-sm text-slate-500">Carregando...</p>;

  const totalMaoDeObra = orcamento.maoDeObra.reduce((soma, m) => soma + Number(m.custoTotal), 0);
  const horasMaoDeObra = orcamento.maoDeObra.reduce((soma, m) => soma + Number(m.horas), 0);
  const itensComFormato = orcamento.itens
    .map((item) => ({ item, segmentos: item.segmentosCustom ?? item.perfil?.segmentos ?? null }))
    .filter((x): x is { item: OrcamentoCalhaItem; segmentos: NonNullable<typeof x.segmentos> } => !!x.segmentos?.length);

  const emissao = new Date(orcamento.criadoEm);
  const validoAte = new Date(emissao);
  validoAte.setDate(validoAte.getDate() + modelo.validadeDias);

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white lg:flex">
      <aside className="border-b border-slate-200 bg-white p-5 print:hidden lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:flex-shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Personalizar orçamento</h2>

        <div className="mb-5 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm">
          {[
            { resumido: false, label: "Completo" },
            { resumido: true, label: "Resumido" },
          ].map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => escolherTipo(t.resumido)}
              className={`rounded-md py-1.5 font-medium ${
                modelo.resumido === t.resumido ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="-mt-3 mb-5 text-xs text-slate-500">
          {modelo.resumido
            ? "Só a lista de serviços e o valor total, sem desenhos nem valor por item."
            : "Valor de cada item, materiais, mão de obra e desenho das peças."}
        </p>

        <div className="mb-5 space-y-0.5">
          <p className="mb-1 text-xs font-medium text-slate-600">Exibir</p>
          <Opcao checked={modelo.mostrarValoresItens} onChange={(v) => alterar("mostrarValoresItens", v)}>
            Valor de cada item
          </Opcao>
          <Opcao checked={modelo.mostrarMedidas} onChange={(v) => alterar("mostrarMedidas", v)}>
            Medidas
          </Opcao>
          <Opcao checked={modelo.mostrarMaterial} onChange={(v) => alterar("mostrarMaterial", v)}>
            Material
          </Opcao>
          <Opcao checked={modelo.mostrarMaoDeObra} onChange={(v) => alterar("mostrarMaoDeObra", v)}>
            Mão de obra separada
          </Opcao>
          <Opcao checked={modelo.mostrarDesenhos} onChange={(v) => alterar("mostrarDesenhos", v)}>
            Desenho das peças
          </Opcao>
          <Opcao checked={modelo.mostrarCroquis} onChange={(v) => alterar("mostrarCroquis", v)}>
            Croquis (caimento, fora do padrão)
          </Opcao>
          <Opcao checked={modelo.mostrarAssinaturaCliente} onChange={(v) => alterar("mostrarAssinaturaCliente", v)}>
            Campo de assinatura do cliente
          </Opcao>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Título</label>
            <input value={modelo.titulo} onChange={(e) => alterar("titulo", e.target.value)} className={campo} />
          </div>
          <TextoCampo
            label="Texto de abertura"
            value={modelo.apresentacao}
            onChange={(v) => alterar("apresentacao", v)}
            placeholder="Ex.: Conforme visita técnica, segue nossa proposta."
          />
          <TextoCampo
            label="Prazo de execução"
            value={modelo.prazoExecucao}
            onChange={(v) => alterar("prazoExecucao", v)}
            linhas={1}
            placeholder="Ex.: 5 dias úteis após aprovação"
          />
          <TextoCampo
            label="Condições de pagamento"
            value={modelo.condicoesPagamento}
            onChange={(v) => alterar("condicoesPagamento", v)}
            placeholder="Ex.: 50% na aprovação e 50% na entrega"
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Validade (dias)</label>
            <input
              type="number"
              min={0}
              max={365}
              value={modelo.validadeDias}
              onChange={(e) => alterar("validadeDias", Math.max(0, Number(e.target.value) || 0))}
              className={`${campo} w-24`}
            />
          </div>
          <TextoCampo
            label="Observações"
            value={modelo.observacoes}
            onChange={(v) => alterar("observacoes", v)}
            linhas={3}
            placeholder="Ex.: Garantia de 1 ano para a instalação."
          />
        </div>

        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Imprimir / salvar PDF
          </button>
          {pode("orcamento_calhas", "editar") && (
            <button
              type="button"
              onClick={salvarPadrao}
              disabled={salvando}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Salvar como padrão da empresa"}
            </button>
          )}
          {aviso && <p className="text-center text-xs text-slate-500">{aviso}</p>}
          <p className="text-xs text-slate-400">Para gerar PDF, escolha "Salvar como PDF" na janela de impressão.</p>
        </div>
      </aside>

      <main className="flex-1 px-4 py-8 print:p-0">
        <div className="mx-auto max-w-2xl bg-white px-8 py-10 text-slate-900 shadow-sm print:max-w-none print:shadow-none">
          <header className="mb-8 flex items-start justify-between border-b border-slate-300 pb-6">
            <CabecalhoEmpresaImpressao nomeEmpresa={orcamento.empresa?.nome} />
            <div className="text-right">
              <h1 className="text-xl font-semibold">{modelo.titulo || "Orçamento"}</h1>
              <p className="text-sm text-slate-500">
                Nº {orcamento.numero}
                {orcamento.os && ` · OS #${orcamento.os.numero}`}
              </p>
              <p className="text-sm text-slate-500">{emissao.toLocaleDateString("pt-BR")}</p>
            </div>
          </header>

          <section className="mb-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400">Cliente</p>
              <p className="font-medium">{orcamento.cliente?.nome ?? "—"}</p>
              {orcamento.cliente?.documento && <p className="text-slate-600">{orcamento.cliente.documento}</p>}
              {orcamento.cliente?.telefone && <p className="text-slate-600">{orcamento.cliente.telefone}</p>}
              {orcamento.cliente?.email && <p className="text-slate-600">{orcamento.cliente.email}</p>}
            </div>
            <div>
              {modelo.resumido ? (
                modelo.validadeDias > 0 && (
                  <>
                    <p className="text-xs text-slate-400">Válido até</p>
                    <p className="font-medium">{validoAte.toLocaleDateString("pt-BR")}</p>
                  </>
                )
              ) : (
                <>
                  <p className="text-xs text-slate-400">Status</p>
                  <p className="font-medium">{STATUS_ORCAMENTO_CALHA_LABEL[orcamento.status]}</p>
                </>
              )}
            </div>
          </section>

          {modelo.apresentacao.trim() && (
            <p className="mb-6 whitespace-pre-line text-sm leading-relaxed">{modelo.apresentacao}</p>
          )}

          {orcamento.os?.problemaRelatado && (
            <section className="mb-6">
              <p className="mb-1 text-xs text-slate-400">Referente a</p>
              <p className="rounded-lg border border-slate-200 p-3 text-sm">{orcamento.os.problemaRelatado}</p>
            </section>
          )}

          <section className="mb-6">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-xs text-slate-500">
                  <th className="py-1.5 font-medium">Serviço / produto</th>
                  {modelo.mostrarMedidas && <th className="py-1.5 font-medium">Medida</th>}
                  {modelo.mostrarMaterial && <th className="py-1.5 font-medium">Material</th>}
                  {modelo.mostrarValoresItens && <th className="py-1.5 text-right font-medium">Valor</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orcamento.itens.map((item) => (
                  <tr key={item.id}>
                    <td className="py-1.5">
                      {nomeServico(item)}
                      {item.descricao && <span className="block text-xs text-slate-500">{item.descricao}</span>}
                      {item.perfil && <span className="block text-xs text-slate-500">{item.perfil.nome}</span>}
                    </td>
                    {modelo.mostrarMedidas && <td className="py-1.5 text-slate-600">{medida(item)}</td>}
                    {modelo.mostrarMaterial && (
                      <td className="py-1.5 text-slate-600">
                        {item.material ? `${item.material.nome}${item.material.tipo ? ` · ${item.material.tipo}` : ""}` : "—"}
                      </td>
                    )}
                    {modelo.mostrarValoresItens && (
                      <td className="py-1.5 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatarMoeda(Number(item.precoCalculado))}
                      </td>
                    )}
                  </tr>
                ))}
                {modelo.mostrarMaoDeObra && totalMaoDeObra > 0 && (
                  <tr>
                    <td className="py-1.5">Mão de obra</td>
                    {modelo.mostrarMedidas && <td className="py-1.5 text-slate-600">{horasMaoDeObra}h</td>}
                    {modelo.mostrarMaterial && <td className="py-1.5 text-slate-600">—</td>}
                    {modelo.mostrarValoresItens && (
                      <td className="py-1.5 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatarMoeda(totalMaoDeObra)}
                      </td>
                    )}
                  </tr>
                )}
              </tbody>
            </table>
            <div className="mt-2 flex items-baseline justify-between border-t border-slate-300 pt-2 text-base font-semibold">
              <span>Total{!modelo.mostrarMaoDeObra && totalMaoDeObra > 0 ? " (materiais e mão de obra)" : ""}</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatarMoeda(Number(orcamento.precoTotal))}</span>
            </div>
          </section>

          {(modelo.prazoExecucao.trim() ||
            modelo.condicoesPagamento.trim() ||
            (!modelo.resumido && modelo.validadeDias > 0)) && (
            <section className="mb-6 space-y-2 text-sm">
              {modelo.prazoExecucao.trim() && (
                <p>
                  <span className="text-slate-500">Prazo de execução: </span>
                  {modelo.prazoExecucao}
                </p>
              )}
              {modelo.condicoesPagamento.trim() && (
                <p className="whitespace-pre-line">
                  <span className="text-slate-500">Condições de pagamento: </span>
                  {modelo.condicoesPagamento}
                </p>
              )}
              {!modelo.resumido && modelo.validadeDias > 0 && (
                <p>
                  <span className="text-slate-500">Validade: </span>
                  até {validoAte.toLocaleDateString("pt-BR")}
                </p>
              )}
            </section>
          )}

          {modelo.observacoes.trim() && (
            <section className="mb-6">
              <p className="mb-1 text-xs text-slate-400">Observações</p>
              <p className="whitespace-pre-line text-sm">{modelo.observacoes}</p>
            </section>
          )}

          {modelo.mostrarDesenhos && itensComFormato.length > 0 && (
            <section className="mb-6 break-inside-avoid">
              <p className="mb-2 text-xs text-slate-400">Formato das peças</p>
              <div className="space-y-4">
                {itensComFormato.map(({ item, segmentos }) => (
                  <div key={item.id} className="break-inside-avoid rounded-lg border border-slate-200 p-3">
                    <p className="mb-1 text-sm font-medium">
                      {nomeServico(item)}
                      {item.perfil ? ` · ${item.perfil.nome}` : ""}
                      <span className="font-normal text-slate-500"> — {medida(item)}</span>
                    </p>
                    <div className="flex justify-center">
                      <PerfilCalhaDesenho segmentos={segmentos} className="w-full max-w-[420px]" />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Largura da chapa (soma das dobras):{" "}
                      {segmentos.reduce((s, x) => s + x.valorCm, 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} cm
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {modelo.mostrarCroquis && orcamento.itens.some((i) => i.croqui) && (
            <section className="mb-6">
              <p className="mb-2 text-xs text-slate-400">Croquis</p>
              <div className="space-y-4">
                {orcamento.itens
                  .filter((i) => i.croqui)
                  .map((item) => (
                    <div key={item.id} className="break-inside-avoid rounded-lg border border-slate-200 p-3">
                      <p className="mb-2 text-sm font-medium">
                        {nomeServico(item)}
                        {item.perfil ? ` · ${item.perfil.nome}` : ""}
                        {item.descricao ? ` · ${item.descricao}` : ""}
                      </p>
                      <img src={item.croqui!} alt={`Croqui de ${nomeServico(item)}`} className="w-full" />
                    </div>
                  ))}
              </div>
            </section>
          )}

          {modelo.mostrarAssinaturaCliente && (
            <section className="mt-16 grid grid-cols-2 gap-12 text-center text-sm">
              <div>
                <div className="border-t border-slate-400 pt-2">Assinatura do cliente</div>
              </div>
              <div>
                <div className="border-t border-slate-400 pt-2">Data</div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
