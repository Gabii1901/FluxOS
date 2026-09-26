-- Novo papel com acesso irrestrito
ALTER TYPE "papel_usuario" ADD VALUE 'desenvolvedor';

-- Módulos do sistema para permissões personalizadas
CREATE TYPE "modulo_sistema" AS ENUM ('dashboard', 'ordens_servico', 'orcamentos', 'clientes', 'estoque', 'usuarios', 'financeiro');

CREATE TABLE "permissoes_usuario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "modulo" "modulo_sistema" NOT NULL,
    "pode_ver" BOOLEAN NOT NULL DEFAULT false,
    "pode_criar" BOOLEAN NOT NULL DEFAULT false,
    "pode_editar" BOOLEAN NOT NULL DEFAULT false,
    "pode_apagar" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissoes_usuario_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "permissoes_usuario_usuario_id_modulo_key" ON "permissoes_usuario"("usuario_id", "modulo");

ALTER TABLE "permissoes_usuario" ADD CONSTRAINT "permissoes_usuario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
