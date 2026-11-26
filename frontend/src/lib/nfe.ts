// Leitura do XML da NF-e (modelo 55) no navegador. Aceita tanto o XML
// autorizado (<nfeProc>) quanto o <NFe> puro.

export interface NfeItem {
  codigo: string;
  descricao: string;
  ncm: string | null;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  /** Frete do item (do XML ou rateado do total da nota). */
  valorFrete: number;
  /** IPI do item (do XML ou rateado do total da nota). */
  valorIpi: number;
}

export interface NfeParcela {
  numero: string | null;
  vencimento: string; // YYYY-MM-DD
  valor: number;
}

export interface NfeLida {
  chaveAcesso: string;
  numero: string;
  serie: string | null;
  dataEmissao: string;
  fornecedorCnpj: string;
  fornecedorNome: string;
  valorProdutos: number;
  valorTotal: number;
  itens: NfeItem[];
  parcelas: NfeParcela[];
}

function filho(pai: Element | Document, tag: string): Element | null {
  return pai.getElementsByTagNameNS("*", tag)[0] ?? pai.getElementsByTagName(tag)[0] ?? null;
}

function texto(pai: Element | Document, tag: string): string {
  return filho(pai, tag)?.textContent?.trim() ?? "";
}

function numero(pai: Element | Document, tag: string): number {
  const valor = Number(texto(pai, tag));
  return Number.isFinite(valor) ? valor : 0;
}

export function lerXmlNfe(conteudo: string): NfeLida {
  const doc = new DOMParser().parseFromString(conteudo, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("O arquivo não é um XML válido.");
  }

  const infNFe = filho(doc, "infNFe");
  if (!infNFe) throw new Error("Não encontrei uma NF-e neste XML.");

  const chaveAcesso = (infNFe.getAttribute("Id") ?? "").replace(/^NFe/, "") || texto(doc, "chNFe");
  const ide = filho(infNFe, "ide");
  const emit = filho(infNFe, "emit");
  const totais = filho(infNFe, "ICMSTot");
  if (!ide || !emit || !chaveAcesso) throw new Error("XML de NF-e incompleto.");

  const itens = Array.from(infNFe.getElementsByTagNameNS("*", "det")).map((det) => {
    const prod = filho(det, "prod")!;
    return {
      codigo: texto(prod, "cProd"),
      descricao: texto(prod, "xProd"),
      ncm: texto(prod, "NCM") || null,
      unidade: texto(prod, "uCom").toUpperCase() || "UN",
      quantidade: numero(prod, "qCom"),
      valorUnitario: numero(prod, "vUnCom"),
      valorTotal: numero(prod, "vProd"),
      valorFrete: numero(prod, "vFrete"),
      valorIpi: filho(det, "IPITrib") ? numero(filho(det, "IPITrib")!, "vIPI") : 0,
    };
  });
  if (itens.length === 0) throw new Error("A nota não tem itens.");

  // Se o emissor não detalhou frete/IPI por item, rateia o total da nota
  // proporcionalmente ao valor dos produtos (o último item absorve o arredondamento).
  if (totais) {
    ratearSeFaltar(itens, "valorFrete", numero(totais, "vFrete"));
    ratearSeFaltar(itens, "valorIpi", numero(totais, "vIPI"));
  }

  const parcelas = Array.from(infNFe.getElementsByTagNameNS("*", "dup")).map((dup) => ({
    numero: texto(dup, "nDup") || null,
    vencimento: texto(dup, "dVenc").slice(0, 10),
    valor: numero(dup, "vDup"),
  }));

  return {
    chaveAcesso,
    numero: texto(ide, "nNF"),
    serie: texto(ide, "serie") || null,
    dataEmissao: texto(ide, "dhEmi") || texto(ide, "dEmi"),
    fornecedorCnpj: texto(emit, "CNPJ") || texto(emit, "CPF"),
    fornecedorNome: texto(emit, "xNome"),
    valorProdutos: totais ? numero(totais, "vProd") : itens.reduce((s, i) => s + i.valorTotal, 0),
    valorTotal: totais ? numero(totais, "vNF") : itens.reduce((s, i) => s + i.valorTotal, 0),
    itens,
    parcelas,
  };
}

function ratearSeFaltar(itens: NfeItem[], campo: "valorFrete" | "valorIpi", totalNota: number) {
  const somaItens = itens.reduce((s, i) => s + i[campo], 0);
  if (totalNota <= 0 || somaItens > 0) return;
  const base = itens.reduce((s, i) => s + i.valorTotal, 0);
  let distribuido = 0;
  itens.forEach((item, indice) => {
    if (indice === itens.length - 1) {
      item[campo] = Math.round((totalNota - distribuido) * 100) / 100;
    } else {
      const parte = base > 0 ? (totalNota * item.valorTotal) / base : totalNota / itens.length;
      item[campo] = Math.round(parte * 100) / 100;
      distribuido += item[campo];
    }
  });
}
