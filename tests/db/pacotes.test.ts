import { afterAll, beforeEach, expect, test } from 'vitest';
import { asUser, resetDb, seedLoja, seedOperacao, sql } from './helpers';
import { estenderValidade, listAcabando, listModelos, upsertModelo, venderPacote } from '@/db/repos/pacotes';
import { commitImport } from '@/db/repos/importacao';
import { validateRows } from '@/domain/import';

beforeEach(resetDb);
afterAll(() => sql.end());

async function preparar() {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  const { id: modeloId } = await asUser(a.donaId, (tx) =>
    upsertModelo(tx, a.lojaId, { nome: '4 banhos no mês', precoCentavos: 26000, banhos: 4, servicoId: op.banhoId, porte: null, validadeDias: 35 }),
  );
  return { a, op, modeloId };
}

test('vender pacote: saldo 4, pagamento de R$ 260 no dia e 260 pontos', async () => {
  const { a, op, modeloId } = await preparar();
  const r = await asUser(a.recepcaoId, (tx) =>
    venderPacote(tx, a.lojaId, a.recepcaoId, { idempotencyKey: crypto.randomUUID(), tutorId: op.tutorId, modeloId, forma: 'pix', diaCaixa: '2026-11-18' }),
  );
  const [pc] = await sql`select saldo, total, valido_ate from pacotes_cliente where id = ${r.pacoteClienteId}`;
  expect(pc).toMatchObject({ saldo: 4, total: 4 });
  expect(new Date(pc.valido_ate).toISOString().slice(0, 10)).toBe('2026-12-23');
  const [pg] = await sql`select total_centavos, dia_caixa from pagamentos where id = ${r.pagamentoId}`;
  expect(pg.total_centavos).toBe(26000);
  const [p] = await sql`select saldo from saldo_pontos`;
  expect(p.saldo).toBe(260);
  const modelos = await asUser(a.recepcaoId, (tx) => listModelos(tx, '2026-11-18'));
  expect(modelos[0].ativos).toBe(1);
});

test('com 1 banho restante, entra em "acabando"; estender a validade funciona', async () => {
  const { a, op, modeloId } = await preparar();
  const r = await asUser(a.recepcaoId, (tx) =>
    venderPacote(tx, a.lojaId, a.recepcaoId, { idempotencyKey: crypto.randomUUID(), tutorId: op.tutorId, modeloId, forma: 'pix', diaCaixa: '2026-11-18' }),
  );
  await sql`update pacotes_cliente set saldo = 1 where id = ${r.pacoteClienteId}`;
  const lista = await asUser(a.recepcaoId, (tx) => listAcabando(tx, '2026-11-18'));
  expect(lista).toHaveLength(1);
  expect(lista[0]).toMatchObject({ tutorNome: 'Ana Souza', petsNomes: 'Thor', avisado: false });
  await asUser(a.recepcaoId, (tx) => estenderValidade(tx, r.pacoteClienteId, '2027-01-10'));
  const [pc] = await sql`select valido_ate from pacotes_cliente where id = ${r.pacoteClienteId}`;
  expect(new Date(pc.valido_ate).toISOString().slice(0, 10)).toBe('2027-01-10');
});

test('recepção não cria modelo de pacote', async () => {
  const { a, op } = await preparar();
  await expect(
    asUser(a.recepcaoId, (tx) => upsertModelo(tx, a.lojaId, { nome: 'X', precoCentavos: 1, banhos: 1, servicoId: op.banhoId, porte: null, validadeDias: 1 })),
  ).rejects.toThrow();
});

test('importação traz saldo de pacote e pontos, sem duplicar ao repetir', async () => {
  const { a } = await preparar();
  const mapping = { 0: 'tutor', 1: 'telefone', 2: 'pet', 3: 'pacote', 4: 'pacote_saldo', 5: 'pontos' } as const;
  const { ok } = validateRows([['Bia Lima', '(21) 99876-5432', 'Mel', '4 banhos no mês', '2', '120']], mapping);
  const r1 = await asUser(a.donaId, (tx) => commitImport(tx, a.lojaId, ok));
  await asUser(a.donaId, (tx) => commitImport(tx, a.lojaId, ok));
  expect(r1.pacotes).toBe(1);
  const pcs = await sql`select saldo, total from pacotes_cliente`;
  expect(pcs).toEqual([{ saldo: 2, total: 4 }]);
  const [p] = await sql`select saldo from saldo_pontos`;
  expect(p.saldo).toBe(120);
});
