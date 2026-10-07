import { mpPreApproval } from "./mercadoPago";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";

/** Cria uma assinatura recorrente de cartão no Mercado Pago e devolve a URL de autorização. */
export async function criarAssinaturaCartao(
  empresaId: string,
  payerEmail: string,
  cobranca: { descricao: string; valor: number },
) {
  const preapproval = await mpPreApproval.create({
    body: {
      reason: `FluxOS - ${cobranca.descricao}`,
      external_reference: empresaId,
      payer_email: payerEmail,
      back_url: `${FRONTEND_URL}/app/pagamento/retorno`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: cobranca.valor,
        currency_id: "BRL",
      },
    },
  });

  return { checkoutUrl: preapproval.init_point, mpAssinaturaId: preapproval.id };
}
