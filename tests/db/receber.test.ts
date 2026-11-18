import { afterAll, beforeEach, expect, test } from 'vitest';
import { asUser, resetDb, seedLoja, seedOperacao, sql } from './helpers';
import { AjusteSemMotivo, previewRecebimento, receber } from '@/db/repos/pagamentos';

beforeEach(resetDb);
afterAll(() => sql.end());

async function prepararDia() {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  const novo = async (petId: string, servicoId: string, preco: number, h: string) => {
    const [r] = await sql`insert into agendamentos (loja_id, pet_id, servico_id, preco_centavos, etapa, inicio, fim)
      values (${a.lojaId}, ${petId}, ${servicoId}, ${preco}, 'pronto', ${`2026-11-18T${h}:00:00Z`}, ${`2026-11-18T${h}:59:00Z`}) returning id`;
    return r.id as string;
  };
  const [luna] = await sql`insert into pets (loja_id, tutor_id, nome, porte) values (${a.lojaId}, ${op.tutorId}, 'Luna', 'pequeno') returning id`;
  const thorAg = await novo(op.petId, op.banhoId, 7000, '12');
  const lunaAg = await novo(luna.id, op.banhoId, 7000, '13');
  return { a, op, thorAg, lunaAg };
}

const base = { usarPacote: false, forma: 'pix' as const, diaCaixa: '2026-11-18' };

test('recebe por pix: total, pontos e atendimento concluído', async () => {
  const { a, thorAg } = await prepararDia();
  const r = await asUser(a.recepcaoId, (tx) => receber(tx, a.lojaId, a.recepcaoId, { ...base, idempotencyKey: crypto.randomUUID(), agendamentoIds: [thorAg] }));
  expect(r).toMatchObject({ totalCentavos: 7000, pontosGanhos: 70 });
  const [ag] = await sql`select etapa from agendamentos where id = ${thorAg}`;
  expect(ag.etapa).toBe('concluido');
  const [p] = await sql`select saldo from saldo_pontos`;
  expect(p.saldo).toBe(70);
});

test('usa o banho do pacote: total zero, saldo diminui, sem pontos', async () => {
  const { a, op, thorAg } = await prepararDia();
  const [pc] = await sql`insert into pacotes_cliente (loja_id, tutor_id, nome, servico_id, total, saldo, valido_ate)
    values (${a.lojaId}, ${op.tutorId}, '4 banhos no mês', ${op.banhoId}, 4, 1, '2026-12-05') returning id`;
  const prev = await asUser(a.recepcaoId, (tx) => previewRecebimento(tx, [thorAg], '2026-11-18'));
  expect(prev.pacoteUsavel?.id).toBe(pc.id);
  const r = await asUser(a.recepcaoId, (tx) => receber(tx, a.lojaId, a.recepcaoId, { ...base, forma: null, usarPacote: true, idempotencyKey: crypto.randomUUID(), agendamentoIds: [thorAg] }));
  expect(r).toMatchObject({ totalCentavos: 0, pontosGanhos: 0 });
  const [p] = await sql`select saldo from pacotes_cliente where id = ${pc.id}`;
  expect(p.saldo).toBe(0);
  const [pg] = await sql`select forma from pagamentos`;
  expect(pg.forma).toBe('pacote');
});

test('mesma chave duas vezes: um pagamento só', async () => {
  const { a, thorAg } = await prepararDia();
  const key = crypto.randomUUID();
  const input = { ...base, idempotencyKey: key, agendamentoIds: [thorAg] };
  const [r1, r2] = await Promise.all([
    asUser(a.recepcaoId, (tx) => receber(tx, a.lojaId, a.recepcaoId, input)),
    asUser(a.recepcaoId, (tx) => receber(tx, a.lojaId, a.recepcaoId, input)),
  ]);
  expect(r1.pagamentoId).toBe(r2.pagamentoId);
  const [{ n }] = await sql`select count(*)::int as n from pagamentos`;
  expect(n).toBe(1);
  const [p] = await sql`select saldo from saldo_pontos`;
  expect(p.saldo).toBe(70);
});

test('dois pets do mesmo tutor num pagamento só', async () => {
  const { a, thorAg, lunaAg } = await prepararDia();
  const prev = await asUser(a.recepcaoId, (tx) => previewRecebimento(tx, [thorAg], '2026-11-18'));
  expect(prev.outrosProntosDoTutor.map((o) => o.petNome)).toEqual(['Luna']);
  const r = await asUser(a.recepcaoId, (tx) => receber(tx, a.lojaId, a.recepcaoId, { ...base, idempotencyKey: crypto.randomUUID(), agendamentoIds: [thorAg, lunaAg] }));
  expect(r.totalCentavos).toBe(14000);
  const [{ n }] = await sql`select count(*)::int as n from pagamento_itens where pagamento_id = ${r.pagamentoId}`;
  expect(n).toBe(2);
});

test('ajuste de preço exige motivo', async () => {
  const { a, thorAg } = await prepararDia();
  await expect(
    asUser(a.recepcaoId, (tx) => receber(tx, a.lojaId, a.recepcaoId, { ...base, idempotencyKey: crypto.randomUUID(), agendamentoIds: [thorAg], ajustes: [{ agendamentoId: thorAg, valorCentavos: 6000, motivo: ' ' }] })),
  ).rejects.toBeInstanceOf(AjusteSemMotivo);
  const r = await asUser(a.recepcaoId, (tx) => receber(tx, a.lojaId, a.recepcaoId, { ...base, idempotencyKey: crypto.randomUUID(), agendamentoIds: [thorAg], ajustes: [{ agendamentoId: thorAg, valorCentavos: 6000, motivo: 'Cliente antigo' }] }));
  expect(r.totalCentavos).toBe(6000);
});

test('trocar pontos por prêmio do mesmo serviço zera o item', async () => {
  const { a, op, thorAg } = await prepararDia();
  await sql`insert into movimentos_pontos (loja_id, tutor_id, delta, motivo) values (${a.lojaId}, ${op.tutorId}, 600, 'Importação')`;
  const [pr] = await sql`insert into premios (loja_id, nome, pontos, servico_id) values (${a.lojaId}, 'Banho grátis', 500, ${op.banhoId}) returning id`;
  const r = await asUser(a.recepcaoId, (tx) => receber(tx, a.lojaId, a.recepcaoId, { ...base, forma: null, idempotencyKey: crypto.randomUUID(), agendamentoIds: [thorAg], premioId: pr.id }));
  expect(r.totalCentavos).toBe(0);
  const [p] = await sql`select saldo from saldo_pontos`;
  expect(p.saldo).toBe(100);
});
