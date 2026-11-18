import { expect, test } from 'vitest';
import { DEFAULT_TEMPLATES, TEMPLATE_VARS, renderTemplate, unknownVars } from './templates';

test('troca as variáveis e deixa as desconhecidas visíveis', () => {
  expect(renderTemplate('Oi {tutor}! {x}', { tutor: 'Ana' })).toBe('Oi Ana! {x}');
});

test('modelos padrão só usam variáveis conhecidas do seu tipo', () => {
  for (const [tipo, texto] of Object.entries(DEFAULT_TEMPLATES)) {
    expect(unknownVars(texto, tipo as keyof typeof TEMPLATE_VARS)).toEqual([]);
  }
  expect(unknownVars('Oi {tutor}, {foo}', 'pronto')).toEqual(['foo']);
});
