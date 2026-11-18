import { expect, test } from 'vitest';
import { addDaysKey, atSP, dayKeySP, startOfDaySP } from './time';

test('dayKeySP usa o dia local de São Paulo', () => {
  expect(dayKeySP(new Date('2026-11-19T02:50:00Z'))).toBe('2026-11-18');
  expect(dayKeySP(new Date('2026-11-19T03:00:00Z'))).toBe('2026-11-19');
});

test('atSP converte horário local para instante', () => {
  expect(atSP('2026-11-19', '09:00').toISOString()).toBe('2026-11-19T12:00:00.000Z');
});

test('startOfDaySP é a meia-noite local', () => {
  expect(startOfDaySP(new Date('2026-11-19T02:50:00Z')).toISOString()).toBe('2026-11-18T03:00:00.000Z');
});

test('addDaysKey soma dias atravessando o mês', () => {
  expect(addDaysKey('2026-11-30', 1)).toBe('2026-12-01');
  expect(addDaysKey('2026-11-01', -1)).toBe('2026-10-31');
});
