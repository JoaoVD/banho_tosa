import { expect, test } from 'vitest';
import { isExpired, usablePackage } from './packages';
import type { PacoteCliente } from './types';

const base: PacoteCliente = { id: 'p1', saldo: 2, validoAte: '2026-12-05', servicoId: 'banho', porte: null };
const ctx = { servicoId: 'banho', porte: 'pequeno' as const, hoje: '2026-11-18' };

test('pacote vencido ontem não serve', () => {
  expect(isExpired({ ...base, validoAte: '2026-11-17' }, '2026-11-18')).toBe(true);
  expect(isExpired({ ...base, validoAte: '2026-11-18' }, '2026-11-18')).toBe(false);
  expect(usablePackage([{ ...base, validoAte: '2026-11-17' }], ctx)).toBeNull();
});

test('pacote de porte grande não serve para pequeno; sem saldo também não', () => {
  expect(usablePackage([{ ...base, porte: 'grande' }], ctx)).toBeNull();
  expect(usablePackage([{ ...base, saldo: 0 }], ctx)).toBeNull();
  expect(usablePackage([{ ...base, servicoId: 'tosa' }], ctx)).toBeNull();
});

test('entre dois pacotes, usa o que vence primeiro', () => {
  const p = usablePackage([{ ...base, id: 'tarde', validoAte: '2026-12-20' }, { ...base, id: 'cedo', validoAte: '2026-12-01' }], ctx);
  expect(p?.id).toBe('cedo');
});
