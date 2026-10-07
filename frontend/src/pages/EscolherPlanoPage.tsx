import { useState } from "react";
import { api } from "../lib/api";

interface Plano {
  id: "basico" | "intermediario" | "avancado";
  nome: string;
  valor: number;
  descricao: string;
}

const PLANOS: Plano[] = [
  { id: "basico", nome: "Básico", valor: 69.9, descricao: "Clientes e ordens de serviço" },
  { id: "intermediario", nome: "Intermediário", valor: 89.9, descricao: "Básico + controle de estoque" },
  { id: "avancado", nome: "Avançado", valor: 119.9, descricao: "Tudo: orçamentos e financeiro inclusos" },
];

interface BoletoGerado {
  linkPagamento?: string;
  codigoPix?: string;
  qrCodeBase64?: string;
  vencimento: string;
}

export function EscolherPlanoPage() {
  const [planoSelecionado, setPlanoSelecionado] = useState<Plano | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<"cartao" | "boleto">("cartao");
  const [diaVencimento, setDiaVencimento] = useState(10);
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [boleto, setBoleto] = useState<BoletoGerado | null>(null);

  async function confirmarPagamento() {
    if (!planoSelecionado) return;
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await api.post<{ checkoutUrl?: string; boleto?: BoletoGerado }>(
        "/pagamentos/checkout",
        {
          plano: planoSelecionado.id,
          formaPagamento,
          diaVencimento: formaPagamento === "boleto" ? diaVencimento : undefined,
          cpfCnpj: formaPagamento === "boleto" ? cpfCnpj.replace(/\D/g, "") : undefined,
        },
      );

      if (resposta.data.checkoutUrl) {
        window.location.href = resposta.data.checkoutUrl;
        return;
      }
      if (resposta.data.boleto) {
        setBoleto(resposta.data.boleto);
      }
    } catch (erro: any) {
      setErro(erro?.response?.data?.erro ?? "Não foi possível iniciar o pagamento.");
    } finally {
      setEnviando(false);
    }
  }

  if (boleto) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center">
          <p className="text-lg font-medium text-slate-900">Boleto gerado!</p>
          <p className="mt-2 text-sm text-slate-600">
            Vencimento em <strong>{new Date(boleto.vencimento).toLocaleDateString("pt-BR")}</strong>.
            Pague pelo boleto ou, para confirmação mais rápida, pelo Pix abaixo.
          </p>

          {boleto.qrCodeBase64 && (
            <img
              src={`data:image/png;base64,${boleto.qrCodeBase64}`}
              alt="QR Code Pix"
              className="mx-auto mt-4 h-48 w-48"
            />
          )}

          {boleto.codigoPix && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-medium text-slate-500">Pix copia e cola</p>
              <textarea
                readOnly
                value={boleto.codigoPix}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-700"
                rows={3}
                onFocus={(e) => e.target.select()}
              />
            </div>
          )}

          {boleto.linkPagamento && (
            <a
              href={boleto.linkPagamento}
              target="_blank"
              rel="noopener"
              className="mt-4 inline-block w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Ver boleto
            </a>
          )}

          <p className="mt-4 text-xs text-slate-500">
            Assim que o pagamento for confirmado, seu acesso é liberado automaticamente.
          </p>
        </div>
      </div>
    );
  }

  if (planoSelecionado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <button
            type="button"
            onClick={() => setPlanoSelecionado(null)}
            className="mb-4 text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            ← Voltar
          </button>

          <p className="mb-1 text-sm text-slate-500">Plano {planoSelecionado.nome}</p>
          <p className="mb-5 text-2xl font-bold text-slate-900">
            R$ {planoSelecionado.valor.toFixed(2).replace(".", ",")}/mês
          </p>

          <p className="mb-2 text-sm font-medium text-slate-700">Forma de pagamento</p>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormaPagamento("cartao")}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                formaPagamento === "cartao"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 text-slate-700"
              }`}
            >
              Cartão
            </button>
            <button
              type="button"
              onClick={() => setFormaPagamento("boleto")}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                formaPagamento === "boleto"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 text-slate-700"
              }`}
            >
              Boleto/Pix
            </button>
          </div>

          {formaPagamento === "boleto" && (
            <>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">Dia do vencimento</label>
                <select
                  value={diaVencimento}
                  onChange={(e) => setDiaVencimento(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((dia) => (
                    <option key={dia} value={dia}>
                      Dia {dia}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">CPF ou CNPJ</label>
                <input
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                  placeholder="Só números"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                />
              </div>
            </>
          )}

          {erro && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
          )}

          <button
            type="button"
            onClick={confirmarPagamento}
            disabled={enviando || (formaPagamento === "boleto" && cpfCnpj.replace(/\D/g, "").length < 11)}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {enviando ? "Processando..." : "Continuar para pagamento"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex justify-center">
          <img src="/logo_fluxos_full_trimmed.png" alt="FluxOS" className="h-20 w-auto" />
        </div>
        <h1 className="mb-2 text-center text-2xl font-bold text-slate-900">Escolha seu plano</h1>
        <p className="mb-10 text-center text-sm text-slate-500">
          Sem período de teste — o acesso libera assim que o pagamento é confirmado.
        </p>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANOS.map((plano) => (
            <div key={plano.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-medium text-slate-500">{plano.nome}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                R$ {plano.valor.toFixed(2).replace(".", ",")}
                <span className="text-sm font-normal text-slate-500">/mês</span>
              </p>
              <p className="mt-2 flex-1 text-sm text-slate-600">{plano.descricao}</p>
              <button
                type="button"
                onClick={() => setPlanoSelecionado(plano)}
                className="mt-4 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Escolher
              </button>
            </div>
          ))}

          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">Personalizado</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">Sob consulta</p>
            <p className="mt-2 flex-1 text-sm text-slate-600">
              Para casos específicos, com necessidades fora dos planos padrão.
            </p>
            <a
              href="https://wa.me/5549988753626?text=Ol%C3%A1!%20Quero%20saber%20mais%20sobre%20o%20plano%20personalizado%20do%20FluxOS."
              target="_blank"
              rel="noopener"
              className="mt-4 rounded-lg border border-slate-300 py-2 text-center text-sm font-medium text-slate-700 hover:border-slate-900"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
