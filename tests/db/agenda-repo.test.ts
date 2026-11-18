import { afterAll, beforeEach, expect, test } from 'vitest';
import { asUser, resetDb, seedLoja, seedOperacao, sql } from './helpers';
import { cancelar, criarAgendamento, horariosLivres, listDia } from '@/db/repos/agenda';
import { atSP } from '@/domain/time';

beforeEach(resetDb);
afterAll(() => sql.end());

test('cria agendamento com blocos e ele aparece no dia', async () => {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  const r = await asUser(a.recepcaoId, (tx) =>
    criarAgendamento(tx, a.lojaId, a.recepcaoId, { petId: op.petId, servicoId: op.banhoTosaId, inicio: atSP('2026-11-20', '10:00'), confirmarWhatsApp: true }),
  );
  expect('id' in r).toBe(true);
  const dia = await asUser(a.recepcaoId, (tx) => listDia(tx, '2026-11-20'));
  expect(dia.blocos.map((b) => b.profissionalId).sort()).toEqual([op.juliaId, op.marcosId].sort());
  expect(dia.blocos[0]).toMatchObject({ petNome: 'Thor', servicoNome: 'Banho + tosa higiênica' });
});

test('horário ocupado devolve o próximo livre em vez de duplicar', async () => {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  const novo = { petId: op.petId, servicoId: op.banhoId, inicio: atSP('2026-11-20', '10:00'), confirmarWhatsApp: false };
  await asUser(a.recepcaoId, (tx) => criarAgendamento(tx, a.lojaId, a.recepcaoId, novo));
  const r = await asUser(a.recepcaoId, (tx) => criarAgendamento(tx, a.lojaId, a.recepcaoId, novo));
  expect(r).toEqual({ erro: 'horario_ocupado', proximo: atSP('2026-11-20', '11:00') });
  const [{ n }] = await sql`select count(*)::int as n from agendamentos`;
  expect(n).toBe(1);
});

test('horariosLivres esconde o que está ocupado; cancelar libera', async () => {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  const r = await asUser(a.recepcaoId, (tx) =>
    criarAgendamento(tx, a.lojaId, a.recepcaoId, { petId: op.petId, servicoId: op.banhoId, inicio: atSP('2026-11-20', '10:00'), confirmarWhatsApp: false }),
  );
  const antes = await asUser(a.recepcaoId, (tx) => horariosLivres(tx, { petId: op.petId, servicoId: op.banhoId, dia: '2026-11-20' }));
  expect(antes.map((h) => h.inicio.getTime())).not.toContain(atSP('2026-11-20', '10:00').getTime());
  await asUser(a.recepcaoId, (tx) => cancelar(tx, (r as { id: string }).id, 'Tutor desmarcou'));
  const depois = await asUser(a.recepcaoId, (tx) => horariosLivres(tx, { petId: op.petId, servicoId: op.banhoId, dia: '2026-11-20' }));
  expect(depois.map((h) => h.inicio.getTime())).toContain(atSP('2026-11-20', '10:00').getTime());
});
