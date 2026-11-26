import { useEffect, useMemo, useRef, useState } from "react";
import { CampoMoeda } from "../components/CampoMoeda";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PerfilCalhaEditor } from "../components/PerfilCalhaEditor";
import { QuadroCroqui } from "../components/QuadroCroqui";
import { api } from "../lib/api";
import { descartarOrcamentoCalhaSeVazio } from "../lib/descarteOrcamentoCalha";
import {
  SERVICOS_EM_CHAPA,
  STATUS_ORCAMENTO_CALHA_LABEL,
  TIPO_SERVICO_LABEL,
  type MaterialChapa,
  type OrcamentoCalha,
  type PerfilCalha,
  type SegmentoPerfil,
  type StatusOrcamentoCalha,
  type TipoMedidaOrcamento,
  type TipoServicoCalha,
  type UnidadeComprimento,
} from "../types/calha";
import type { Cliente } from "../types/cliente";
import type { UsuarioResumo } from "../types/usuario";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function converterParaMetros(valor: number, unidade: UnidadeComprimento) {
  if (unidade === "cm") return valor / 100;
  if (unidade === "mm") return valor / 1000;
  return valor;
}

const campo = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900";
const rotulo = "mb-1 block text-sm font-medium text-slate-700";

const STATUS_STYLE: Record<StatusOrcamentoCalha, string> = {
  rascunho: "bg-slate-100 text-slate-600",
  enviado: "bg-amber-100 text-amber-800",
  aprovado: "bg-emerald-100 text-emerald-700",
  recusado: "bg-red-100 text-red-700",
};

