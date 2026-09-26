-- Fotos anexadas a uma ordem de serviço
CREATE TABLE "fotos_os" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "os_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "legenda" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fotos_os_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fotos_os_os_id_idx" ON "fotos_os"("os_id");

ALTER TABLE "fotos_os" ADD CONSTRAINT "fotos_os_os_id_fkey" FOREIGN KEY ("os_id") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Pagamentos a prazo (ex.: boleto) com vencimento ajustável
CREATE TYPE "status_parcela" AS ENUM ('pendente', 'pago', 'cancelado');

ALTER TABLE "pagamentos" ADD COLUMN "status" "status_parcela" NOT NULL DEFAULT 'pago';
ALTER TABLE "pagamentos" ADD COLUMN "vencimento" DATE;
ALTER TABLE "pagamentos" ADD COLUMN "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "pagamentos" ALTER COLUMN "pago_em" DROP NOT NULL;
ALTER TABLE "pagamentos" ALTER COLUMN "pago_em" DROP DEFAULT;
