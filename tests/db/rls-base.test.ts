import { afterAll, beforeEach, expect, test } from 'vitest';
import { asUser, resetDb, seedLoja, sql } from './helpers';

beforeEach(resetDb);
afterAll(() => sql.end());

test('user of loja A cannot see tutores of loja B', async () => {
  const a = await seedLoja('A');
  const b = await seedLoja('B');
  await sql`insert into tutores (loja_id, nome, telefone_e164) values
    (${a.lojaId}, 'Ana', '+5511987654321'), (${b.lojaId}, 'Bia', '+5511912345678')`;
  const rows = await asUser(a.recepcaoId, (tx) => tx`select nome from tutores`);
  expect(rows.map((r) => r.nome)).toEqual(['Ana']);
});

test('user cannot insert a tutor into another loja', async () => {
  const a = await seedLoja('A');
  const b = await seedLoja('B');
  await expect(
    asUser(a.recepcaoId, (tx) => tx`insert into tutores (loja_id, nome, telefone_e164) values (${b.lojaId}, 'X', '+5511900000000')`),
  ).rejects.toThrow(/row-level security/);
});

test('recepcao cannot update configuracoes', async () => {
  const a = await seedLoja();
  const res = await asUser(a.recepcaoId, (tx) => tx`update configuracoes set teto_diario = 10 returning loja_id`);
  expect(res.length).toBe(0);
  const [cfg] = await sql`select teto_diario from configuracoes where loja_id = ${a.lojaId}`;
  expect(cfg.teto_diario).toBe(150);
});

test('dona can update configuracoes', async () => {
  const a = await seedLoja();
  const res = await asUser(a.donaId, (tx) => tx`update configuracoes set teto_diario = 10 returning teto_diario`);
  expect(res[0].teto_diario).toBe(10);
});

test('recepcao can read servicos but not create them', async () => {
  const a = await seedLoja();
  await expect(
    asUser(a.recepcaoId, (tx) => tx`insert into servicos (loja_id, nome, inclui_banho, inclui_tosa, ciclo_padrao_dias) values (${a.lojaId}, 'Banho', true, false, 15)`),
  ).rejects.toThrow(/row-level security/);
});

test('duplicate phone in same loja is rejected; same phone in another loja is allowed', async () => {
  const a = await seedLoja('A');
  const b = await seedLoja('B');
  await sql`insert into tutores (loja_id, nome, telefone_e164) values (${a.lojaId}, 'Ana', '+5511987654321')`;
  await expect(sql`insert into tutores (loja_id, nome, telefone_e164) values (${a.lojaId}, 'Ana 2', '+5511987654321')`).rejects.toThrow(/duplicate key/);
  await expect(sql`insert into tutores (loja_id, nome, telefone_e164) values (${b.lojaId}, 'Ana', '+5511987654321')`).resolves.toBeDefined();
});
