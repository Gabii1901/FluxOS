export interface DadosEmpresa {
  id: string;
  nome: string;
  cnpj: string | null;
  logoUrl: string | null;
  assinaturaRecibo: string | null;
  assinanteNome: string | null;
  modeloOrcamento: Record<string, unknown> | null;
  plano: string | null;
  statusAssinatura: string;
  formaPagamento: string | null;
  diaVencimento: number | null;
  cpfCnpjBoleto: string | null;
  enderecoCep: string | null;
  enderecoLogradouro: string | null;
  enderecoNumero: string | null;
  enderecoComplemento: string | null;
  enderecoBairro: string | null;
  enderecoCidade: string | null;
  enderecoUf: string | null;
}
