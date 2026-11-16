-- CreateTable
CREATE TABLE "categorias_conta_pagar" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_conta_pagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_pagar" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "categoria_id" TEXT,
    "descricao" TEXT NOT NULL,
    "fornecedor_nome" TEXT,
    "fornecedor_documento" TEXT,
    "valor" DECIMAL(12,2) NOT NULL,
    "vencimento" DATE NOT NULL,
    "pago_em" DATE,
    "forma_pagamento" TEXT,
    "observacao" TEXT,
    "grupo_recorrencia_id" TEXT,
    "parcela" INTEGER,
    "total_parcelas" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contas_pagar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contas_pagar_empresa_id_vencimento_idx" ON "contas_pagar"("empresa_id", "vencimento");
CREATE INDEX "contas_pagar_grupo_recorrencia_id_idx" ON "contas_pagar"("grupo_recorrencia_id");

-- AddForeignKey
ALTER TABLE "categorias_conta_pagar" ADD CONSTRAINT "categorias_conta_pagar_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_conta_pagar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
