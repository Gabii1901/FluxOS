import { useEffect, useMemo, useState } from "react";
import { CampoMoeda } from "../components/CampoMoeda";
import { usePermissao } from "../hooks/usePermissao";
import { api } from "../lib/api";
import { consultarCnpj, formatarDocumento, resumoCnpj } from "../lib/cnpj";
import {
  FORMAS_PAGAMENTO,
  STATUS_CONTA_LABEL,
  hojeIso,
  statusDaConta,
  type CategoriaContaPagar,
  type ContaPagar,
  type ResumoContasPagar,
  type StatusContaPagar,
} from "../types/contaPagar";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(valor: string) {
  return new Date(valor).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

const STATUS_STYLE: Record<StatusContaPagar, string> = {
  aberta: "bg-amber-100 text-amber-800",
  vencida: "bg-red-100 text-red-700",
  paga: "bg-emerald-100 text-emerald-700",
};

interface FormState {
  descricao: string;
  categoriaId: string;
  fornecedorNome: string;
  fornecedorDocumento: string;
  valor: string;
  vencimento: string;
  formaPagamento: string;
  observacao: string;
  repetir: boolean;
  repetirMeses: string;
  jaPaga: boolean;
}

const FORM_VAZIO: FormState = {
  descricao: "",
  categoriaId: "",
  fornecedorNome: "",
  fornecedorDocumento: "",
  valor: "",
  vencimento: hojeIso(),
  formaPagamento: "",
  observacao: "",
  repetir: false,
  repetirMeses: "12",
  jaPaga: false,
};

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-slate-600";

export function ContasPagarPage() {
  const { pode } = usePermissao();
  const podeCriar = pode("financeiro", "criar");
  const podeEditar = pode("financeiro", "editar");
  const podeApagar = pode("financeiro", "apagar");

  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [categorias, setCategorias] = useState<CategoriaContaPagar[]>([]);
  const [resumo, setResumo] = useState<ResumoContasPagar | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [processandoId, setProcessandoId] = useState<string | null>(null);

  const [filtroStatus, setFiltroStatus] = useState<"todos" | StatusContaPagar>("todos");
  const [filtroDe, setFiltroDe] = useState("");
  const [filtroAte, setFiltroAte] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroBusca, setFiltroBusca] = useState("");

  const [formAberto, setFormAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [infoCnpj, setInfoCnpj] = useState("");

  const [gerenciandoCategorias, setGerenciandoCategorias] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState("");

  function carregarContas() {
    const params: Record<string, string> = {};
    if (filtroStatus !== "todos") params.status = filtroStatus;
    if (filtroDe) params.de = filtroDe;
    if (filtroAte) params.ate = filtroAte;
    if (filtroCategoria) params.categoriaId = filtroCategoria;
    return api.get<ContaPagar[]>("/contas-pagar", { params }).then((r) => setContas(r.data));
  }

  function carregarResumo() {
    return api.get<ResumoContasPagar>("/contas-pagar/resumo").then((r) => setResumo(r.data));
  }

  function carregarCategorias() {
    return api.get<CategoriaContaPagar[]>("/contas-pagar/categorias").then((r) => setCategorias(r.data));
  }

  async function recarregar() {
    await Promise.all([carregarContas(), carregarResumo()]);
  }

  useEffect(() => {
    carregarCategorias();
    carregarResumo();
  }, []);

  useEffect(() => {
    carregarContas().finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroStatus, filtroDe, filtroAte, filtroCategoria]);

  const contasFiltradas = useMemo(() => {
    const busca = filtroBusca.trim().toLowerCase();
    if (!busca) return contas;
    return contas.filter(
      (c) =>
        c.descricao.toLowerCase().includes(busca) ||
        (c.fornecedorNome ?? "").toLowerCase().includes(busca) ||
        (c.fornecedorDocumento ?? "").replace(/\D/g, "").includes(busca.replace(/\D/g, "") || "§"),
    );
  }, [contas, filtroBusca]);

  const totalListado = contasFiltradas.reduce((soma, c) => soma + Number(c.valor), 0);

  function atualizarForm<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function abrirNova() {
    setForm({ ...FORM_VAZIO, vencimento: hojeIso() });
    setEditandoId(null);
    setErroForm("");
    setInfoCnpj("");
    setFormAberto(true);
  }

  function abrirEdicao(conta: ContaPagar) {
    setForm({
      descricao: conta.descricao,
      categoriaId: conta.categoriaId ?? "",
      fornecedorNome: conta.fornecedorNome ?? "",
      fornecedorDocumento: conta.fornecedorDocumento ? formatarDocumento(conta.fornecedorDocumento) : "",
      valor: String(Number(conta.valor)),
      vencimento: conta.vencimento.slice(0, 10),
      formaPagamento: conta.formaPagamento ?? "",
      observacao: conta.observacao ?? "",
      repetir: false,
      repetirMeses: "12",
      jaPaga: false,
    });
    setEditandoId(conta.id);
    setErroForm("");
    setInfoCnpj("");
    setFormAberto(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function fecharForm() {
    setFormAberto(false);
    setEditandoId(null);
  }

  async function handleBuscarCnpj() {
    setBuscandoCnpj(true);
    setInfoCnpj("");
    try {
      const dados = await consultarCnpj(form.fornecedorDocumento);
      setForm((f) => ({
        ...f,
        fornecedorDocumento: formatarDocumento(dados.cnpj),
        fornecedorNome: dados.razaoSocial || dados.nomeFantasia || f.fornecedorNome,
      }));
      setInfoCnpj(resumoCnpj(dados));
    } catch (e: any) {
      setInfoCnpj(e.message);
    } finally {
      setBuscandoCnpj(false);
    }
  }

  async function handleSalvar(evento: React.FormEvent) {
    evento.preventDefault();
    setErroForm("");
    const valor = Number(form.valor);
    if (!form.descricao.trim()) return setErroForm("Informe a descrição.");
    if (!valor || valor <= 0) return setErroForm("Informe um valor maior que zero.");
    if (!form.vencimento) return setErroForm("Informe o vencimento.");

    const corpo = {
      descricao: form.descricao.trim(),
      categoriaId: form.categoriaId || null,
      fornecedorNome: form.fornecedorNome.trim() || null,
      fornecedorDocumento: form.fornecedorDocumento.replace(/\D/g, "") || null,
      valor,
      vencimento: form.vencimento,
      formaPagamento: form.formaPagamento || null,
      observacao: form.observacao.trim() || null,
    };

    setSalvando(true);
    try {
      if (editandoId) {
        await api.patch(`/contas-pagar/${editandoId}`, corpo);
      } else {
        const meses = form.repetir ? Math.min(60, Math.max(2, Number(form.repetirMeses) || 2)) : 1;
        await api.post("/contas-pagar", { ...corpo, repetirMeses: meses, jaPaga: form.jaPaga });
      }
      fecharForm();
      await recarregar();
    } catch (e: any) {
      setErroForm(e?.response?.data?.erro ?? "Não foi possível salvar a conta.");
    } finally {
      setSalvando(false);
    }
  }

  async function handlePagar(conta: ContaPagar) {
    setProcessandoId(conta.id);
    try {
      await api.patch(`/contas-pagar/${conta.id}/pagar`, {});
      await recarregar();
    } finally {
      setProcessandoId(null);
    }
  }

  async function handleReabrir(conta: ContaPagar) {
    if (!window.confirm("Desfazer o pagamento dessa conta?")) return;
    setProcessandoId(conta.id);
    try {
      await api.patch(`/contas-pagar/${conta.id}/reabrir`, {});
      await recarregar();
    } finally {
      setProcessandoId(null);
    }
  }

  async function handleExcluir(conta: ContaPagar) {
    let proximas = false;
    if (conta.grupoRecorrenciaId) {
      const escolha = window.prompt(
        `Essa conta é a parcela ${conta.parcela}/${conta.totalParcelas} de uma recorrência.\n\n` +
          "Digite 1 para excluir só esta parcela\nDigite 2 para excluir esta e as próximas em aberto",
        "1",
      );
      if (escolha === null) return;
      if (escolha.trim() === "2") proximas = true;
      else if (escolha.trim() !== "1") return;
    } else if (!window.confirm("Excluir essa conta? Essa ação não pode ser desfeita.")) {
      return;
    }

    setProcessandoId(conta.id);
    try {
      await api.delete(`/contas-pagar/${conta.id}`, { params: proximas ? { proximas: "true" } : {} });
      if (editandoId === conta.id) fecharForm();
      await recarregar();
    } finally {
      setProcessandoId(null);
    }
  }

  async function handleCriarCategoria() {
    const nome = novaCategoria.trim();
    if (!nome) return;
    const { data } = await api.post<CategoriaContaPagar>("/contas-pagar/categorias", { nome });
    setNovaCategoria("");
    await carregarCategorias();
    if (formAberto) atualizarForm("categoriaId", data.id);
  }

  async function handleRemoverCategoria(categoria: CategoriaContaPagar) {
    if (!window.confirm(`Remover a categoria "${categoria.nome}"? As contas já lançadas continuam com ela.`)) return;
    await api.delete(`/contas-pagar/categorias/${categoria.id}`);
    if (form.categoriaId === categoria.id) atualizarForm("categoriaId", "");
    if (filtroCategoria === categoria.id) setFiltroCategoria("");
    await carregarCategorias();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Contas a pagar</h1>
          <p className="mt-1 text-sm text-slate-500">Despesas da empresa: fornecedores, aluguel, impostos e demais contas.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setGerenciandoCategorias((v) => !v)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Categorias
          </button>
          {podeCriar && (
            <button
              type="button"
              onClick={abrirNova}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              + Nova conta
            </button>
          )}
        </div>
      </header>

      {resumo && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <CartaoResumo titulo="Em aberto" valor={resumo.emAberto.valor} qtd={resumo.emAberto.quantidade} />
          <CartaoResumo titulo="Próximos 7 dias" valor={resumo.proximos7Dias.valor} qtd={resumo.proximos7Dias.quantidade} cor="text-amber-600" />
          <CartaoResumo titulo="Vencido" valor={resumo.vencido.valor} qtd={resumo.vencido.quantidade} cor={resumo.vencido.valor > 0 ? "text-red-600" : undefined} />
          <CartaoResumo titulo="Pago no mês" valor={resumo.pagoNoMes.valor} qtd={resumo.pagoNoMes.quantidade} cor="text-emerald-600" />
        </div>
      )}

      {gerenciandoCategorias && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Categorias</h2>
          <div className="mb-4 flex flex-wrap gap-2">
            {categorias.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                {c.nome}
                {podeApagar && (
                  <button
                    type="button"
                    onClick={() => handleRemoverCategoria(c)}
                    className="text-slate-400 hover:text-red-600"
                    aria-label={`Remover ${c.nome}`}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          {podeCriar && (
            <div className="flex max-w-md gap-2">
              <input
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCriarCategoria())}
                placeholder="Nova categoria"
                className={inputClass}
              />
              <button
                type="button"
                onClick={handleCriarCategoria}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Adicionar
              </button>
            </div>
          )}
        </div>
      )}

      {formAberto && (
        <form onSubmit={handleSalvar} className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">{editandoId ? "Editar conta" : "Nova conta"}</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>CNPJ / CPF do fornecedor</label>
              <div className="flex gap-2">
                <input
                  value={form.fornecedorDocumento}
                  onChange={(e) => atualizarForm("fornecedorDocumento", e.target.value)}
                  onBlur={(e) => atualizarForm("fornecedorDocumento", formatarDocumento(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={handleBuscarCnpj}
                  disabled={buscandoCnpj}
                  className="whitespace-nowrap rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                >
                  {buscandoCnpj ? "Buscando..." : "Buscar na Receita"}
                </button>
              </div>
              {infoCnpj && <p className="mt-1 text-xs text-slate-500">{infoCnpj}</p>}
            </div>
            <div>
              <label className={labelClass}>Fornecedor / favorecido</label>
              <input
                value={form.fornecedorNome}
                onChange={(e) => atualizarForm("fornecedorNome", e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Descrição *</label>
              <input
                value={form.descricao}
                onChange={(e) => atualizarForm("descricao", e.target.value)}
                placeholder="Ex.: Compra de chapas, aluguel"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Categoria</label>
              <select
                value={form.categoriaId}
                onChange={(e) => atualizarForm("categoriaId", e.target.value)}
                className={inputClass}
              >
                <option value="">Sem categoria</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Valor (R$) *</label>
              <CampoMoeda
                value={form.valor}
                onChange={(v) => atualizarForm("valor", v)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{form.repetir ? "Vencimento da 1ª parcela *" : "Vencimento *"}</label>
              <input
                type="date"
                value={form.vencimento}
                onChange={(e) => atualizarForm("vencimento", e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Forma de pagamento</label>
              <select
                value={form.formaPagamento}
                onChange={(e) => atualizarForm("formaPagamento", e.target.value)}
                className={inputClass}
              >
                <option value="">—</option>
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Observação</label>
              <input
                value={form.observacao}
                onChange={(e) => atualizarForm("observacao", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {!editandoId && (
            <div className="mt-4 flex flex-wrap items-center gap-6 rounded-lg bg-slate-50 px-4 py-3 text-sm">
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={form.repetir}
                  onChange={(e) => atualizarForm("repetir", e.target.checked)}
                />
                Repetir mensalmente
              </label>
              {form.repetir && (
                <label className="flex items-center gap-2 text-slate-700">
                  por
                  <input
                    type="number"
                    min="2"
                    max="60"
                    value={form.repetirMeses}
                    onChange={(e) => atualizarForm("repetirMeses", e.target.value)}
                    className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  />
                  meses
                  {Number(form.valor) > 0 && Number(form.repetirMeses) > 1 && (
                    <span className="text-xs text-slate-500">
                      (total {formatarMoeda(Number(form.valor) * Number(form.repetirMeses))})
                    </span>
                  )}
                </label>
              )}
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={form.jaPaga}
                  onChange={(e) => atualizarForm("jaPaga", e.target.checked)}
                />
                {form.repetir ? "1ª parcela já paga" : "Já está paga"}
              </label>
            </div>
          )}

          {erroForm && <p className="mt-4 text-sm text-red-600">{erroForm}</p>}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={fecharForm}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex overflow-hidden rounded-lg border border-slate-300 text-sm">
          {(["todos", "aberta", "vencida", "paga"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFiltroStatus(s)}
              className={`px-3 py-2 font-medium ${filtroStatus === s ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
            >
              {s === "todos" ? "Todas" : STATUS_CONTA_LABEL[s]}
            </button>
          ))}
        </div>
        <div>
          <label className={labelClass}>Vencimento de</label>
          <input type="date" value={filtroDe} onChange={(e) => setFiltroDe(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>até</label>
          <input type="date" value={filtroAte} onChange={(e) => setFiltroAte(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Categoria</label>
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className={inputClass}>
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className={labelClass}>Buscar</label>
          <input
            value={filtroBusca}
            onChange={(e) => setFiltroBusca(e.target.value)}
            placeholder="Descrição, fornecedor ou CNPJ"
            className={inputClass}
          />
        </div>
      </div>

      {carregando && <p className="text-sm text-slate-500">Carregando...</p>}

      {!carregando && contasFiltradas.length === 0 && (
        <p className="text-sm text-slate-500">Nenhuma conta encontrada.</p>
      )}

      {contasFiltradas.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Fornecedor</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contasFiltradas.map((conta) => {
                const status = statusDaConta(conta);
                const ocupado = processandoId === conta.id;
                return (
                  <tr key={conta.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatarData(conta.vencimento)}</td>
                    <td className="px-4 py-3 text-slate-900">
                      {conta.descricao}
                      {conta.totalParcelas && (
                        <span className="ml-1 text-xs text-slate-500">
                          ({conta.parcela}/{conta.totalParcelas})
                        </span>
                      )}
                      {(conta.categoria || conta.formaPagamento) && (
                        <span className="block text-xs text-slate-500">
                          {[conta.categoria?.nome, conta.formaPagamento].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {conta.fornecedorNome ?? "—"}
                      {conta.fornecedorDocumento && (
                        <span className="block whitespace-nowrap text-xs text-slate-400">{formatarDocumento(conta.fornecedorDocumento)}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatarMoeda(Number(conta.valor))}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[status]}`}>
                        {STATUS_CONTA_LABEL[status]}
                      </span>
                      {conta.pagoEm && (
                        <span className="block whitespace-nowrap pt-1 text-xs text-slate-400">em {formatarData(conta.pagoEm)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-end gap-1 whitespace-nowrap">
                        {podeEditar && !conta.pagoEm && (
                          <button
                            type="button"
                            disabled={ocupado}
                            onClick={() => handlePagar(conta)}
                            className="text-xs font-medium text-emerald-700 hover:underline disabled:opacity-50"
                          >
                            Pagar
                          </button>
                        )}
                        {podeEditar && conta.pagoEm && (
                          <button
                            type="button"
                            disabled={ocupado}
                            onClick={() => handleReabrir(conta)}
                            className="text-xs font-medium text-slate-600 hover:underline disabled:opacity-50"
                          >
                            Desfazer
                          </button>
                        )}
                        {podeEditar && (
                          <button
                            type="button"
                            onClick={() => abrirEdicao(conta)}
                            className="text-xs font-medium text-slate-600 hover:underline"
                          >
                            Editar
                          </button>
                        )}
                        {podeApagar && (
                          <button
                            type="button"
                            disabled={ocupado}
                            onClick={() => handleExcluir(conta)}
                            className="text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 text-sm font-semibold">
                <td className="px-4 py-3" colSpan={3}>
                  Total listado ({contasFiltradas.length})
                </td>
                <td className="px-4 py-3 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatarMoeda(totalListado)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function CartaoResumo({ titulo, valor, qtd, cor }: { titulo: string; valor: number; qtd: number; cor?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{titulo}</p>
      <p className={`mt-1 text-lg font-semibold ${cor ?? "text-slate-900"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
        {formatarMoeda(valor)}
      </p>
      <p className="text-xs text-slate-400">
        {qtd} {qtd === 1 ? "conta" : "contas"}
      </p>
    </div>
  );
}
