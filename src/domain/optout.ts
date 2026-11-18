// Só palavras sem outro sentido: "cancelar" pode ser sobre o agendamento, não sobre as mensagens.
const PALAVRAS = new Set(['parar', 'sair', 'stop']);

/** O tutor pediu para não receber mais mensagens automáticas (mensagem só com a palavra). */
export function isOptOut(texto: string): boolean {
  const t = texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.!?\s]+$/g, '').trim();
  return PALAVRAS.has(t);
}
