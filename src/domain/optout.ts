const PALAVRAS = new Set(['parar', 'pare', 'sair', 'cancelar', 'stop']);

/** O tutor pediu para não receber mais mensagens automáticas (mensagem só com a palavra). */
export function isOptOut(texto: string): boolean {
  const t = texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.!?\s]+$/g, '').trim();
  return PALAVRAS.has(t);
}
