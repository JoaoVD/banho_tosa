import { dayKeySP } from './time';
import type { Etapa } from './types';

export const BOARD_STAGES = ['chegando', 'banho', 'tosa', 'pronto'] as const;
export type BoardStage = (typeof BOARD_STAGES)[number];
export const BOARD_LABEL: Record<BoardStage, string> = {
  chegando: 'Chegando',
  banho: 'No banho',
  tosa: 'Na tosa',
  pronto: 'Pronto para buscar',
};

type ServicoEtapas = { incluiBanho: boolean; incluiTosa: boolean };

export function nextStage(etapa: Etapa, servico: ServicoEtapas): Etapa | null {
  switch (etapa) {
    case 'agendado':
    case 'chegando':
      return servico.incluiBanho ? 'banho' : 'tosa';
    case 'banho':
      return servico.incluiTosa ? 'tosa' : 'pronto';
    case 'tosa':
      return 'pronto';
    default:
      return null;
  }
}

export function stageVerb(etapa: 'banho' | 'tosa' | 'pronto'): string {
  return { banho: 'Começar banho', tosa: 'Levar para tosa', pronto: 'Marcar como pronto' }[etapa];
}

/** Coluna do quadro do dia em que o atendimento aparece, ou null se não aparece hoje. */
export function boardEtapa(a: { etapa: Etapa; inicio: Date }, today: string): BoardStage | null {
  if (dayKeySP(a.inicio) !== today) return null;
  switch (a.etapa) {
    case 'agendado':
    case 'chegando':
      return 'chegando';
    case 'banho':
    case 'tosa':
    case 'pronto':
      return a.etapa;
    case 'concluido':
      return 'pronto';
    default:
      return null;
  }
}
