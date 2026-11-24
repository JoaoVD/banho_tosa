import { expect, test } from 'vitest';
import { USUARIO_RE, normalizarUsuario } from './usuario';

test('aceita usuários comuns', () => {
  for (const u of ['ana', 'joao.tosa', 'recepcao-2', 'carla_b', 'dona.demo']) expect(USUARIO_RE.test(u)).toBe(true);
});

test('recusa ponto no começo, no fim ou repetido (o Supabase não aceitaria o e-mail interno)', () => {
  for (const u of ['.ana', 'ana.', 'a..b', 'ab', 'joão', 'a b']) expect(USUARIO_RE.test(u)).toBe(false);
});

test('normaliza espaços e maiúsculas', () => {
  expect(normalizarUsuario('  Ana.Paula ')).toBe('ana.paula');
});
