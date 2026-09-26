-- Reduz os papéis de usuário para apenas 3: desenvolvedor, admin, colaborador.
-- Todo papel que não seja desenvolvedor/admin (atendente, tecnico, supervisor, financeiro) vira colaborador.
ALTER TYPE "papel_usuario" RENAME TO "papel_usuario_old";

CREATE TYPE "papel_usuario" AS ENUM ('desenvolvedor', 'admin', 'colaborador');

ALTER TABLE "usuarios"
  ALTER COLUMN "papel" TYPE "papel_usuario"
  USING (
    CASE "papel"::text
      WHEN 'desenvolvedor' THEN 'desenvolvedor'
      WHEN 'admin' THEN 'admin'
      ELSE 'colaborador'
    END
  )::"papel_usuario";

DROP TYPE "papel_usuario_old";
