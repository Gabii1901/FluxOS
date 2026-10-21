-- Valor/hora padrão do funcionário, usado ao incluí-lo na mão de obra de um orçamento de calhas
ALTER TABLE "usuarios" ADD COLUMN "valor_hora" DECIMAL(10,2);

-- CreateEnum
CREATE TYPE "tipo_servico_calha" AS ENUM ('calha', 'algerosa', 'capeamento', 'rufo', 'pingadeira', 'tubulacao', 'colarinho', 'exaustor_eolico', 'adicional', 'venda');

-- CreateEnum
CREATE TYPE "tipo_medida_orcamento" AS ENUM ('metro', 'unidade');

-- CreateEnum
CREATE TYPE "status_orcamento_calha" AS ENUM ('rascunho', 'enviado', 'aprovado', 'recusado');

-- CreateTable
CREATE TABLE "materiais_chapa" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "espessura_mm" DECIMAL(6,2),
    "tipo" TEXT,
    "cor" TEXT,
    "preco_m2" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materiais_chapa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfis_calha" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "segmentos" JSONB NOT NULL,
    "padrao" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perfis_calha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orcamentos_calha" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "cliente_id" TEXT,
    "status" "status_orcamento_calha" NOT NULL DEFAULT 'rascunho',
    "acrescimo_percentual" DECIMAL(6,2) NOT NULL DEFAULT 30,
    "custo_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "preco_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orcamentos_calha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orcamento_calha_itens" (
    "id" TEXT NOT NULL,
    "orcamento_id" TEXT NOT NULL,
    "tipo_servico" "tipo_servico_calha" NOT NULL,
    "descricao" TEXT,
    "tipo_medida" "tipo_medida_orcamento" NOT NULL DEFAULT 'metro',
    "quantidade" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "unidade_quantidade" TEXT NOT NULL DEFAULT 'm',
    "corte_largura" DECIMAL(10,2),
    "unidade_corte" TEXT,
    "material_id" TEXT,
    "perfil_id" TEXT,
    "segmentos_custom" JSONB,
    "valor_unitario" DECIMAL(10,2),
    "acrescimo_percentual" DECIMAL(6,2) NOT NULL DEFAULT 30,
    "custo_calculado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "preco_calculado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orcamento_calha_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orcamento_calha_mao_de_obra" (
    "id" TEXT NOT NULL,
    "orcamento_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "valor_hora" DECIMAL(10,2) NOT NULL,
    "horas" DECIMAL(6,2) NOT NULL DEFAULT 1,
    "custo_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orcamento_calha_mao_de_obra_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "materiais_chapa" ADD CONSTRAINT "materiais_chapa_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfis_calha" ADD CONSTRAINT "perfis_calha_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos_calha" ADD CONSTRAINT "orcamentos_calha_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos_calha" ADD CONSTRAINT "orcamentos_calha_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamento_calha_itens" ADD CONSTRAINT "orcamento_calha_itens_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos_calha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamento_calha_itens" ADD CONSTRAINT "orcamento_calha_itens_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiais_chapa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamento_calha_itens" ADD CONSTRAINT "orcamento_calha_itens_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfis_calha"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamento_calha_mao_de_obra" ADD CONSTRAINT "orcamento_calha_mao_de_obra_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos_calha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamento_calha_mao_de_obra" ADD CONSTRAINT "orcamento_calha_mao_de_obra_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed dos perfis de calha padrão (empresa_id nulo = disponível pra todas as empresas).
-- anguloGraus é a direção do traço no editor visual (0=direita, 90=cima, 180=esquerda, 270=baixo).
INSERT INTO "perfis_calha" ("id", "empresa_id", "nome", "descricao", "segmentos", "padrao", "ativo") VALUES
(gen_random_uuid()::text, NULL, 'Calha Padrão 30', 'Perfil padrão com abas, laterais e fundo — chapa 30cm', '[{"nome":"Aba esq.","valorCm":1.3,"anguloGraus":90},{"nome":"Lateral esq.","valorCm":9.3,"anguloGraus":270},{"nome":"Fundo","valorCm":10,"anguloGraus":0},{"nome":"Lateral dir.","valorCm":9.3,"anguloGraus":90},{"nome":"Aba dir.","valorCm":1.3,"anguloGraus":270}]'::jsonb, true, true),
(gen_random_uuid()::text, NULL, 'Calha Americana / Platibanda', 'Perfil em U arredondado — beiral ou platibanda', '[{"nome":"Aba esq.","valorCm":2,"anguloGraus":90},{"nome":"Lateral esq.","valorCm":10,"anguloGraus":270},{"nome":"Fundo","valorCm":12,"anguloGraus":0},{"nome":"Lateral dir.","valorCm":10,"anguloGraus":90},{"nome":"Aba dir.","valorCm":2,"anguloGraus":270}]'::jsonb, true, true),
(gen_random_uuid()::text, NULL, 'Calha Quadrada', 'Perfil quadrado em U', '[{"nome":"Lateral esq.","valorCm":10,"anguloGraus":270},{"nome":"Fundo","valorCm":15,"anguloGraus":0},{"nome":"Lateral dir.","valorCm":10,"anguloGraus":90}]'::jsonb, true, true),
(gen_random_uuid()::text, NULL, 'Calha Colonial', 'Perfil aberto para telha colonial', '[{"nome":"Lateral esq.","valorCm":8,"anguloGraus":270},{"nome":"Fundo","valorCm":12,"anguloGraus":0},{"nome":"Lateral dir.","valorCm":8,"anguloGraus":90}]'::jsonb, true, true),
(gen_random_uuid()::text, NULL, 'Calha Moldura para Beiral', 'Calha com moldura decorativa', '[{"nome":"Moldura","valorCm":3,"anguloGraus":90},{"nome":"Lateral esq.","valorCm":9,"anguloGraus":270},{"nome":"Fundo","valorCm":10,"anguloGraus":0},{"nome":"Lateral dir.","valorCm":9,"anguloGraus":90}]'::jsonb, true, true),
(gen_random_uuid()::text, NULL, 'Calha Dentinho', 'Calha com abas dentadas para encaixe', '[{"nome":"Aba esq.","valorCm":1.3,"anguloGraus":90},{"nome":"Lateral esq.","valorCm":9.3,"anguloGraus":270},{"nome":"Fundo","valorCm":10,"anguloGraus":0},{"nome":"Subida","valorCm":2.7,"anguloGraus":90},{"nome":"Inclinação","valorCm":10,"anguloGraus":45},{"nome":"Lateral dir.","valorCm":4,"anguloGraus":90},{"nome":"Aba sup.","valorCm":1.3,"anguloGraus":180},{"nome":"Recuo","valorCm":1.3,"anguloGraus":90}]'::jsonb, true, true),
(gen_random_uuid()::text, NULL, 'Calha Água Furtada', 'Para encontro de águas — perfil em V com abas laterais', '[{"nome":"Aba esq.","valorCm":2,"anguloGraus":90},{"nome":"Lateral esq.","valorCm":12,"anguloGraus":315},{"nome":"Vértice","valorCm":2,"anguloGraus":45},{"nome":"Lateral dir.","valorCm":12,"anguloGraus":90},{"nome":"Aba dir.","valorCm":2,"anguloGraus":270}]'::jsonb, true, true);
