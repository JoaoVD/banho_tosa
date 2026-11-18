import { expect, test } from 'vitest';
import { businessDayFor, drawerDiff, summarizeDay } from './cash';

test('dia do caixa é o dia local; dia fechado empurra para o seguinte', () => {
  expect(businessDayFor(new Date('2026-11-19T02:50:00Z'), new Set())).toBe('2026-11-18');
  expect(businessDayFor(new Date('2026-11-18T22:00:00Z'), new Set(['2026-11-18']))).toBe('2026-11-19');
});

test('resumo por forma ignora estornados', () => {
  const r = summarizeDay([
    { forma: 'pix', totalCentavos: 13000, estornado: false },
    { forma: 'dinheiro', totalCentavos: 8500, estornado: false },
    { forma: 'credito', totalCentavos: 26000, estornado: true },
    { forma: 'pacote', totalCentavos: 0, estornado: false },
  ]);
  expect(r).toEqual({ totalCentavos: 21500, porForma: { pix: 13000, credito: 0, debito: 0, dinheiro: 8500 } });
});

test('conferência da gaveta', () => {
  expect(drawerDiff(7000, 0, 7000)).toEqual({ diferenca: 0, estado: 'confere' });
  expect(drawerDiff(7000, 0, 6500)).toEqual({ diferenca: -500, estado: 'falta' });
  expect(drawerDiff(7000, 5000, 12500)).toEqual({ diferenca: 500, estado: 'sobra' });
});
