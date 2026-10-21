-- Orçamento de calhas pode ser vinculado a uma OS (opcional)
ALTER TABLE "orcamentos_calha" ADD COLUMN "os_id" TEXT;

ALTER TABLE "orcamentos_calha" ADD CONSTRAINT "orcamentos_calha_os_id_fkey" FOREIGN KEY ("os_id") REFERENCES "ordens_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "orcamentos_calha_os_id_idx" ON "orcamentos_calha"("os_id");
