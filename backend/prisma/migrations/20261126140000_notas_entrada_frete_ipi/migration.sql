-- Frete e IPI por item da NF-e (compõem o custo)
ALTER TABLE "notas_entrada_itens" ADD COLUMN "valor_frete" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "notas_entrada_itens" ADD COLUMN "valor_ipi" DECIMAL(12,2) NOT NULL DEFAULT 0;
