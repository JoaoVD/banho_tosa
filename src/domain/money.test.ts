import { describe, expect, test } from 'vitest';
import { formatBRL, parseBRL } from './money';

describe('parseBRL', () => {
  test.each([
    ['1.234,56', 123456],
    ['80', 8000],
    ['80,5', 8050],
    [' 80,50 ', 8050],
    ['R$ 80,50', 8050],
    ['0,99', 99],
  ])('%s -> %i centavos', (input, cents) => {
    expect(parseBRL(input)).toBe(cents);
  });

  test.each(['abc', '', '   ', '1,2,3', '-5'])('rejeita %j', (input) => {
    expect(parseBRL(input)).toBeNull();
  });
});

test('formatBRL formata em reais', () => {
  expect(formatBRL(7000).replace(/ /g, ' ')).toBe('R$ 70,00');
  expect(formatBRL(123456).replace(/ /g, ' ')).toBe('R$ 1.234,56');
});
