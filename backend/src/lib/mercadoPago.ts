import { MercadoPagoConfig, Payment, PreApproval } from "mercadopago";

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (!accessToken) {
  console.warn("[mercadopago] MERCADOPAGO_ACCESS_TOKEN não configurada. Checkout ficará indisponível.");
}

const config = new MercadoPagoConfig({ accessToken: accessToken ?? "" });

export const mpPreApproval = new PreApproval(config);
export const mpPayment = new Payment(config);

export function mercadoPagoConfigurado() {
  return Boolean(accessToken);
}
