import { expect, test } from 'vitest';
import { freeSlots, pickDistinctSlots } from './slots';
import { atSP, hhmmSP } from './time';

test('horários livres respeitam o que está ocupado', () => {
  const livres = freeSlots({
    dia: '2026-11-20', abre: '08:00', fecha: '18:00', duracaoMin: 60,
    ocupados: [{ inicio: atSP('2026-11-20', '10:00'), fim: atSP('2026-11-20', '11:00') }],
  }).map(hhmmSP);
  expect(livres).toContain('09:00');
  expect(livres).toContain('11:00');
  expect(livres).not.toContain('10:00');
  expect(livres).not.toContain('10:30');
  expect(livres).not.toContain('09:30');
  expect(livres.at(-1)).toBe('17:00');
});

test('não oferece horário que já passou', () => {
  const livres = freeSlots({ dia: '2026-11-20', abre: '08:00', fecha: '12:00', duracaoMin: 30, ocupados: [], depoisDe: atSP('2026-11-20', '10:10') }).map(hhmmSP);
  expect(livres[0]).toBe('10:30');
});

test('cada pedido recebe um horário diferente', () => {
  const a = atSP('2026-11-20', '10:00'), b = atSP('2026-11-20', '11:00');
  expect(pickDistinctSlots([[a, b], [a, b], [a]], 3)).toEqual([a, b, null]);
});
