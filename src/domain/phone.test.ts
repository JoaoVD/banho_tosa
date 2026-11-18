import { expect, test } from 'vitest';
import { normalizePhone } from './phone';

test.each([
  '(11) 98765-4321',
  '11987654321',
  '+55 11 98765-4321',
  '5511987654321',
  '5511987654321@s.whatsapp.net',
  '(11) 8765-4321',
])('%s vira +5511987654321', (raw) => {
  expect(normalizePhone(raw)).toBe('+5511987654321');
});

test('fixo continua fixo', () => {
  expect(normalizePhone('(11) 3456-7890')).toBe('+551134567890');
});

test.each(['123', '', 'abc', '(11) 1234'])('inválido: %j', (raw) => {
  expect(normalizePhone(raw)).toBeNull();
});

import { formatPhoneBR } from './phone';

test('formatPhoneBR mostra no formato brasileiro', () => {
  expect(formatPhoneBR('+5511987654321')).toBe('(11) 98765-4321');
  expect(formatPhoneBR('+551134567890')).toBe('(11) 3456-7890');
});
