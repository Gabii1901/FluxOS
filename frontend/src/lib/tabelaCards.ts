/**
 * Copia o título de cada coluna (1ª linha do <thead>) para o atributo data-label
 * das células, que o CSS de "tabela-cards" mostra no celular ao lado do valor.
 * Funciona para qualquer <table class="tabela-cards"> dentro de `raiz`, inclusive
 * as que aparecem depois (listas carregadas, filtros, paginação).
 */
export function rotularTabelas(raiz: HTMLElement) {
  const aplicar = () => {
    for (const tabela of raiz.querySelectorAll<HTMLTableElement>("table.tabela-cards")) {
      const titulos: string[] = [];
      tabela.tHead?.rows[0]?.querySelectorAll("th").forEach((th) => {
        const texto = th.textContent?.trim() ?? "";
        for (let i = 0; i < (th.colSpan || 1); i++) titulos.push(texto);
      });
      for (const corpo of [...Array.from(tabela.tBodies), tabela.tFoot].filter(Boolean) as HTMLTableSectionElement[]) {
        for (const linha of Array.from(corpo.rows)) {
          let coluna = 0;
          for (const celula of Array.from(linha.cells)) {
            const titulo = titulos[coluna] ?? "";
            if (titulo && celula.getAttribute("data-label") !== titulo) celula.setAttribute("data-label", titulo);
            coluna += celula.colSpan || 1;
          }
        }
      }
    }
  };

  aplicar();
  let agendado = false;
  const observador = new MutationObserver(() => {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(() => {
      agendado = false;
      aplicar();
    });
  });
  observador.observe(raiz, { childList: true, subtree: true });
  return () => observador.disconnect();
}
