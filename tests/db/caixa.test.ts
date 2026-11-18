import { afterAll, beforeEach, expect, test } from 'vitest';
import { asUser, resetDb, seedLoja, seedOperacao, sql } from './helpers';
import { diaCaixaAtual, estornar, fecharCaixa, getCaixaDia, reabrirCaixa } from '@/db/repos/caixa';
import { receber } from '@/db/repos/pagamentos';

beforeEach(resetDb);
afterAll(() => sql.end());

async function preparar() {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  const ag = async (h: string) => {
    const [r] = await sql`insert into agendamentos (loja_id, pet_id, servico_id, preco_centavos, etapa, inicio, fim)
      values (${a.lojaId}, ${op.petId}, ${op.banhoId}, 7000, 'pronto', ${`2026-11-18T${h}:00:00Z`}, ${`2026-11-18T${h}:30:00Z`}) returning id`;
    return r.id as string;
  };
  return { a, op, ag };
}

test('fechar o caixa grava conferência; novo recebimento cai no dia seguinte', async () => {
  const { a, ag } = await preparar();
  const ag1 = await ag('12');
  await asUser(a.recepcaoId, (tx) => receber(tx, a.lojaId, a.recepcaoId, { idempotencyKey: crypto.randomUUID(), agendamentoIds: [ag1], usarPacote: false, forma: 'dinheiro', diaCaixa: '2026-11-18' }));
  const f = await asUser(a.recepcaoId, (tx) => fecharCaixa(tx, a.lojaId, a.recepcaoId, { dia: '2026-11-18', contadoCentavos: 6500 }));
  expect(f).toMatchObject({ esperadoCentavos: 7000, diferencaCentavos: -500 });
  const dia = await asUser(a.recepcaoId, (tx) => diaCaixaAtual(tx, new Date('2026-11-18T22:00:00Z')));
  expect(dia).toBe('2026-11-19');
});

test('reabrir (só dona) volta o recebimento para o dia', async () => {
  const { a } = await preparar();
  await asUser(a.recepcaoId, (tx) => fecharCaixa(tx, a.lojaId, a.recepcaoId, { dia: '2026-11-18', contadoCentavos: 0 }));
  await expect(asUser(a.recepcaoId, (tx) => reabrirCaixa(tx, '2026-11-18'))).rejects.toThrow();
  await asUser(a.donaId, (tx) => reabrirCaixa(tx, '2026-11-18'));
  expect(await asUser(a.recepcaoId, (tx) => diaCaixaAtual(tx, new Date('2026-11-18T22:00:00Z')))).toBe('2026-11-18');
});

test('estorno sai do resumo e desfaz os pontos', async () => {
  const { a, ag } = await preparar();
  const ag1 = await ag('12');
  const r = await asUser(a.recepcaoId, (tx) => receber(tx, a.lojaId, a.recepcaoId, { idempotencyKey: crypto.randomUUID(), agendamentoIds: [ag1], usarPacote: false, forma: 'pix', diaCaixa: '2026-11-18' }));
  await asUser(a.recepcaoId, (tx) => estornar(tx, r.pagamentoId, 'Cobrado errado'));
  const c = await asUser(a.recepcaoId, (tx) => getCaixaDia(tx, '2026-11-18'));
  expect(c.resumo.totalCentavos).toBe(0);
  expect(c.pagamentos[0]).toMatchObject({ estornado: true });
  const [p] = await sql`select saldo from saldo_pontos`;
  expect(p.saldo).toBe(0);
  const [x] = await sql`select etapa from agendamentos where id = ${ag1}`;
  expect(x.etapa).toBe('pronto');
});
