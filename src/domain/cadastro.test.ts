import { expect, test } from 'vitest';
import { faixaDoIp, validarCadastro } from './cadastro';

const ok = { loja: 'Pet Spa', nome: 'Mariana', usuario: 'mariana', email: 'm@x.com', senha: 'senha1234' };

test('cadastro válido não tem erros', () => {
  expect(validarCadastro(ok)).toEqual({});
});

test('limites de tamanho do nome da loja e da pessoa', () => {
  expect(validarCadastro({ ...ok, loja: 'x'.repeat(81) }).loja).toBe('Use até 80 caracteres.');
  expect(validarCadastro({ ...ok, nome: 'x'.repeat(61) }).nome).toBe('Use até 60 caracteres.');
});

test('e-mail interno do sistema não pode ser usado', () => {
  expect(validarCadastro({ ...ok, email: 'joao@usuarios.banhotosa.local' }).email).toBe('E-mail inválido.');
  expect(validarCadastro({ ...ok, email: 'sem-arroba' }).email).toBe('E-mail inválido.');
});

test('IPv6 conta pela faixa /64; IPv4 pelo endereço', () => {
  expect(faixaDoIp('2804:14c:1:2:aaaa:bbbb:cccc:dddd')).toBe('2804:14c:1:2::/64');
  expect(faixaDoIp('2804:14c:1:2::9')).toBe('2804:14c:1:2::/64');
  expect(faixaDoIp('200.1.2.3')).toBe('200.1.2.3');
  expect(faixaDoIp('::ffff:127.0.0.1')).toBe('127.0.0.1');
});
