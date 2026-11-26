-- Vários desenhos de perfil e vários croquis por item do orçamento de calhas
ALTER TABLE "orcamento_calha_itens" ADD COLUMN IF NOT EXISTS "desenhos_extras" JSONB;
ALTER TABLE "orcamento_calha_itens" ADD COLUMN IF NOT EXISTS "croquis" JSONB;
-- O croqui único que já existia passa a ser o primeiro da lista.
UPDATE "orcamento_calha_itens" SET "croquis" = jsonb_build_array("croqui"), "croqui" = NULL WHERE "croqui" IS NOT NULL;
