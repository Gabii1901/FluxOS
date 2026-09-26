import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { OrcamentoForm } from "../components/OrcamentoForm";
import { StatusBadge } from "../components/StatusBadge";
import { usePermissao } from "../hooks/usePermissao";
import { api, urlArquivo } from "../lib/api";
import {
  STATUS_LABEL,
  TODOS_STATUS,
  type OrdemServicoDetalhe,
  type StatusOs,
} from "../types/ordemServico";
import { STATUS_ORCAMENTO_LABEL } from "../types/orcamento";
import { STATUS_PAGAMENTO_LABEL, STATUS_PARCELA_LABEL } from "../types/faturamento";
import type { Peca } from "../types/peca";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(valor: string) {
  return new Date(valor).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function OrdemServicoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const { pode } = usePermissao();
  const podeEditarOs = pode("ordens_servico", "editar");
  const podeCriarOrcamento = pode("orcamentos", "criar");
  const podeEditarOrcamento = pode("orcamentos", "editar");
  const podeCriarFinanceiro = pode("financeiro", "criar");
  const podeEditarFinanceiro = pode("financeiro", "editar");
  const podeApagarFinanceiro = pode("financeiro", "apagar");
  const [os, setOs] = useState<OrdemServicoDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [novoStatus, setNovoStatus] = useState<StatusOs | "">("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [pecasDisponiveis, setPecasDisponiveis] = useState<Peca[]>([]);
  const [pecaSelecionada, setPecaSelecionada] = useState("");
  const [quantidadePeca, setQuantidadePeca] = useState("1");
  const [salvandoPeca, setSalvandoPeca] = useState(false);
  const [erroPeca, setErroPeca] = useState<string | null>(null);

  const [mostrarFormOrcamento, setMostrarFormOrcamento] = useState(false);
  const [atualizandoOrcamentoId, setAtualizandoOrcamentoId] = useState<string | null>(null);

  const [gerandoFatura, setGerandoFatura] = useState(false);
  const [erroFatura, setErroFatura] = useState<string | null>(null);
  const [valorPagamento, setValorPagamento] = useState("");
  const [metodoPagamento, setMetodoPagamento] = useState("pix");
  const [vencimentoPagamento, setVencimentoPagamento] = useState("");
  const [pagoImediatamente, setPagoImediatamente] = useState(true);
  const [salvandoPagamento, setSalvandoPagamento] = useState(false);
  const [erroPagamento, setErroPagamento] = useState<string | null>(null);
  const [editandoVencimentoId, setEditandoVencimentoId] = useState<string | null>(null);
  const [novoVencimento, setNovoVencimento] = useState("");
  const [atualizandoPagamentoId, setAtualizandoPagamentoId] = useState<string | null>(null);

  const [confirmadoPorCliente, setConfirmadoPorCliente] = useState(false);
  const [garantiaDias, setGarantiaDias] = useState("90");
  const [registrandoEntrega, setRegistrandoEntrega] = useState(false);
  const [erroEntrega, setErroEntrega] = useState<string | null>(null);

  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  function carregar() {
    return api
      .get<OrdemServicoDetalhe>(`/ordens-servico/${id}`)
      .then((resposta) => setOs(resposta.data));
  }

  useEffect(() => {
    carregar().finally(() => setCarregando(false));
    api.get<Peca[]>("/pecas").then((resposta) => setPecasDisponiveis(resposta.data));
  }, [id]);

  async function handleAdicionarPeca() {
    if (!pecaSelecionada) return;
    setErroPeca(null);
    setSalvandoPeca(true);
    try {
      await api.post(`/ordens-servico/${id}/pecas`, {
        pecaId: pecaSelecionada,
        quantidade: Number(quantidadePeca),
      });
      setPecaSelecionada("");
      setQuantidadePeca("1");
      await carregar();
    } catch (e: any) {
      setErroPeca(e?.response?.data?.erro ?? "Não foi possível adicionar a peça.");
    } finally {
      setSalvandoPeca(false);
    }
  }

  async function handleRemoverPeca(itemId: string) {
    await api.delete(`/ordens-servico/${id}/pecas/${itemId}`);
    await carregar();
  }

  async function handleResponderOrcamento(orcamentoId: string, status: "aprovado" | "recusado") {
    setAtualizandoOrcamentoId(orcamentoId);
    try {
      await api.patch(`/orcamentos/${orcamentoId}/status`, { status });
      await carregar();
    } finally {
      setAtualizandoOrcamentoId(null);
    }
  }

  async function handleGerarFatura() {
    setErroFatura(null);
    setGerandoFatura(true);
    try {
      await api.post(`/ordens-servico/${id}/faturas`);
      await carregar();
    } catch (e: any) {
      setErroFatura(e?.response?.data?.erro ?? "Não foi possível gerar a fatura.");
    } finally {
      setGerandoFatura(false);
    }
  }

  async function handleRegistrarPagamento(faturaId: string) {
    setErroPagamento(null);
    setSalvandoPagamento(true);
    try {
      const aPrazo = metodoPagamento === "boleto";
      await api.post(`/faturas/${faturaId}/pagamentos`, {
        valor: Number(valorPagamento),
        metodo: metodoPagamento,
        vencimento: aPrazo && vencimentoPagamento ? vencimentoPagamento : undefined,
        pago: aPrazo ? pagoImediatamente : true,
      });
      setValorPagamento("");
      setVencimentoPagamento("");
      setPagoImediatamente(true);
      await carregar();
    } catch (e: any) {
      setErroPagamento(e?.response?.data?.erro ?? "Não foi possível registrar o pagamento.");
    } finally {
      setSalvandoPagamento(false);
    }
  }

  async function handleAtualizarVencimento(pagamentoId: string) {
    if (!novoVencimento) return;
    setAtualizandoPagamentoId(pagamentoId);
    try {
      await api.patch(`/faturas/pagamentos/${pagamentoId}/vencimento`, { vencimento: novoVencimento });
      setEditandoVencimentoId(null);
      setNovoVencimento("");
      await carregar();
    } finally {
      setAtualizandoPagamentoId(null);
    }
  }

  async function handleDarBaixa(pagamentoId: string) {
    setAtualizandoPagamentoId(pagamentoId);
    try {
      await api.patch(`/faturas/pagamentos/${pagamentoId}/baixa`);
      await carregar();
    } finally {
      setAtualizandoPagamentoId(null);
    }
  }

  async function handleRemoverPagamento(pagamentoId: string) {
    setAtualizandoPagamentoId(pagamentoId);
    try {
      await api.delete(`/faturas/pagamentos/${pagamentoId}`);
      await carregar();
    } finally {
      setAtualizandoPagamentoId(null);
    }
  }

  async function handleRegistrarEntrega() {
    setErroEntrega(null);
    setRegistrandoEntrega(true);
    try {
      await api.post(`/ordens-servico/${id}/entrega`, {
        confirmadoPorCliente,
        garantiaDias: Number(garantiaDias) || 0,
      });
      await carregar();
    } catch (e: any) {
      setErroEntrega(e?.response?.data?.erro ?? "Não foi possível registrar a entrega.");
    } finally {
      setRegistrandoEntrega(false);
    }
  }

  async function handleEnviarFoto(arquivo: File) {
    setErroFoto(null);
    setEnviandoFoto(true);
    try {
      const formData = new FormData();
      formData.append("foto", arquivo);
      await api.post(`/ordens-servico/${id}/fotos`, formData);
      if (inputFotoRef.current) inputFotoRef.current.value = "";
      await carregar();
    } catch (e: any) {
      setErroFoto(e?.response?.data?.erro ?? "Não foi possível enviar a foto.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function handleRemoverFoto(fotoId: string) {
    await api.delete(`/ordens-servico/${id}/fotos/${fotoId}`);
    await carregar();
  }

  async function handleMudarStatus() {
    if (!novoStatus) return;
    setErro(null);
    setSalvando(true);
    try {
      await api.patch(`/ordens-servico/${id}/status`, {
        status: novoStatus,
        observacao: observacao || undefined,
      });
      setNovoStatus("");
      setObservacao("");
      await carregar();
    } catch {
      setErro("Não foi possível mudar o status.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return <p className="px-6 py-10 text-sm text-slate-500">Carregando...</p>;
  }

  if (!os) {
    return <p className="px-6 py-10 text-sm text-red-600">Ordem de serviço não encontrada.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link to="/ordens-servico" className="text-sm text-slate-500 hover:text-slate-900">
        ← Ordens de serviço
      </Link>

      <header className="mb-8 mt-3 flex items-start justify-between">
        <div>
          <h1 className="font-mono text-sm text-slate-500">OS #{os.numero}</h1>
          <p className="mt-1 max-w-xl text-lg font-medium text-slate-900">{os.problemaRelatado}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/ordens-servico/${id}/imprimir`}
            target="_blank"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Imprimir OS
          </Link>
          <StatusBadge status={os.status} />
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-5 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Cliente</p>
          <p className="mt-1 font-medium text-slate-900">{os.cliente.nome}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Técnico</p>
          <p className="mt-1 font-medium text-slate-900">{os.tecnico?.nome ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Atendente</p>
          <p className="mt-1 font-medium text-slate-900">{os.atendente?.nome ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Prioridade</p>
          <p className="mt-1 font-medium capitalize text-slate-900">{os.prioridade}</p>
        </div>
      </div>

      {podeEditarOs && (
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Mudar status</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">Novo status</label>
            <select
              value={novoStatus}
              onChange={(e) => setNovoStatus(e.target.value as StatusOs)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            >
              <option value="">Selecione...</option>
              {TODOS_STATUS.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Observação (opcional)
            </label>
            <input
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <button
            onClick={handleMudarStatus}
            disabled={!novoStatus || salvando}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {salvando ? "Salvando..." : "Atualizar"}
          </button>
        </div>
        {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
      </div>
      )}

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Peças utilizadas</h2>

        {podeEditarOs && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">Peça</label>
            <select
              value={pecaSelecionada}
              onChange={(e) => setPecaSelecionada(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            >
              <option value="">Selecione...</option>
              {pecasDisponiveis.map((peca) => (
                <option key={peca.id} value={peca.id}>
                  {peca.nome} ({Number(peca.quantidadeEstoque)} em estoque)
                </option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="mb-1 block text-xs font-medium text-slate-600">Quantidade</label>
            <input
              type="number"
              min="1"
              step="1"
              value={quantidadePeca}
              onChange={(e) => setQuantidadePeca(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <button
            onClick={handleAdicionarPeca}
            disabled={!pecaSelecionada || salvandoPeca}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {salvandoPeca ? "Salvando..." : "Adicionar"}
          </button>
        </div>
        )}
        {erroPeca && podeEditarOs && <p className="mb-3 text-sm text-red-600">{erroPeca}</p>}

        {os.pecasUtilizadas.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma peça registrada nesta OS.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {os.pecasUtilizadas.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="text-slate-900">
                    {Number(item.quantidade)}x {item.peca.nome}
                  </p>
                  <p className="text-slate-500">
                    {formatarMoeda(Number(item.valorUnitario) * Number(item.quantidade))}
                  </p>
                </div>
                {podeEditarOs && (
                  <button
                    onClick={() => handleRemoverPeca(item.id)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Remover
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Orçamentos</h2>
          {podeCriarOrcamento && (
            <button
              onClick={() => setMostrarFormOrcamento((valor) => !valor)}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              {mostrarFormOrcamento ? "Cancelar" : "+ Novo orçamento"}
            </button>
          )}
        </div>

        {mostrarFormOrcamento && podeCriarOrcamento && (
          <OrcamentoForm
            osId={id!}
            pecasDisponiveis={pecasDisponiveis}
            onCriado={() => {
              setMostrarFormOrcamento(false);
              carregar();
            }}
            onCancelar={() => setMostrarFormOrcamento(false)}
          />
        )}

        {os.orcamentos.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum orçamento criado ainda.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {os.orcamentos.map((orcamento) => (
              <li key={orcamento.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatarMoeda(Number(orcamento.valorTotal))}
                  </p>
                  <p className="text-xs text-slate-500">
                    {STATUS_ORCAMENTO_LABEL[orcamento.status]} · {orcamento.itens.length}{" "}
                    {orcamento.itens.length === 1 ? "item" : "itens"} · criado em{" "}
                    {new Date(orcamento.criadoEm).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {orcamento.status === "pendente" && podeEditarOrcamento && (
                    <>
                      <button
                        onClick={() => handleResponderOrcamento(orcamento.id, "aprovado")}
                        disabled={atualizandoOrcamentoId === orcamento.id}
                        className="text-xs font-medium text-emerald-600 hover:underline disabled:opacity-40"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => handleResponderOrcamento(orcamento.id, "recusado")}
                        disabled={atualizandoOrcamentoId === orcamento.id}
                        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-40"
                      >
                        Recusar
                      </button>
                    </>
                  )}
                  <Link
                    to={`/orcamentos/${orcamento.id}/imprimir`}
                    target="_blank"
                    className="text-xs font-medium text-slate-600 hover:underline"
                  >
                    Imprimir
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Faturamento</h2>

        {os.faturas.length === 0 ? (
          <>
            <p className="mb-3 text-sm text-slate-500">
              {os.orcamentos.some((o) => o.status === "aprovado")
                ? "Gere a fatura a partir do orçamento aprovado."
                : "É necessário um orçamento aprovado para gerar a fatura."}
            </p>
            {podeCriarFinanceiro && (
              <button
                onClick={handleGerarFatura}
                disabled={gerandoFatura || !os.orcamentos.some((o) => o.status === "aprovado")}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
              >
                {gerandoFatura ? "Gerando..." : "Gerar fatura"}
              </button>
            )}
            {erroFatura && <p className="mt-3 text-sm text-red-600">{erroFatura}</p>}
          </>
        ) : (
          os.faturas.map((fatura) => {
            const totalPago = fatura.pagamentos
              .filter((p) => p.status === "pago")
              .reduce((soma, p) => soma + Number(p.valor), 0);
            const totalPendente = fatura.pagamentos
              .filter((p) => p.status === "pendente")
              .reduce((soma, p) => soma + Number(p.valor), 0);
            const saldoAReceber = Number(fatura.valorTotal) - totalPago;
            const saldoDisponivel = saldoAReceber - totalPendente;
            const aPrazo = metodoPagamento === "boleto";

            return (
              <div key={fatura.id}>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>
                      Fatura #{fatura.numero} · {formatarMoeda(Number(fatura.valorTotal))}
                    </p>
                    <p className="text-xs text-slate-500">{STATUS_PAGAMENTO_LABEL[fatura.status]}</p>
                  </div>
                  {saldoAReceber > 0.01 && (
                    <p className="text-sm text-amber-600" style={{ fontVariantNumeric: "tabular-nums" }}>
                      Saldo: {formatarMoeda(saldoAReceber)}
                    </p>
                  )}
                </div>

                {fatura.pagamentos.length > 0 && (
                  <ul className="mb-3 divide-y divide-slate-100">
                    {fatura.pagamentos.map((pagamento) => (
                      <li key={pagamento.id} className="py-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">
                            {pagamento.metodo} ·{" "}
                            {pagamento.status === "pago" && pagamento.pagoEm
                              ? `pago em ${formatarData(pagamento.pagoEm)}`
                              : STATUS_PARCELA_LABEL[pagamento.status]}
                            {pagamento.vencimento && pagamento.status === "pendente" && (
                              <> · vence em {formatarData(pagamento.vencimento)}</>
                            )}
                          </span>
                          <span className="font-medium text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>
                            {formatarMoeda(Number(pagamento.valor))}
                          </span>
                        </div>

                        {pagamento.status === "pendente" && (podeEditarFinanceiro || podeApagarFinanceiro) && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-3">
                            {podeEditarFinanceiro && (
                              editandoVencimentoId === pagamento.id ? (
                                <>
                                  <input
                                    type="date"
                                    value={novoVencimento}
                                    onChange={(e) => setNovoVencimento(e.target.value)}
                                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                                  />
                                  <button
                                    onClick={() => handleAtualizarVencimento(pagamento.id)}
                                    disabled={atualizandoPagamentoId === pagamento.id || !novoVencimento}
                                    className="text-xs font-medium text-slate-900 hover:underline disabled:opacity-40"
                                  >
                                    Salvar
                                  </button>
                                  <button
                                    onClick={() => setEditandoVencimentoId(null)}
                                    className="text-xs font-medium text-slate-500 hover:underline"
                                  >
                                    Cancelar
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditandoVencimentoId(pagamento.id);
                                    setNovoVencimento(pagamento.vencimento?.slice(0, 10) ?? "");
                                  }}
                                  className="text-xs font-medium text-slate-600 hover:underline"
                                >
                                  Ajustar vencimento
                                </button>
                              )
                            )}
                            {podeEditarFinanceiro && (
                              <button
                                onClick={() => handleDarBaixa(pagamento.id)}
                                disabled={atualizandoPagamentoId === pagamento.id}
                                className="text-xs font-medium text-emerald-600 hover:underline disabled:opacity-40"
                              >
                                Dar baixa
                              </button>
                            )}
                            {podeApagarFinanceiro && (
                              <button
                                onClick={() => handleRemoverPagamento(pagamento.id)}
                                disabled={atualizandoPagamentoId === pagamento.id}
                                className="text-xs font-medium text-red-600 hover:underline disabled:opacity-40"
                              >
                                Remover
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {saldoDisponivel > 0.01 && podeCriarFinanceiro && (
                  <div className="flex flex-col gap-2 rounded-lg border border-slate-100 p-3 sm:flex-row sm:items-end sm:flex-wrap">
                    <div className="w-28">
                      <label className="mb-1 block text-xs font-medium text-slate-600">Valor (R$)</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={valorPagamento}
                        onChange={(e) => setValorPagamento(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                    <div className="w-32">
                      <label className="mb-1 block text-xs font-medium text-slate-600">Método</label>
                      <select
                        value={metodoPagamento}
                        onChange={(e) => setMetodoPagamento(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                      >
                        <option value="pix">Pix</option>
                        <option value="cartao">Cartão</option>
                        <option value="boleto">Boleto</option>
                        <option value="dinheiro">Dinheiro</option>
                      </select>
                    </div>
                    {aPrazo && (
                      <>
                        <div className="w-36">
                          <label className="mb-1 block text-xs font-medium text-slate-600">Vencimento</label>
                          <input
                            type="date"
                            value={vencimentoPagamento}
                            onChange={(e) => setVencimentoPagamento(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          />
                        </div>
                        <label className="flex items-center gap-2 pb-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={pagoImediatamente}
                            onChange={(e) => setPagoImediatamente(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          Já foi pago
                        </label>
                      </>
                    )}
                    <button
                      onClick={() => handleRegistrarPagamento(fatura.id)}
                      disabled={salvandoPagamento || !valorPagamento}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
                    >
                      {salvandoPagamento ? "Salvando..." : "Registrar pagamento"}
                    </button>
                  </div>
                )}
                {erroPagamento && <p className="mt-3 text-sm text-red-600">{erroPagamento}</p>}
              </div>
            );
          })
        )}
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Fotos</h2>

        {podeEditarOs && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              ref={inputFotoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) handleEnviarFoto(arquivo);
              }}
              disabled={enviandoFoto}
              className="text-sm text-slate-600"
            />
            {enviandoFoto && <span className="text-xs text-slate-500">Enviando...</span>}
          </div>
        )}
        {erroFoto && <p className="mb-3 text-sm text-red-600">{erroFoto}</p>}

        {os.fotos.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma foto anexada nesta OS.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {os.fotos.map((foto) => (
              <div key={foto.id} className="group relative overflow-hidden rounded-lg border border-slate-200">
                <img src={urlArquivo(foto.url)} alt={foto.legenda ?? "Foto da OS"} className="h-28 w-full object-cover" />
                {podeEditarOs && (
                  <button
                    onClick={() => handleRemoverFoto(foto.id)}
                    className="absolute right-1 top-1 rounded-md bg-black/60 px-1.5 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Entrega e garantia</h2>

        {os.entregas.length === 0 ? (
          podeEditarOs ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={confirmadoPorCliente}
                  onChange={(e) => setConfirmadoPorCliente(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Confirmado pelo cliente
              </label>
              <div className="w-32">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Garantia (dias)
                </label>
                <input
                  type="number"
                  min="0"
                  value={garantiaDias}
                  onChange={(e) => setGarantiaDias(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <button
                onClick={handleRegistrarEntrega}
                disabled={registrandoEntrega}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
              >
                {registrandoEntrega ? "Salvando..." : "Registrar entrega"}
              </button>
            </div>
            {erroEntrega && <p className="mt-3 text-sm text-red-600">{erroEntrega}</p>}
          </>
          ) : (
            <p className="text-sm text-slate-500">Ainda não há entrega registrada.</p>
          )
        ) : (
          <div className="text-sm">
            <p className="text-slate-900">
              Entregue em {new Date(os.entregas[0].entregueEm).toLocaleString("pt-BR")}
              {os.entregas[0].confirmadoPorCliente ? " · confirmado pelo cliente" : ""}
            </p>
            {os.garantias[0] && (
              <p className="mt-1 text-slate-500">
                Garantia até {new Date(os.garantias[0].prazoFim).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Histórico</h2>
        <ol className="space-y-4">
          {os.statusHistorico.map((item) => (
            <li key={item.id} className="flex gap-3 text-sm">
              <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-slate-900" />
              <div>
                <p className="text-slate-900">
                  {item.statusAnterior ? (
                    <>
                      {STATUS_LABEL[item.statusAnterior]} → {STATUS_LABEL[item.statusNovo]}
                    </>
                  ) : (
                    STATUS_LABEL[item.statusNovo]
                  )}
                </p>
                {item.observacao && <p className="text-slate-500">{item.observacao}</p>}
                <p className="text-xs text-slate-400">
                  {new Date(item.criadoEm).toLocaleString("pt-BR")}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
