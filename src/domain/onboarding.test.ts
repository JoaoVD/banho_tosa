import { expect, test } from 'vitest';
import { etapaInicial, resumoEquipe, resumoHorarios } from './onboarding';
import { PRESETS_HORARIO } from './catalogo';

test('resumo dos horários junta dias seguidos com o mesmo horário', () => {
  expect(resumoHorarios(PRESETS_HORARIO[0].dias)).toBe('Seg a Sex, 08:00–18:00 · Sáb, 08:00–14:00');
  expect(resumoHorarios(PRESETS_HORARIO[1].dias)).toBe('Seg a Sáb, 08:00–18:00');
  expect(resumoHorarios([{ diaSemana: 2, abre: '09:00', fecha: '17:00' }, { diaSemana: 4, abre: '09:00', fecha: '17:00' }])).toBe('Ter e Qui, 09:00–17:00');
  expect(resumoHorarios([])).toBe('Fechado todos os dias');
});

test('resumo da equipe', () => {
  expect(resumoEquipe([{ nome: 'Júlia', funcao: 'banho' }, { nome: 'Marcos', funcao: 'tosa' }])).toBe('Júlia (banho) e Marcos (tosa)');
  expect(resumoEquipe([{ nome: 'A', funcao: 'banho' }, { nome: 'B', funcao: 'banho' }, { nome: 'C', funcao: 'tosa' }])).toBe('A (banho), B (banho) e C (tosa)');
});

test('a conversa começa na primeira etapa que falta', () => {
  expect(etapaInicial({ horarios: 0, equipe: 0, servicos: 0 })).toBe('horarios');
  expect(etapaInicial({ horarios: 6, equipe: 0, servicos: 0 })).toBe('equipe');
  expect(etapaInicial({ horarios: 6, equipe: 2, servicos: 0 })).toBe('servicos');
  expect(etapaInicial({ horarios: 6, equipe: 2, servicos: 7 })).toBe('clientes');
});

test('preços do primeiro acesso: inteiros de 0 a R$ 10.000', async () => {
  const { validarPrecos } = await import('./onboarding');
  const p = { mini: 5000, pequeno: 7000, medio: 8500, grande: 11000, gigante: 14000 };
  expect(validarPrecos({ Banho: p })).toEqual({ Banho: p });
  expect(validarPrecos({ Banho: { ...p, mini: 9_999_999_900 } })).toBeNull();
  expect(validarPrecos({ Banho: { ...p, mini: -1 } })).toBeNull();
  expect(validarPrecos({ Banho: { ...p, mini: Number.NaN } })).toBeNull();
  expect(validarPrecos({ Banho: { ...p, mini: 10.5 } })).toBeNull();
});

test('horários repetidos no mesmo dia ficam um só', async () => {
  const { normalizarHorarios } = await import('./onboarding');
  expect(normalizarHorarios([{ diaSemana: 1, abre: '08:00', fecha: '18:00' }, { diaSemana: 1, abre: '09:00', fecha: '17:00' }])).toEqual({ ok: true, dias: [{ diaSemana: 1, abre: '08:00', fecha: '18:00' }] });
  expect(normalizarHorarios([{ diaSemana: 9, abre: '08:00', fecha: '18:00' }])).toEqual({ ok: false, erro: 'Escolha pelo menos um dia.' });
  expect(normalizarHorarios([{ diaSemana: 1, abre: '18:00', fecha: '08:00' }])).toEqual({ ok: false, erro: 'O horário de fechar precisa ser depois do de abrir.' });
});
