type UnidadeComprimento = "m" | "cm" | "mm";

const SERVICOS_METAL = [
  "calha",
  "algerosa",
  "capeamento",
  "rufo",
  "pingadeira",
  "tubulacao",
  "colarinho",
  "exaustor_eolico",
] as const;

export function ehServicoMetal(tipoServico: string): boolean {
  return (SERVICOS_METAL as readonly string[]).includes(tipoServico);
}

export function converterParaMetros(valor: number, unidade: UnidadeComprimento): number {
  if (unidade === "cm") return valor / 100;
  if (unidade === "mm") return valor / 1000;
  return valor;
}

interface DadosCustoItem {
  tipoServico: string;
  quantidade: number;
  unidadeQuantidade: UnidadeComprimento;
  corteLargura: number | null;
  unidadeCorte: UnidadeComprimento | null;
  precoM2Material: number | null;
  valorUnitario: number | null;
}

// Para serviços em chapa (calha, rufo, etc.): custo = área (comprimento × corte) × preço/m² do material.
// Para "adicional"/"venda": custo = valor unitário informado × quantidade.
export function calcularCustoItem(dados: DadosCustoItem): number {
  if (ehServicoMetal(dados.tipoServico)) {
    if (!dados.corteLargura || !dados.unidadeCorte || !dados.precoM2Material) return 0;
    const comprimentoM = converterParaMetros(dados.quantidade, dados.unidadeQuantidade);
    const corteM = converterParaMetros(dados.corteLargura, dados.unidadeCorte);
    const areaM2 = comprimentoM * corteM;
    return areaM2 * dados.precoM2Material;
  }

  return (dados.valorUnitario ?? 0) * dados.quantidade;
}

export function calcularPrecoComMarkup(custo: number, acrescimoPercentual: number): number {
  return custo * (1 + acrescimoPercentual / 100);
}

export function calcularCustoMaoDeObra(valorHora: number, horas: number): number {
  return valorHora * horas;
}

interface TotaisOrcamento {
  custoTotal: number;
  precoTotal: number;
}

// Mão de obra entra pelo custo cheio nos dois lados (já é um custo decidido
// pela empresa, não leva o acréscimo de margem dos serviços em chapa).
export function recalcularTotais(
  itens: { custoCalculado: number; precoCalculado: number }[],
  maoDeObra: { custoTotal: number }[],
  despesas: { valor: number }[] = [],
): TotaisOrcamento {
  const custoItens = itens.reduce((soma, item) => soma + item.custoCalculado, 0);
  const precoItens = itens.reduce((soma, item) => soma + item.precoCalculado, 0);
  const custoMaoDeObra = maoDeObra.reduce((soma, m) => soma + m.custoTotal, 0);
  const totalDespesas = despesas.reduce((soma, d) => soma + d.valor, 0);

  return {
    custoTotal: custoItens + custoMaoDeObra + totalDespesas,
    precoTotal: precoItens + custoMaoDeObra + totalDespesas,
  };
}
