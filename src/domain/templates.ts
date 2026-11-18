export type TipoMensagem = 'lembrete_retorno' | 'confirmacao' | 'vespera' | 'pronto' | 'pacote_acabando' | 'resumo_caixa';

export const TIPOS_MENSAGEM: TipoMensagem[] = ['lembrete_retorno', 'confirmacao', 'vespera', 'pronto', 'pacote_acabando', 'resumo_caixa'];

export const TIPO_LABEL: Record<TipoMensagem, string> = {
  lembrete_retorno: 'Lembrete de retorno',
  confirmacao: 'Confirmação de agendamento',
  vespera: 'Lembrete na véspera',
  pronto: 'Pet pronto',
  pacote_acabando: 'Pacote acabando',
  resumo_caixa: 'Resumo do caixa (para a dona)',
};

export const TEMPLATE_VARS: Record<TipoMensagem, string[]> = {
  lembrete_retorno: ['tutor', 'pet', 'dia', 'hora'],
  confirmacao: ['tutor', 'pet', 'dia', 'hora', 'servico'],
  vespera: ['tutor', 'pet', 'hora', 'servico'],
  pronto: ['tutor', 'pet'],
  pacote_acabando: ['tutor', 'pet', 'pacote'],
  resumo_caixa: ['dia', 'total', 'pix', 'credito', 'debito', 'dinheiro', 'gaveta'],
};

export const DEFAULT_TEMPLATES: Record<TipoMensagem, string> = {
  lembrete_retorno: 'Oi {tutor}! O {pet} já está no ponto do banho. Temos {dia} às {hora}, pode ser?',
  confirmacao: 'Agendado! {pet} na {dia}, às {hora}. Até lá!',
  vespera: 'Oi {tutor}! Confirmando o banho do {pet} amanhã às {hora}. Responda SIM para confirmar.',
  pronto: 'Oi {tutor}! O {pet} está pronto e cheiroso. Pode vir buscar quando quiser.',
  pacote_acabando: 'Oi {tutor}! O pacote do {pet} tem só 1 banho restante. Quer renovar?',
  resumo_caixa: 'Caixa de {dia}: {total}. Pix {pix}, crédito {credito}, débito {debito}, dinheiro {dinheiro}. Gaveta: {gaveta}.',
};

const VAR = /\{(\w+)\}/g;

export function renderTemplate(texto: string, vars: Record<string, string>): string {
  return texto.replace(VAR, (m, k: string) => (k in vars ? vars[k] : m));
}

export function unknownVars(texto: string, tipo: TipoMensagem): string[] {
  const ok = new Set(TEMPLATE_VARS[tipo]);
  return [...new Set([...texto.matchAll(VAR)].map((m) => m[1]).filter((k) => !ok.has(k)))];
}
