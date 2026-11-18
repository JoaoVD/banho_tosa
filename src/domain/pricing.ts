import type { Porte } from './types';

type ServicoPrecos = { incluiBanho: boolean; incluiTosa: boolean; precos: Record<Porte, { precoCentavos: number; duracaoMin: number }> };
export type Bloco = { profissionalId: string; inicio: Date; fim: Date };

export const priceFor = (s: ServicoPrecos, porte: Porte) => s.precos[porte].precoCentavos;
export const durationFor = (s: ServicoPrecos, porte: Porte) => s.precos[porte].duracaoMin;

const MIN = 60_000;
const round5 = (m: number) => Math.round(m / 5) * 5;

/** Blocos de agenda de um atendimento. Banho + tosa: 60% com o banhista, o resto com o tosador. */
export function blocksFor(s: ServicoPrecos, porte: Porte, inicio: Date, profs: { banho: string; tosa: string }): Bloco[] {
  const total = durationFor(s, porte);
  const fim = (de: Date, min: number) => new Date(de.getTime() + min * MIN);
  if (s.incluiBanho && s.incluiTosa) {
    const banho = round5(total * 0.6);
    const meio = fim(inicio, banho);
    return [
      { profissionalId: profs.banho, inicio, fim: meio },
      { profissionalId: profs.tosa, inicio: meio, fim: fim(inicio, total) },
    ];
  }
  return [{ profissionalId: s.incluiBanho ? profs.banho : profs.tosa, inicio, fim: fim(inicio, total) }];
}
