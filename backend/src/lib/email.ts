import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const REMETENTE = process.env.EMAIL_REMETENTE ?? "FluxOS <contato@fluxosapp.tech>";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";

export async function enviarEmailConfirmacao(destino: string, nome: string, token: string) {
  const link = `${FRONTEND_URL}/app/confirmar-email?token=${token}`;

  if (!resend) {
    console.log(`[email] RESEND_API_KEY não configurada. Link de confirmação para ${destino}: ${link}`);
    return;
  }

  await resend.emails.send({
    from: REMETENTE,
    to: destino,
    subject: "Confirme seu e-mail no FluxOS",
    html: `
      <p>Olá, ${nome}!</p>
      <p>Falta pouco para começar a usar o FluxOS. Clique no link abaixo para confirmar seu e-mail:</p>
      <p><a href="${link}">${link}</a></p>
      <p>Esse link expira em 24 horas.</p>
    `,
  });
}

export async function enviarEmailBoleto(destino: string, nome: string, linkBoleto: string, vencimento: Date) {
  const dataFormatada = vencimento.toLocaleDateString("pt-BR");

  if (!resend) {
    console.log(`[email] RESEND_API_KEY não configurada. Boleto para ${destino} (vence ${dataFormatada}): ${linkBoleto}`);
    return;
  }

  await resend.emails.send({
    from: REMETENTE,
    to: destino,
    subject: `Seu boleto FluxOS vence em ${dataFormatada}`,
    html: `
      <p>Olá, ${nome}!</p>
      <p>Seu boleto da assinatura do FluxOS está disponível, com vencimento em <strong>${dataFormatada}</strong>.</p>
      <p><a href="${linkBoleto}">${linkBoleto}</a></p>
      <p>O boleto também pode ser pago via Pix (código copia-e-cola disponível na página de pagamento).</p>
    `,
  });
}
