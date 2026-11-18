import { expect, test } from 'vitest';
import { blocksFor, durationFor, priceFor } from './pricing';
import { atSP } from './time';

const precos = { mini: { precoCentavos: 7000, duracaoMin: 75 }, pequeno: { precoCentavos: 8500, duracaoMin: 90 }, medio: { precoCentavos: 10000, duracaoMin: 105 }, grande: { precoCentavos: 13000, duracaoMin: 120 }, gigante: { precoCentavos: 16000, duracaoMin: 150 } };
const banhoTosa = { incluiBanho: true, incluiTosa: true, precos };
const banho = { incluiBanho: true, incluiTosa: false, precos };
const profs = { banho: 'julia', tosa: 'marcos' };

test('preço e duração por porte', () => {
  expect(priceFor(banhoTosa, 'pequeno')).toBe(8500);
  expect(durationFor(banhoTosa, 'grande')).toBe(120);
});

test('banho + tosa ocupa banhista e depois tosador (60/40, múltiplo de 5 min)', () => {
  const inicio = atSP('2026-11-20', '10:00');
  const b = blocksFor(banhoTosa, 'pequeno', inicio, profs);
  expect(b).toHaveLength(2);
  expect(b[0]).toEqual({ profissionalId: 'julia', inicio, fim: atSP('2026-11-20', '10:55') });
  expect(b[1]).toEqual({ profissionalId: 'marcos', inicio: atSP('2026-11-20', '10:55'), fim: atSP('2026-11-20', '11:30') });
});

test('só banho ocupa só o banhista', () => {
  const inicio = atSP('2026-11-20', '10:00');
  expect(blocksFor(banho, 'pequeno', inicio, profs)).toEqual([{ profissionalId: 'julia', inicio, fim: atSP('2026-11-20', '11:30') }]);
});
