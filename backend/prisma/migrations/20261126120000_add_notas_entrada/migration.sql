-- Lançamento de notas de entrada (NF-e via XML)
ALTER TABLE "pecas" ADD COLUMN "unidade" TEXT NOT NULL DEFAULT 'UN';
ALTER TABLE "pecas" ADD COLUMN "preco_custo" DECIMAL(12,4) NOT NULL DEFAULT 0;

CREATE TABLE "notas_entrada" (
    "id" TEXT NOT NULL,
    "empresa_id" UUID NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "chave_acesso" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "serie" TEXT,
    "fornecedor_cnpj" TEXT NOT NULL,
    "fornecedor_nome" TEXT NOT NULL,
    "data_emissao" TIMESTAMP(3) NOT NULL,
    "valor_produtos" DECIMAL(12,2) NOT NULL,
    "valor_total" DECIMAL(12,2) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notas_entrada_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notas_entrada_itens" (
    "id" TEXT NOT NULL,
    "nota_id" TEXT NOT NULL,
    "peca_id" UUID NOT NULL,
    "codigo_fornecedor" TEXT NOT NULL,
    "descricao_xml" TEXT NOT NULL,
    "ncm" TEXT,
    "unidade_xml" TEXT NOT NULL,
    "quantidade_xml" DECIMAL(14,4) NOT NULL,
    "valor_unitario_xml" DECIMAL(14,4) NOT NULL,
    "valor_total" DECIMAL(12,2) NOT NULL,
    "fator_conversao" DECIMAL(14,4) NOT NULL,
    "quantidade_entrada" DECIMAL(14,4) NOT NULL,
    "custo_unitario" DECIMAL(12,4) NOT NULL,
    "preco_venda" DECIMAL(12,2) NOT NULL,
    CONSTRAINT "notas_entrada_itens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "produtos_fornecedor" (
    "id" TEXT NOT NULL,
    "empresa_id" UUID NOT NULL,
    "fornecedor_cnpj" TEXT NOT NULL,
    "codigo_fornecedor" TEXT NOT NULL,
    "peca_id" UUID NOT NULL,
    "fator_conversao" DECIMAL(14,4) NOT NULL DEFAULT 1,
    CONSTRAINT "produtos_fornecedor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notas_entrada_empresa_id_chave_acesso_key" ON "notas_entrada"("empresa_id", "chave_acesso");
CREATE INDEX "notas_entrada_itens_nota_id_idx" ON "notas_entrada_itens"("nota_id");
CREATE UNIQUE INDEX "produtos_fornecedor_empresa_id_fornecedor_cnpj_codigo_fornecedor_key" ON "produtos_fornecedor"("empresa_id", "fornecedor_cnpj", "codigo_fornecedor");

ALTER TABLE "notas_entrada" ADD CONSTRAINT "notas_entrada_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notas_entrada_itens" ADD CONSTRAINT "notas_entrada_itens_nota_id_fkey" FOREIGN KEY ("nota_id") REFERENCES "notas_entrada"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notas_entrada_itens" ADD CONSTRAINT "notas_entrada_itens_peca_id_fkey" FOREIGN KEY ("peca_id") REFERENCES "pecas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "produtos_fornecedor" ADD CONSTRAINT "produtos_fornecedor_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "produtos_fornecedor" ADD CONSTRAINT "produtos_fornecedor_peca_id_fkey" FOREIGN KEY ("peca_id") REFERENCES "pecas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
