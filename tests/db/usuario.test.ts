import { afterAll, beforeEach, expect, test } from 'vitest';
import { resetDb, seedLoja, sql } from './helpers';

beforeEach(resetDb);
afterAll(async () => { await sql.end(); });

async function perfil(lojaId: string, email: string, usuario?: string) {
  const id = crypto.randomUUID();
  await sql`insert into auth.users (id, email) values (${id}, ${email})`;
  if (usuario === undefined) await sql`insert into perfis (user_id, loja_id, nome, papel) values (${id}, ${lojaId}, 'X', 'recepcao')`;
  else await sql`insert into perfis (user_id, loja_id, nome, papel, usuario) values (${id}, ${lojaId}, 'X', 'recepcao', ${usuario})`;
  const [p] = await sql`select usuario from perfis where user_id = ${id}`;
  return p.usuario as string;
}

test('usuario é único sem diferenciar maiúsculas', async () => {
  const { lojaId } = await seedLoja();
  await perfil(lojaId, 'a@x.com', 'ana');
  await expect(perfil(lojaId, 'b@x.com', 'Ana')).rejects.toMatchObject({ code: '23505' });
});

test('formato inválido é recusado', async () => {
  const { lojaId } = await seedLoja();
  for (const u of ['a b', 'ab', 'x'.repeat(31), 'joão']) {
    await expect(perfil(lojaId, `${crypto.randomUUID()}@x.com`, u)).rejects.toMatchObject({ code: '23514' });
  }
});

test('sem usuário informado, nasce da parte do e-mail antes do @, numerado se repetir', async () => {
  const { lojaId } = await seedLoja();
  expect(await perfil(lojaId, 'Ana.Paula@x.com')).toBe('ana.paula');
  expect(await perfil(lojaId, 'ana.paula@y.com')).toBe('ana.paula2');
  expect(await perfil(lojaId, 'jo@z.com')).toBe('jo1');
  expect((await perfil(lojaId, `${'b'.repeat(40)}@x.com`)).length).toBeLessThanOrEqual(30);
});
