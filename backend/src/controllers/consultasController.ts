import { Request, Response } from "express";

// ============================================================
// Consulta de CNPJ (dados públicos da Receita Federal)
// BrasilAPI como fonte principal e ReceitaWS como reserva.
// ============================================================

const HEADERS_CONSULTA = { "User-Agent": "FluxOS/1.0", Accept: "application/json" };

interface DadosCnpj {
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

async function consultarBrasilApi(cnpj: string): Promise<DadosCnpj | "nao_encontrado" | null> {
  const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    headers: HEADERS_CONSULTA,
    signal: AbortSignal.timeout(8000),
  });
  if (r.status === 404 || r.status === 400) return "nao_encontrado";
  if (!r.ok) return null;
  const d: any = await r.json();
  return {
    cnpj,
    razaoSocial: d.razao_social ?? null,
    nomeFantasia: d.nome_fantasia || null,
    situacao: d.descricao_situacao_cadastral ?? null,
    municipio: d.municipio ?? null,
    uf: d.uf ?? null,
    telefone: d.ddd_telefone_1 || null,
    email: d.email || null,
    cep: d.cep ? String(d.cep).replace(/\D/g, "") : null,
    logradouro: [d.descricao_tipo_de_logradouro, d.logradouro].filter(Boolean).join(" ") || null,
    numero: d.numero || null,
    complemento: d.complemento || null,
    bairro: d.bairro || null,
  };
}

async function consultarReceitaWs(cnpj: string): Promise<DadosCnpj | "nao_encontrado" | null> {
  const r = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`, {
    headers: HEADERS_CONSULTA,
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) return null;
  const d: any = await r.json();
  if (d.status === "ERROR") return "nao_encontrado";
  return {
    cnpj,
    razaoSocial: d.nome ?? null,
    nomeFantasia: d.fantasia || null,
    situacao: d.situacao ?? null,
    municipio: d.municipio ?? null,
    uf: d.uf ?? null,
    telefone: d.telefone || null,
    email: d.email || null,
    cep: d.cep ? String(d.cep).replace(/\D/g, "") : null,
    logradouro: d.logradouro || null,
    numero: d.numero || null,
    complemento: d.complemento || null,
    bairro: d.bairro || null,
  };
}

export async function consultarCnpj(req: Request, res: Response) {
  const cnpj = req.params.cnpj.replace(/\D/g, "");
  if (cnpj.length !== 14) return res.status(400).json({ erro: "CNPJ deve ter 14 dígitos" });

  for (const consultar of [consultarBrasilApi, consultarReceitaWs]) {
    try {
      const resultado = await consultar(cnpj);
      if (resultado === "nao_encontrado") return res.status(404).json({ erro: "CNPJ não encontrado na Receita" });
      if (resultado) return res.json(resultado);
    } catch {
      // tenta a próxima fonte
    }
  }
  res.status(502).json({ erro: "Consulta à Receita indisponível no momento. Preencha o nome manualmente." });
}
