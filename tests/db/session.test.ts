import { afterAll, beforeEach, expect, test } from 'vitest';
import { resetDb, seedLoja, sql } from './helpers';
import { withSession } from '@/db/session';
import { db } from '@/db/client';

beforeEach(resetDb);
afterAll(async () => {
  await sql.end();
  await db.end();
});

test('withSession enforces RLS', async () => {
  const a = await seedLoja('A');
  const b = await seedLoja('B');
  await sql`insert into tutores (loja_id, nome, telefone_e164) values
    (${a.lojaId}, 'Ana', '+5511987654321'), (${b.lojaId}, 'Bia', '+5511912345678')`;
  const user = { id: a.recepcaoId, lojaId: a.lojaId, papel: 'recepcao' as const, nome: 'Renata' };
  const rows = await withSession(user, (tx) => tx`select nome from tutores`);
  expect(rows.map((r) => r.nome)).toEqual(['Ana']);
});
