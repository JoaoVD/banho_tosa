import { afterAll, beforeEach, expect, test } from 'vitest';
import { asUser, resetDb, seedLoja, seedOperacao, sql } from './helpers';
import { commitImport } from '@/db/repos/importacao';
import { validateRows } from '@/domain/import';

beforeEach(resetDb);
afterAll(() => sql.end());

const mapping = { 0: 'tutor', 1: 'telefone', 2: 'pet', 3: 'porte', 4: 'ultima_visita' } as const;
const linhas = validateRows(
  [
    ['Ana Souza', '(11) 91111-2222', 'Thor', 'P', '04/11/2026'],
    ['Ana Souza', '11911112222', 'Luna', 'M', ''],
    ['Bia Lima', '(21) 99876-5432', 'Mel', 'G', '20/10/2026'],
  ],
  mapping,
).ok;

test('importa tutores, pets e a última visita como atendimento concluído', async () => {
  const a = await seedLoja();
  await seedOperacao(a.lojaId);
  const r = await asUser(a.donaId, (tx) => commitImport(tx, a.lojaId, linhas));
  expect(r).toMatchObject({ tutores: 2, pets: 3, historicos: 2 });
  const [{ n }] = await sql`select count(*)::int as n from agendamentos where etapa = 'concluido' and historico`;
  expect(n).toBe(2 + 0);
});

test('importar de novo não duplica tutores, pets nem visitas', async () => {
  const a = await seedLoja();
  await seedOperacao(a.lojaId);
  await asUser(a.donaId, (tx) => commitImport(tx, a.lojaId, linhas));
  const r2 = await asUser(a.donaId, (tx) => commitImport(tx, a.lojaId, linhas));
  expect(r2).toMatchObject({ tutores: 0, pets: 0, historicos: 0 });
  const [{ t }] = await sql`select count(*)::int as t from tutores where loja_id = ${a.lojaId}`;
  const [{ p }] = await sql`select count(*)::int as p from pets where loja_id = ${a.lojaId}`;
  expect([t, p]).toEqual([3, 4]); // inclui o tutor e o pet do seedOperacao
});
