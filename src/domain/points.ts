import type { Premio } from './types';

/** R$ 1 pago = 1 ponto. */
export const pointsEarned = (paidCentavos: number): number => Math.max(0, Math.floor(paidCentavos / 100));

export const availablePrizes = (saldo: number, premios: Premio[]): Premio[] =>
  premios.filter((p) => p.pontos <= saldo).sort((a, b) => a.pontos - b.pontos);