export function CalhaOrcamentoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [orcamento, setOrcamento] = useState<OrcamentoCalha | null>(null);
  const [croquiItemId, setCroquiItemId] = useState<string | null>(null);
  const [materiais, setMateriais] = useState<MaterialChapa[]>([]);
  const [perfis, setPerfis] = useState<PerfilCalha[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [funcionarios, setFuncionarios] = useState<UsuarioResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState(false);

  const [tipoEmEdicao, setTipoEmEdicao] = useState<TipoServicoCalha | null>(null);

  const [clienteIdRascunho, setClienteIdRascunho] = useState("");
  const [statusRascunho, setStatusRascunho] = useState<StatusOrcamentoCalha>("rascunho");
  const [salvandoCabecalho, setSalvandoCabecalho] = useState(false);

  useEffect(() => {
    // Listas auxiliares podem falhar por falta de permissão (ex.: usuário sem acesso a Clientes);
    // nesse caso a tela abre com a lista vazia em vez de travar.
    const listaOuVazia = <T,>(caminho: string) =>
      api.get<T[]>(caminho).then((r) => r.data).catch(() => [] as T[]);

    Promise.all([
      api.get<OrcamentoCalha>(`/calhas/orcamentos/${id}`),
      listaOuVazia<MaterialChapa>("/calhas/materiais"),
      listaOuVazia<PerfilCalha>("/calhas/perfis"),
      listaOuVazia<Cliente>("/clientes"),
      listaOuVazia<UsuarioResumo>("/usuarios"),
    ])
      .then(([o, m, p, c, u]) => {
        setOrcamento(o.data);
        setClienteIdRascunho(o.data.clienteId ?? "");
        setStatusRascunho(o.data.status);
        setMateriais(m);
        setPerfis(p);
        setClientes(c);
        setFuncionarios(u.filter((f) => f.ativo));
      })
      .catch(() => setErroCarregamento(true))
      .finally(() => setCarregando(false));
  }, [id]);

  // Ao sair da tela (Voltar, menu, etc.), um orçamento que continua vazio é descartado,
  // para não sobrar orçamento zerado na lista nem na OS.
  const orcamentoAtual = useRef<OrcamentoCalha | null>(null);
  orcamentoAtual.current = orcamento;
  useEffect(() => {
    return () => {
      const o = orcamentoAtual.current;
      if (o && o.status === "rascunho" && o.itens.length === 0 && o.maoDeObra.length === 0) {
        descartarOrcamentoCalhaSeVazio(o.id);
      }
    };
  }, [id]);

  async function recarregar() {
    const resposta = await api.get<OrcamentoCalha>(`/calhas/orcamentos/${id}`);
    setOrcamento(resposta.data);
  }

  const cabecalhoSujo = !!orcamento && (clienteIdRascunho !== (orcamento.clienteId ?? "") || statusRascunho !== orcamento.status);

  function handleCancelarCabecalho() {
    if (!orcamento) return;
    setClienteIdRascunho(orcamento.clienteId ?? "");
    setStatusRascunho(orcamento.status);
  }

  async function handleSalvarCabecalho() {
    setSalvandoCabecalho(true);
    try {
      await api.patch(`/calhas/orcamentos/${id}`, {
        clienteId: clienteIdRascunho || null,
        status: statusRascunho,
      });
      await recarregar();
    } finally {
      setSalvandoCabecalho(false);
    }
  }

  async function handleRemoverItem(itemId: string) {
    if (!window.confirm("Remover esse item do orçamento?")) return;
    await api.delete(`/calhas/orcamentos/${id}/itens/${itemId}`);
    recarregar();
  }

  async function handleSalvarCroqui(itemId: string, croqui: string | null) {
    try {
      await api.put(`/calhas/orcamentos/${id}/itens/${itemId}/croqui`, { croqui });
      setCroquiItemId(null);
      recarregar();
    } catch (e: any) {
      window.alert(e?.response?.data?.erro ?? "Não foi possível salvar o croqui.");
    }
  }

  async function handleRemoverDespesa(despesaId: string) {
    if (!window.confirm("Remover essa despesa do orçamento?")) return;
    await api.delete(`/calhas/orcamentos/${id}/despesas/${despesaId}`);
    recarregar();
  }

  async function handleRemoverMaoDeObra(maoDeObraId: string) {
    if (!window.confirm("Remover essa mão de obra do orçamento?")) return;
    await api.delete(`/calhas/orcamentos/${id}/mao-de-obra/${maoDeObraId}`);
    recarregar();
  }

  if (erroCarregamento) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-sm text-slate-500">Orçamento não encontrado.</p>
        <button type="button" onClick={() => navigate("/orcamento-calhas")} className="mt-3 text-sm font-medium text-slate-900 underline">
          Voltar para a lista
        </button>
      </div>
    );
  }

  if (carregando || !orcamento) {
    return <div className="mx-auto max-w-5xl px-6 py-10 text-sm text-slate-500">Carregando...</div>;
  }

  const lucro = Number(orcamento.precoTotal) - Number(orcamento.custoTotal);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <button
        type="button"
        onClick={() => navigate(orcamento.os ? `/ordens-servico/${orcamento.os.id}` : "/orcamento-calhas")}
        className="mb-4 text-xs font-medium text-slate-500 hover:text-slate-900"
      >
        {orcamento.os ? `← Voltar para a OS #${orcamento.os.numero}` : "← Voltar"}
      </button>

      <header className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Orçamento #{orcamento.numero}</h1>
            {orcamento.os && (
              <p className="mt-1 text-sm text-slate-500">
                Vinculado à{" "}
                <Link to={`/ordens-servico/${orcamento.os.id}`} className="font-medium text-slate-900 underline">
                  OS #{orcamento.os.numero}
                </Link>{" "}
                — o cliente vem da OS
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={`/orcamento-calhas/${orcamento.id}/imprimir`}
              target="_blank"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-900"
            >
              Imprimir / PDF
            </Link>
            <Link
              to={`/orcamento-calhas/${orcamento.id}/producao`}
              target="_blank"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-900"
            >
              Folha de produção
            </Link>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[orcamento.status]}`}
            >
              {STATUS_ORCAMENTO_CALHA_LABEL[orcamento.status]}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={rotulo}>Cliente</label>
            <select
              value={clienteIdRascunho}
              onChange={(e) => setClienteIdRascunho(e.target.value)}
              disabled={!!orcamento.os}
              className={`${campo} disabled:bg-slate-50 disabled:text-slate-500`}
            >
              <option value="">Sem cliente definido</option>
              {orcamento.cliente && !clientes.some((c) => c.id === orcamento.cliente!.id) && (
                <option value={orcamento.cliente.id}>{orcamento.cliente.nome}</option>
              )}
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={rotulo}>Status</label>
            <select
              value={statusRascunho}
              onChange={(e) => setStatusRascunho(e.target.value as StatusOrcamentoCalha)}
              className={campo}
            >
              {(Object.keys(STATUS_ORCAMENTO_CALHA_LABEL) as StatusOrcamentoCalha[]).map((status) => (
                <option key={status} value={status}>{STATUS_ORCAMENTO_CALHA_LABEL[status]}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Resumo */}
      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Custo</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{formatarMoeda(Number(orcamento.custoTotal))}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Preço final</p>
            <p className="mt-1 text-lg font-semibold text-blue-700">{formatarMoeda(Number(orcamento.precoTotal))}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Lucro</p>
            <p className="mt-1 text-lg font-semibold text-green-700">+{formatarMoeda(lucro)}</p>
          </div>
        </div>
      </div>

      {/* Serviços e produtos */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Serviços e produtos</h2>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {([...SERVICOS_EM_CHAPA, "adicional", "venda"] as TipoServicoCalha[]).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => setTipoEmEdicao(tipo === tipoEmEdicao ? null : tipo)}
              className={`rounded-xl border px-4 py-4 text-center text-sm font-medium transition ${
                tipoEmEdicao === tipo
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              {TIPO_SERVICO_LABEL[tipo]}
            </button>
          ))}
        </div>

        {tipoEmEdicao && (
          <ItemForm
            key={tipoEmEdicao}
            orcamentoId={orcamento.id}
            tipoServico={tipoEmEdicao}
            materiais={materiais}
            perfis={perfis}
            acrescimoPadrao={Number(orcamento.acrescimoPercentual)}
            onAdicionado={() => {
              setTipoEmEdicao(null);
              recarregar();
            }}
            onCancelar={() => setTipoEmEdicao(null)}
          />
        )}

        {orcamento.itens.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Serviço</th>
                  <th className="px-4 py-3">Medida</th>
                  <th className="px-4 py-3">Custo</th>
                  <th className="px-4 py-3">Preço</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orcamento.itens.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {item.tipoServico === "venda" ? "Venda" : TIPO_SERVICO_LABEL[item.tipoServico]}
                      {item.descricao && <span className="block text-xs text-slate-400">{item.descricao}</span>}
                      {(item.perfil || item.segmentosCustom) && (
                        <span className="block text-xs text-slate-400">
                          {item.perfil?.nome ?? "Formato"}
                          {item.segmentosCustom ? " (personalizado)" : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {SERVICOS_EM_CHAPA.includes(item.tipoServico)
                        ? `${Number(item.quantidade)}${item.unidadeQuantidade}`
                        : `${Number(item.quantidade)} un`}
                      {item.corteLargura && ` · Corte ${Number(item.corteLargura)}${item.unidadeCorte}`}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatarMoeda(Number(item.custoCalculado))}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{formatarMoeda(Number(item.precoCalculado))}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {item.croqui && (
                          <img src={item.croqui} alt="Croqui" className="h-8 w-12 rounded border border-slate-200 object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => setCroquiItemId(item.id)}
                          className="whitespace-nowrap text-xs font-medium text-slate-600 hover:underline"
                        >
                          {item.croqui ? "Editar croqui" : "Croqui"}
                        </button>
                        <button type="button" onClick={() => handleRemoverItem(item.id)} className="text-xs font-medium text-red-700 hover:underline">
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {croquiItemId && orcamento && (
        <QuadroCroqui
          titulo="Croqui do item"
          imagemInicial={orcamento.itens.find((i) => i.id === croquiItemId)?.croqui}
          onFechar={() => setCroquiItemId(null)}
          onSalvar={(imagem) => handleSalvarCroqui(croquiItemId, imagem)}
        />
      )}

      {/* Mão de obra */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Mão de obra</h2>
        <MaoDeObraForm orcamentoId={orcamento.id} funcionarios={funcionarios} onAdicionado={recarregar} />

        {orcamento.maoDeObra.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Funcionário</th>
                  <th className="px-4 py-3">Valor/hora</th>
                  <th className="px-4 py-3">Horas</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orcamento.maoDeObra.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{m.usuario.nome}</td>
                    <td className="px-4 py-3 text-slate-600">{formatarMoeda(Number(m.valorHora))}</td>
                    <td className="px-4 py-3 text-slate-600">{m.horas}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{formatarMoeda(Number(m.custoTotal))}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => handleRemoverMaoDeObra(m.id)} className="text-xs font-medium text-red-700 hover:underline">
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Outras despesas */}
      <section className="mb-8">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Outras despesas</h2>
        <p className="mb-3 text-sm text-slate-500">
          Deslocamento, combustível, alimentação, andaime, frete… Entram no total pelo valor informado, sem margem.
        </p>
        <DespesaForm orcamentoId={orcamento.id} onAdicionado={recarregar} />

        {orcamento.despesas.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-slate-100">
                {orcamento.despesas.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{d.descricao}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatarMoeda(Number(d.valor))}
                    </td>
                    <td className="w-24 px-4 py-3 text-right">
                      <button type="button" onClick={() => handleRemoverDespesa(d.id)} className="text-xs font-medium text-red-700 hover:underline">
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50">
                <tr>
                  <td className="px-4 py-2.5 text-sm text-slate-600">Total de despesas</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatarMoeda(orcamento.despesas.reduce((s, d) => s + Number(d.valor), 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleCancelarCabecalho}
          disabled={salvandoCabecalho || !cabecalhoSujo}
          className="rounded-lg border border-red-300 px-5 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSalvarCabecalho}
          disabled={salvandoCabecalho || !cabecalhoSujo}
          className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
        >
          {salvandoCabecalho ? "Salvando..." : "Salvar orçamento"}
        </button>
      </div>
    </div>
  );
}

function ItemForm({
  orcamentoId,
  tipoServico,
  materiais,
  perfis,
  acrescimoPadrao,
  onAdicionado,
  onCancelar,
}: {
  orcamentoId: string;
  tipoServico: TipoServicoCalha;
  materiais: MaterialChapa[];
  perfis: PerfilCalha[];
  acrescimoPadrao: number;
  onAdicionado: () => void;
  onCancelar: () => void;
}) {
  const ehMetal = SERVICOS_EM_CHAPA.includes(tipoServico);

  const [descricao, setDescricao] = useState("");
  const [tipoMedida, setTipoMedida] = useState<TipoMedidaOrcamento>(SERVICOS_EM_CHAPA.includes(tipoServico) ? "metro" : "unidade");
  const [quantidade, setQuantidade] = useState("");
  const [unidadeQuantidade, setUnidadeQuantidade] = useState<UnidadeComprimento>("m");
  const [corteLargura, setCorteLargura] = useState("");
  const [unidadeCorte, setUnidadeCorte] = useState<UnidadeComprimento>("cm");
  const [materialId, setMaterialId] = useState("");
  const [perfilId, setPerfilId] = useState("");
  const [segmentosCustom, setSegmentosCustom] = useState<SegmentoPerfil[] | null>(null);
  const [editorAberto, setEditorAberto] = useState(false);
  const [croqui, setCroqui] = useState<string | null>(null);
  const [croquiAberto, setCroquiAberto] = useState(false);
  const [valorUnitario, setValorUnitario] = useState("");
  const [acrescimoPercentual, setAcrescimoPercentual] = useState(acrescimoPadrao);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const perfilSelecionado = perfis.find((p) => p.id === perfilId);

  // O corte é a largura da chapa antes da dobra, ou seja, a soma dos segmentos do formato.
  function aplicarCorteDoFormato(segmentos: SegmentoPerfil[]) {
    const total = segmentos.reduce((soma, s) => soma + s.valorCm, 0);
    if (total <= 0) return;
    setCorteLargura(String(Math.round(total * 10) / 10).replace(".", ","));
    setUnidadeCorte("cm");
  }
  const totalSegmentosCustom = segmentosCustom?.reduce((soma, s) => soma + s.valorCm, 0) ?? null;

  const preview = useMemo(() => {
    const qtd = Number(quantidade.replace(",", ".")) || 0;
    let custo = 0;
    if (ehMetal) {
      const material = materiais.find((m) => m.id === materialId);
      const corte = Number(corteLargura.replace(",", ".")) || 0;
      if (material && corte > 0 && qtd > 0) {
        const areaM2 = converterParaMetros(qtd, unidadeQuantidade) * converterParaMetros(corte, unidadeCorte);
        custo = areaM2 * Number(material.precoM2);
      }
    } else {
      custo = (Number(valorUnitario.replace(",", ".")) || 0) * qtd;
    }
    const preco = custo * (1 + acrescimoPercentual / 100);
    return { custo, preco };
  }, [quantidade, unidadeQuantidade, corteLargura, unidadeCorte, materialId, valorUnitario, acrescimoPercentual, ehMetal, materiais]);

  async function handleAdicionar() {
    setErro(null);
    if (ehMetal && (!corteLargura || !materialId)) {
      setErro("Informe o corte e o material.");
      return;
    }
    setEnviando(true);
    try {
      await api.post(`/calhas/orcamentos/${orcamentoId}/itens`, {
        tipoServico,
        descricao: descricao || undefined,
        tipoMedida,
        quantidade: Number(quantidade.replace(",", ".")) || 0,
        unidadeQuantidade,
        corteLargura: ehMetal ? Number(corteLargura.replace(",", ".")) : undefined,
        unidadeCorte: ehMetal ? unidadeCorte : undefined,
        materialId: ehMetal ? materialId : undefined,
        perfilId: ehMetal && perfilId ? perfilId : undefined,
        valorUnitario: !ehMetal ? Number(valorUnitario.replace(",", ".")) || 0 : undefined,
        segmentosCustom: ehMetal && segmentosCustom ? segmentosCustom : undefined,
        croqui: croqui ?? undefined,
        acrescimoPercentual,
      });
      onAdicionado();
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? "Não foi possível adicionar o item.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">{TIPO_SERVICO_LABEL[tipoServico]}</p>
        <button type="button" onClick={onCancelar} className="text-xs font-medium text-slate-500 hover:text-slate-900">
          Cancelar
        </button>
      </div>

      {!ehMetal && (
        <div className="mb-4">
          <label className={rotulo}>Descrição</label>
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} className={campo} placeholder="Descreva o serviço ou produto" />
        </div>
      )}

      {ehMetal && (
      <div className="mb-4">
        <label className={rotulo}>Tipo de orçamento</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTipoMedida("metro")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${tipoMedida === "metro" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700"}`}
          >
            Por metro
          </button>
          <button
            type="button"
            onClick={() => setTipoMedida("unidade")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${tipoMedida === "unidade" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700"}`}
          >
            Por unidade
          </button>
        </div>
      </div>
      )}

      <div className={`mb-4 grid gap-3 ${ehMetal ? "grid-cols-2" : "grid-cols-1"}`}>
        <div>
          <label className={rotulo}>{ehMetal ? "Quantidade" : "Quantidade (unidades)"}</label>
          <input value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className={campo} placeholder={ehMetal ? "3" : "1"} />
        </div>
        {ehMetal && (
          <div>
            <label className={rotulo}>Unidade</label>
            <select value={unidadeQuantidade} onChange={(e) => setUnidadeQuantidade(e.target.value as UnidadeComprimento)} className={campo}>
              <option value="m">m</option>
              <option value="cm">cm</option>
              <option value="mm">mm</option>
            </select>
          </div>
        )}
      </div>

      {ehMetal && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className={rotulo}>Corte (largura)</label>
              <input value={corteLargura} onChange={(e) => setCorteLargura(e.target.value)} className={campo} placeholder="40" />
              <p className="mt-1 text-xs text-slate-400">Largura da chapa antes da dobra</p>
            </div>
            <div>
              <label className={rotulo}>Unidade do corte</label>
              <select value={unidadeCorte} onChange={(e) => setUnidadeCorte(e.target.value as UnidadeComprimento)} className={campo}>
                <option value="cm">cm</option>
                <option value="mm">mm</option>
                <option value="m">m</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className={rotulo}>Material / chapa</label>
            <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} className={campo}>
              <option value="">Selecione...</option>
              {materiais.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}{m.espessuraMm ? ` (${m.espessuraMm}mm${m.tipo ? ` · ${m.tipo}` : ""})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className={rotulo}>Formato (perfil)</label>
            <div className="flex items-center gap-2">
              <select
                value={perfilId}
                onChange={(e) => {
                  setPerfilId(e.target.value);
                  setSegmentosCustom(null);
                  const perfil = perfis.find((p) => p.id === e.target.value);
                  if (perfil) aplicarCorteDoFormato(perfil.segmentos);
                }}
                className={campo}
              >
                <option value="">Sem perfil específico</option>
                {perfis.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setEditorAberto(true)}
                className="whitespace-nowrap rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-900"
              >
                Desenhar
              </button>
            </div>
            {perfilSelecionado && !segmentosCustom && (
              <p className="mt-1 text-xs text-slate-500">{perfilSelecionado.descricao}</p>
            )}
            {segmentosCustom && (
              <p className="mt-1 text-xs text-blue-700">
                Formato personalizado — {segmentosCustom.length} segmentos, total {totalSegmentosCustom?.toFixed(1)}cm
              </p>
            )}
            {croqui && (
              <div className="mt-2 flex items-center gap-3">
                <img src={croqui} alt="Croqui" className="h-12 w-20 rounded border border-slate-200 object-cover" />
                <span className="text-xs text-slate-600">Croqui anexado</span>
                <button type="button" onClick={() => setCroqui(null)} className="text-xs font-medium text-red-700 hover:underline">
                  Remover
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {editorAberto && (
        <PerfilCalhaEditor
          segmentosIniciais={segmentosCustom ?? perfilSelecionado?.segmentos ?? []}
          nomeInicial={perfilSelecionado?.nome}
          croquiInicial={croqui}
          onFechar={() => setEditorAberto(false)}
          onUsar={(segmentos, novoCroqui) => {
            if (segmentos && segmentos.length > 0) {
              setSegmentosCustom(segmentos);
              aplicarCorteDoFormato(segmentos);
            }
            setCroqui(novoCroqui);
            setEditorAberto(false);
          }}
        />
      )}

      {!ehMetal && (
      <div className="mb-4">
        <label className={rotulo}>Croqui (caimento, fora do padrão)</label>
        <div className="flex items-center gap-3">
          {croqui && <img src={croqui} alt="Croqui" className="h-14 w-24 rounded border border-slate-200 object-cover" />}
          <button
            type="button"
            onClick={() => setCroquiAberto(true)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-900"
          >
            {croqui ? "Editar croqui" : "Desenhar croqui"}
          </button>
          {croqui && (
            <button type="button" onClick={() => setCroqui(null)} className="text-xs font-medium text-red-700 hover:underline">
              Remover
            </button>
          )}
        </div>
      </div>
      )}

      {croquiAberto && (
        <QuadroCroqui
          imagemInicial={croqui}
          onFechar={() => setCroquiAberto(false)}
          onSalvar={(imagem) => {
            setCroqui(imagem);
            setCroquiAberto(false);
          }}
        />
      )}

      {!ehMetal && (
        <div className="mb-4">
          <label className={rotulo}>Valor unitário (R$)</label>
          <CampoMoeda value={valorUnitario} onChange={setValorUnitario} className={campo} />
        </div>
      )}

      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <label className={rotulo}>Acréscimo (margem)</label>
          <span className="text-sm font-semibold text-slate-900">{acrescimoPercentual}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={200}
          value={acrescimoPercentual}
          onChange={(e) => setAcrescimoPercentual(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="mb-4 rounded-lg bg-slate-50 px-4 py-3 text-sm">
        <div className="flex justify-between text-slate-600">
          <span>Custo</span>
          <span>{formatarMoeda(preview.custo)}</span>
        </div>
        <div className="flex justify-between font-medium text-slate-900">
          <span>Preço</span>
          <span>{formatarMoeda(preview.preco)}</span>
        </div>
      </div>

      {erro && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

      <button
        type="button"
        onClick={handleAdicionar}
        disabled={enviando}
        className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {enviando ? "Adicionando..." : "Adicionar"}
      </button>
    </div>
  );
}

function MaoDeObraForm({
  orcamentoId,
  funcionarios,
  onAdicionado,
}: {
  orcamentoId: string;
  funcionarios: UsuarioResumo[];
  onAdicionado: () => void;
}) {
  const [usuarioId, setUsuarioId] = useState("");
  const [valorHora, setValorHora] = useState("");
  const [horas, setHoras] = useState("1");
  const [enviando, setEnviando] = useState(false);

  async function handleAdicionar() {
    if (!usuarioId || !valorHora) return;
    setEnviando(true);
    try {
      await api.post(`/calhas/orcamentos/${orcamentoId}/mao-de-obra`, {
        usuarioId,
        valorHora: Number(valorHora.replace(",", ".")),
        horas: Number(horas.replace(",", ".")) || 1,
      });
      setUsuarioId("");
      setValorHora("");
      setHoras("1");
      onAdicionado();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)} className={campo}>
          <option value="">Funcionário...</option>
          {funcionarios.map((f) => (
            <option key={f.id} value={f.id}>{f.nome}</option>
          ))}
        </select>
        <CampoMoeda value={valorHora} onChange={setValorHora} className={campo} placeholder="Valor/hora (R$)" />
        <input value={horas} onChange={(e) => setHoras(e.target.value)} className={campo} placeholder="Horas" />
        <button
          type="button"
          onClick={handleAdicionar}
          disabled={enviando}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {enviando ? "..." : "Adicionar"}
        </button>
      </div>
    </div>
  );
}

const SUGESTOES_DESPESA = ["Deslocamento", "Combustível", "Alimentação", "Andaime / equipamento", "Frete", "Hospedagem"];

function DespesaForm({ orcamentoId, onAdicionado }: { orcamentoId: string; onAdicionado: () => void }) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function adicionar() {
    setErro(null);
    if (!descricao.trim()) return setErro("Informe a descrição.");
    if (!(Number(valor) > 0)) return setErro("Informe o valor.");
    setEnviando(true);
    try {
      await api.post(`/calhas/orcamentos/${orcamentoId}/despesas`, { descricao: descricao.trim(), valor: Number(valor) });
      setDescricao("");
      setValor("");
      onAdicionado();
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? "Não foi possível adicionar a despesa.");
    } finally {
      setEnviando(false);
    }
  }

  const campoDespesa =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {SUGESTOES_DESPESA.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setDescricao(s)}
            className={`rounded-full border px-3 py-1 text-xs ${
              descricao === s ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700 hover:border-slate-900"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Descrição da despesa"
          className={campoDespesa}
        />
        <CampoMoeda value={valor} onChange={setValor} className={`${campoDespesa} sm:w-40`} />
        <button
          type="button"
          onClick={adicionar}
          disabled={enviando}
          className="whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {enviando ? "Adicionando..." : "Adicionar despesa"}
        </button>
      </div>
      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
