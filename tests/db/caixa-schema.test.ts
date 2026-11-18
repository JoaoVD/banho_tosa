import { afterAll, beforeEach, expect, test } from 'vitest';
import { resetDb, seedLoja, seedOperacao, sql } from './helpers';

beforeEach(resetDb);
afterAll(() => sql.end());

test('pagamentos com a mesma chave de idempotência são recusados (23505)', async () => {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  const key = crypto.randomUUID();
  const ins = () => sql`insert into pagamentos (loja_id, tutor_id, forma, total_centavos, dia_caixa, idempotency_key)
    values (${a.lojaId}, ${op.tutorId}, 'pix', 7000, '2026-11-18', ${key})`;
  await ins();
  await expect(ins()).rejects.toMatchObject({ code: '23505' });
});

test('saldo de pontos é a soma dos movimentos', async () => {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  await sql`insert into movimentos_pontos (loja_id, tutor_id, delta, motivo) values
    (${a.lojaId}, ${op.tutorId}, 300, 'Banho'), (${a.lojaId}, ${op.tutorId}, -200, 'Prêmio')`;
  const [r] = await sql`select saldo from saldo_pontos where tutor_id = ${op.tutorId}`;
  expect(r.saldo).toBe(100);
});
