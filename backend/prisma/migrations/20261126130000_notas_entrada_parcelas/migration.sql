-- Parcelas da NF-e viram contas a pagar; rastreia peças criadas pela nota
ALTER TABLE "contas_pagar" ADD COLUMN "nota_entrada_id" TEXT;
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_nota_entrada_id_fkey" FOREIGN KEY ("nota_entrada_id") REFERENCES "notas_entrada"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notas_entrada_itens" ADD COLUMN "peca_criada" BOOLEAN NOT NULL DEFAULT false;
