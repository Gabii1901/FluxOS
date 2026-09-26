import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "fluxos-dev-secret-troque-em-producao";

export interface TokenPayload {
  usuarioId: string;
  empresaId: string;
  papel: string;
}

export function assinarToken(payload: TokenPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}

export function verificarToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
