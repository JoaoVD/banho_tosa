import { expect, test } from 'vitest';
import { boardEtapa, nextStage, stageVerb } from './stages';
import { atSP } from './time';

const banho = { incluiBanho: true, incluiTosa: false };
const banhoTosa = { incluiBanho: true, incluiTosa: true };
const tosa = { incluiBanho: false, incluiTosa: true };

test('próxima etapa respeita o serviço', () => {
  expect(nextStage('chegando', banho)).toBe('banho');
  expect(nextStage('chegando', tosa)).toBe('tosa');
  expect(nextStage('banho', banho)).toBe('pronto');
  expect(nextStage('banho', banhoTosa)).toBe('tosa');
  expect(nextStage('tosa', banhoTosa)).toBe('pronto');
  expect(nextStage('pronto', banho)).toBeNull();
});

test('verbos dos botões', () => {
  expect(stageVerb('banho')).toBe('Começar banho');
  expect(stageVerb('tosa')).toBe('Levar para tosa');
  expect(stageVerb('pronto')).toBe('Marcar como pronto');
});

test('agendado de hoje aparece em Chegando', () => {
  expect(boardEtapa({ etapa: 'agendado', inicio: atSP('2026-11-18', '10:00') }, '2026-11-18')).toBe('chegando');
  expect(boardEtapa({ etapa: 'agendado', inicio: atSP('2026-11-19', '10:00') }, '2026-11-18')).toBeNull();
  expect(boardEtapa({ etapa: 'banho', inicio: atSP('2026-11-18', '10:00') }, '2026-11-18')).toBe('banho');
  expect(boardEtapa({ etapa: 'concluido', inicio: atSP('2026-11-18', '10:00') }, '2026-11-18')).toBe('pronto');
  expect(boardEtapa({ etapa: 'cancelado', inicio: atSP('2026-11-18', '10:00') }, '2026-11-18')).toBeNull();
});
