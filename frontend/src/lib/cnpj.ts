import { api } from "./api";

export interface DadosCnpj {
  cnpj: string;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  situacao: string | null;
  municipio: string | null;
  uf: string | null;
  telefone: string | null;
  email: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
}

/** Formata CPF (11 dígitos) ou CNPJ (14 dígitos); qualquer outra coisa volta como veio. */
export function formatarDocumento(valor: string) {
  const d = valor.replace(/\D/g, "");
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  return valor;
}

/** Telefone vindo da Receita ("1133334444") no formato (11) 3333-4444. */
export function formatarTelefone(valor: string) {
  const d = valor.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  return valor;
}

/** Consulta o CNPJ na Receita. Lança Error com mensagem pronta para mostrar ao usuário. */
export async function consultarCnpj(documento: string): Promise<DadosCnpj> {
  const cnpj = documento.replace(/\D/g, "");
  if (cnpj.length !== 14) throw new Error("Digite um CNPJ com 14 dígitos.");
  try {
    const { data } = await api.get<DadosCnpj>(`/consultas/cnpj/${cnpj}`);
    return data;
  } catch (e: any) {
    throw new Error(e?.response?.data?.erro ?? "Não foi possível consultar o CNPJ.");
  }
}

/** Resumo de uma linha para mostrar abaixo do campo depois da consulta. */
export function resumoCnpj(d: DadosCnpj) {
  return [d.nomeFantasia && `Fantasia: ${d.nomeFantasia}`, d.situacao && `Situação: ${d.situacao}`, d.municipio && `${d.municipio}/${d.uf}`]
    .filter(Boolean)
    .join(" · ");
}
