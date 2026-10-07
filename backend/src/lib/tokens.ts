import crypto from "crypto";

export function gerarTokenVerificacao() {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const expiraEm = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return { token, hash, expiraEm };
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
