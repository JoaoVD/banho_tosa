import { afterAll, beforeEach, expect, test } from 'vitest';
import { resetDb, seedLoja, seedOperacao, sql } from './helpers';

beforeEach(resetDb);
afterAll(() => sql.end());

async function agendamento(lojaId: string, op: Awaited<ReturnType<typeof seedOperacao>>, inicio: string, fim: string) {
  const [a] = await sql`insert into agendamentos (loja_id, pet_id, servico_id, preco_centavos, inicio, fim)
    values (${lojaId}, ${op.petId}, ${op.banhoId}, 7000, ${inicio}, ${fim}) returning id`;
  return a.id as string;
}

test('dois blocos ativos sobrepostos do mesmo profissional são recusados (23P01)', async () => {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  const ag1 = await agendamento(a.lojaId, op, '2026-11-20T13:00:00Z', '2026-11-20T14:00:00Z');
  const ag2 = await agendamento(a.lojaId, op, '2026-11-20T13:30:00Z', '2026-11-20T14:30:00Z');
  await sql`insert into agendamento_blocos (loja_id, agendamento_id, profissional_id, periodo) values (${a.lojaId}, ${ag1}, ${op.juliaId}, tstzrange('2026-11-20T13:00:00Z', '2026-11-20T14:00:00Z'))`;
  await expect(
    sql`insert into agendamento_blocos (loja_id, agendamento_id, profissional_id, periodo) values (${a.lojaId}, ${ag2}, ${op.juliaId}, tstzrange('2026-11-20T13:30:00Z', '2026-11-20T14:30:00Z'))`,
  ).rejects.toMatchObject({ code: '23P01' });
});

test('bloco inativo (cancelado) libera o horário; outro profissional também pode', async () => {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  const ag1 = await agendamento(a.lojaId, op, '2026-11-20T13:00:00Z', '2026-11-20T14:00:00Z');
  const ag2 = await agendamento(a.lojaId, op, '2026-11-20T13:00:00Z', '2026-11-20T14:00:00Z');
  await sql`insert into agendamento_blocos (loja_id, agendamento_id, profissional_id, periodo, ativo) values (${a.lojaId}, ${ag1}, ${op.juliaId}, tstzrange('2026-11-20T13:00:00Z', '2026-11-20T14:00:00Z'), false)`;
  await sql`insert into agendamento_blocos (loja_id, agendamento_id, profissional_id, periodo) values (${a.lojaId}, ${ag2}, ${op.juliaId}, tstzrange('2026-11-20T13:00:00Z', '2026-11-20T14:00:00Z'))`;
  await sql`insert into agendamento_blocos (loja_id, agendamento_id, profissional_id, periodo) values (${a.lojaId}, ${ag1}, ${op.marcosId}, tstzrange('2026-11-20T13:00:00Z', '2026-11-20T14:00:00Z'))`;
  const [{ n }] = await sql`select count(*)::int as n from agendamento_blocos`;
  expect(n).toBe(3);
});
