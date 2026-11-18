import { expect, test } from 'vitest';
import { availablePrizes, pointsEarned } from './points';

test('cada real pago vira 1 ponto (centavos não contam)', () => {
  expect(pointsEarned(7050)).toBe(70);
  expect(pointsEarned(99)).toBe(0);
  expect(pointsEarned(0)).toBe(0);
});

test('prêmios disponíveis para o saldo', () => {
  const premios = [
    { id: 'a', nome: 'Perfume e laço', pontos: 300, servicoId: null },
    { id: 'b', nome: 'Hidratação grátis', pontos: 500, servicoId: null },
    { id: 'c', nome: 'Banho grátis', pontos: 800, servicoId: null },
  ];
  expect(availablePrizes(520, premios).map((p) => p.id)).toEqual(['a', 'b']);
  expect(availablePrizes(100, premios)).toEqual([]);
});
