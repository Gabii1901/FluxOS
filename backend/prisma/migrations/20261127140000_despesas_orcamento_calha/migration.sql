-- Outras despesas no orçamento de calhas
CREATE TABLE IF NOT EXISTS "orcamento_calha_despesas" (
    "id" TEXT NOT NULL,
    "orcamento_id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "orcamento_calha_despesas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "orcamento_calha_despesas_orcamento_id_idx" ON "orcamento_calha_despesas"("orcamento_id");
ALTER TABLE "orcamento_calha_despesas" ADD CONSTRAINT "orcamento_calha_despesas_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos_calha"("id") ON DELETE CASCADE ON UPDATE CASCADE;
