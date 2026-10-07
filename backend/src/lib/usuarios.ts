export const usuarioResumoSelect = {
  id: true,
  nome: true,
  papel: true,
  ativo: true,
  criadoEm: true,
  conta: { select: { email: true } },
} as const;

type UsuarioComConta = { conta: { email: string } } & Record<string, unknown>;

export function achatarUsuario<T extends UsuarioComConta>(usuario: T) {
  const { conta, ...resto } = usuario;
  return { ...resto, email: conta.email };
}
