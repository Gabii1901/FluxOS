import { Empresa } from "@prisma/client";
import { mpPayment } from "./mercadoPago";
import { prisma } from "./prisma";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3333";

export interface BoletoGerado {
  linkPagamento?: string;
  codigoPix?: string;
  qrCodeBase64?: string;
  vencimento: Date;
}

/** Próxima data com o dia escolhido: se já passou este mês, pula pro mês seguinte. */
export function proximaDataVencimento(dia: number, apartirDe = new Date()): Date {
  const candidato = new Date(apartirDe.getFullYear(), apartirDe.getMonth(), dia);
  if (candidato <= apartirDe) {
    candidato.setMonth(candidato.getMonth() + 1);
  }
  return candidato;
}

type EmpresaParaBoleto = Pick<
  Empresa,
  | "id"
  | "cpfCnpjBoleto"
  | "enderecoCep"
  | "enderecoLogradouro"
  | "enderecoNumero"
  | "enderecoBairro"
  | "enderecoCidade"
  | "enderecoUf"
>;

/** Gera (e registra) um novo boleto/Pix no Mercado Pago para o ciclo informado. */
export async function gerarCobrancaBoleto(
  empresa: EmpresaParaBoleto,
  pagador: { email: string; nome: string },
  cobranca: { descricao: string; valor: number },
  vencimento: Date,
): Promise<BoletoGerado> {
  if (!empresa.cpfCnpjBoleto) {
    throw new Error(`Empresa ${empresa.id} sem CPF/CNPJ cadastrado para boleto`);
  }
  if (!empresa.enderecoCep || !empresa.enderecoLogradouro || !empresa.enderecoNumero) {
    throw new Error(`Empresa ${empresa.id} sem endereço cadastrado para emitir boleto`);
  }

  const documento = empresa.cpfCnpjBoleto.replace(/\D/g, "");
  const tipoDocumento = documento.length === 11 ? "CPF" : "CNPJ";
  const [primeiroNome, ...resto] = pagador.nome.trim().split(/\s+/);
  const sobrenome = resto.join(" ") || primeiroNome;

  const pagamento = await mpPayment.create({
    body: {
      transaction_amount: cobranca.valor,
      description: `FluxOS - ${cobranca.descricao}`,
      payment_method_id: "bolbradesco",
      external_reference: empresa.id,
      date_of_expiration: `${vencimento.toISOString().slice(0, 10)}T23:59:59.000-03:00`,
      notification_url: `${BACKEND_URL}/pagamentos/webhook`,
      payer: {
        email: pagador.email,
        first_name: primeiroNome,
        last_name: sobrenome,
        identification: { type: tipoDocumento, number: documento },
        address: {
          zip_code: empresa.enderecoCep,
          street_name: empresa.enderecoLogradouro,
          street_number: empresa.enderecoNumero,
          neighborhood: empresa.enderecoBairro ?? undefined,
          city: empresa.enderecoCidade ?? undefined,
          federal_unit: empresa.enderecoUf ?? undefined,
        },
      },
    },
  });

  await prisma.cobrancaPlano.create({
    data: {
      empresaId: empresa.id,
      valor: cobranca.valor,
      vencimento,
      mpPagamentoId: String(pagamento.id),
      linkPagamento: pagamento.transaction_details?.external_resource_url ?? undefined,
    },
  });

  return {
    linkPagamento: pagamento.transaction_details?.external_resource_url,
    codigoPix: pagamento.point_of_interaction?.transaction_data?.qr_code,
    qrCodeBase64: pagamento.point_of_interaction?.transaction_data?.qr_code_base64,
    vencimento,
  };
}
