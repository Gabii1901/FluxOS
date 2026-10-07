-- Planos pagos (Mercado Pago): substitui o campo livre "plano" por um enum
-- fechado, adiciona o status da assinatura e os dados de cobrança.

-- CreateEnum
CREATE TYPE "plano_sistema" AS ENUM ('basico', 'intermediario', 'avancado', 'personalizado');
CREATE TYPE "status_assinatura" AS ENUM ('pendente', 'ativo', 'inadimplente', 'cancelado');
CREATE TYPE "forma_pagamento" AS ENUM ('cartao', 'boleto');

-- O valor antigo ("trial") não existe mais como conceito — toda empresa
-- passa a precisar escolher um plano explicitamente.
ALTER TABLE "empresas" DROP COLUMN "plano";
ALTER TABLE "empresas" ADD COLUMN "plano" "plano_sistema";

ALTER TABLE "empresas" ADD COLUMN "status_assinatura" "status_assinatura" NOT NULL DEFAULT 'pendente';
ALTER TABLE "empresas" ADD COLUMN "forma_pagamento" "forma_pagamento";
ALTER TABLE "empresas" ADD COLUMN "dia_vencimento" INTEGER;
ALTER TABLE "empresas" ADD COLUMN "cpf_cnpj_boleto" TEXT;
ALTER TABLE "empresas" ADD COLUMN "mp_assinatura_id" TEXT;

ALTER TABLE "empresas" ADD COLUMN "endereco_cep" TEXT;
ALTER TABLE "empresas" ADD COLUMN "endereco_logradouro" TEXT;
ALTER TABLE "empresas" ADD COLUMN "endereco_numero" TEXT;
ALTER TABLE "empresas" ADD COLUMN "endereco_complemento" TEXT;
ALTER TABLE "empresas" ADD COLUMN "endereco_bairro" TEXT;
ALTER TABLE "empresas" ADD COLUMN "endereco_cidade" TEXT;
ALTER TABLE "empresas" ADD COLUMN "endereco_uf" TEXT;

ALTER TABLE "empresas" ADD COLUMN "valor_personalizado" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "cobrancas_plano" (
    "id" TEXT NOT NULL,
    "empresa_id" UUID NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "vencimento" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "mp_pagamento_id" TEXT,
    "link_pagamento" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cobrancas_plano_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cobrancas_plano" ADD CONSTRAINT "cobrancas_plano_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "cobrancas_plano_empresa_id_idx" ON "cobrancas_plano"("empresa_id");
