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
