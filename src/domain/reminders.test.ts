import { expect, test } from 'vitest';
import { canSendReminder, selectReminderCandidates } from './reminders';

const now = new Date('2026-11-18T12:00:00Z');
const diasAtras = (n: number) => new Date(now.getTime() - n * 86_400_000);

test('limites de lembrete', () => {
  expect(canSendReminder([], now)).toBe(true);
  expect(canSendReminder([{ enviadoEm: diasAtras(3), respondido: false }], now)).toBe(false);
  expect(canSendReminder([{ enviadoEm: diasAtras(20), respondido: false }, { enviadoEm: diasAtras(10), respondido: false }], now)).toBe(false);
  expect(canSendReminder([{ enviadoEm: diasAtras(10), respondido: true }], now)).toBe(true);
  expect(canSendReminder([{ enviadoEm: diasAtras(20), respondido: true }, { enviadoEm: diasAtras(10), respondido: false }], now)).toBe(true);
});

test('um pet por tutor (o mais atrasado) e respeita quem desligou', () => {
  const st = (voltaEm: number) => ({ diasDesde: 15 - voltaEm, voltaEm, noPonto: true });
  const r = selectReminderCandidates(
    [
      { petId: 'thor', tutorId: 'ana', lembretesAtivos: true, status: st(0) },
      { petId: 'luna', tutorId: 'ana', lembretesAtivos: true, status: st(-5) },
      { petId: 'mel', tutorId: 'pedro', lembretesAtivos: false, status: st(-3) },
      { petId: 'bob', tutorId: 'carla', lembretesAtivos: true, status: { diasDesde: 3, voltaEm: 12, noPonto: false } },
    ],
    new Map(),
    now,
  );
  expect(r).toEqual([{ petId: 'luna', tutorId: 'ana' }]);
});
