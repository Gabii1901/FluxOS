-- Assinatura usada nos recibos de pagamento
ALTER TABLE "empresas" ADD COLUMN "assinatura_recibo" TEXT;
ALTER TABLE "empresas" ADD COLUMN "assinante_nome" TEXT;
