-- Separa a identidade de login (Conta: e-mail/senha, única globalmente) do
-- vínculo por empresa (Usuario: papel/ativo dentro de uma empresa).
-- Isso permite que uma mesma pessoa acesse várias empresas com um único login,
-- sem nunca misturar dados entre empresas (cada token continua travado em um
-- único par conta+empresa).

-- Necessário para gen_random_uuid() no Postgres 12.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateTable
CREATE TABLE "contas" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "email_verificado" BOOLEAN NOT NULL DEFAULT true,
    "token_verificacao" TEXT,
    "token_verificacao_expira_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contas_pkey" PRIMARY KEY ("id")
);

-- Backfill: uma conta por e-mail único, a partir dos usuarios já existentes.
-- Se o mesmo e-mail já existia em mais de uma empresa (permitido no modelo
-- antigo), agora vira uma única Conta compartilhada entre essas empresas.
INSERT INTO "contas" ("id", "email", "senha_hash")
SELECT gen_random_uuid()::text, "email", MIN("senha_hash")
FROM "usuarios"
GROUP BY "email";

-- A partir de agora, novas contas nascem não verificadas por padrão
-- (o backfill acima usa o DEFAULT true da criação da coluna, de propósito).
ALTER TABLE "contas" ALTER COLUMN "email_verificado" SET DEFAULT false;

-- Garante unicidade do e-mail de login daqui pra frente.
CREATE UNIQUE INDEX "contas_email_key" ON "contas"("email");

-- AlterTable: liga cada usuario à sua conta
ALTER TABLE "usuarios" ADD COLUMN "conta_id" TEXT;

UPDATE "usuarios" u
SET "conta_id" = c."id"
FROM "contas" c
WHERE c."email" = u."email";

ALTER TABLE "usuarios" ALTER COLUMN "conta_id" SET NOT NULL;

-- Remove o antigo índice único (empresa_id, email) e as colunas que saíram
-- de usuarios para contas.
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_empresa_id_email_key";
ALTER TABLE "usuarios" DROP COLUMN "email";
ALTER TABLE "usuarios" DROP COLUMN "senha_hash";

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_conta_id_fkey" FOREIGN KEY ("conta_id") REFERENCES "contas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "usuarios_conta_id_idx" ON "usuarios"("conta_id");

-- Uma conta não pode ter duas vinculações para a mesma empresa.
CREATE UNIQUE INDEX "usuarios_conta_id_empresa_id_key" ON "usuarios"("conta_id", "empresa_id");
