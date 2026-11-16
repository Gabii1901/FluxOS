import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "fluxos-dev-secret-troque-em-producao";

export interface TokenPayload {
  usuarioId: string;
  empresaId: string;
  papel: string;
}

// "Lembrar de mim" no login estende a sessão de 8 horas para 30 dias.
export function assinarToken(payload: TokenPayload, lembrar = false) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: lembrar ? "30d" : "8h" });
}

export function verificarToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

// Token de curta duração emitido no login quando a conta tem mais de uma
// empresa vinculada, só para confirmar a escolha da empresa (não dá acesso
// a nenhuma rota protegida por si só).
export interface PreAuthPayload {
  contaId: string;
  tipo: "pre_auth";
  lembrar?: boolean;
}

export function assinarPreAuthToken(payload: { contaId: string; lembrar?: boolean }) {
  return jwt.sign({ ...payload, tipo: "pre_auth" }, JWT_SECRET, { expiresIn: "10m" });
}

export function verificarPreAuthToken(token: string): PreAuthPayload {
  const payload = jwt.verify(token, JWT_SECRET) as PreAuthPayload;
  if (payload.tipo !== "pre_auth") {
    throw new Error("Token inválido");
  }
  return payload;
}
