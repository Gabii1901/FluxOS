// Onde o token de login fica guardado:
// - "Lembrar de mim" marcado: localStorage (continua logado ao fechar o navegador, por 30 dias).
// - Desmarcado: sessionStorage (sai ao fechar o navegador; o token também expira em 8h).
const TOKEN_KEY = "fluxos:token";
const EMAIL_KEY = "fluxos:email-lembrado";

function seguro<T>(fn: () => T, padrao: T): T {
  try {
    return fn();
  } catch {
    return padrao;
  }
}

export function lerToken() {
  return seguro(() => localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY), null);
}

export function salvarToken(token: string, lembrar: boolean) {
  limparToken();
  seguro(() => (lembrar ? localStorage : sessionStorage).setItem(TOKEN_KEY, token), undefined);
}

export function limparToken() {
  seguro(() => {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }, undefined);
}

export function lerEmailLembrado() {
  return seguro(() => localStorage.getItem(EMAIL_KEY) ?? "", "");
}

export function salvarEmailLembrado(email: string | null) {
  seguro(() => (email ? localStorage.setItem(EMAIL_KEY, email) : localStorage.removeItem(EMAIL_KEY)), undefined);
}

/** true quando a sessão atual foi aberta com "Lembrar de mim" (token no localStorage). */
export function tokenEstaLembrado() {
  return seguro(() => localStorage.getItem(TOKEN_KEY) !== null, false);
}
