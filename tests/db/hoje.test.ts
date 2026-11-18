import { afterAll, beforeEach, expect, test } from 'vitest';
import { asUser, resetDb, seedLoja, seedOperacao, sql } from './helpers';
import { concluirAviso, getHoje, moverEtapa } from '@/db/repos/hoje';
import { criarAgendamento } from '@/db/repos/agenda';
import { atSP } from '@/domain/time';

beforeEach(resetDb);
afterAll(() => sql.end());

async function preparar() {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  const r = await asUser(a.recepcaoId, (tx) =>
    criarAgendamento(tx, a.lojaId, a.recepcaoId, { petId: op.petId, servicoId: op.banhoId, inicio: atSP('2026-11-18', '10:00'), confirmarWhatsApp: false }),
  );
  return { a, op, id: (r as { id: string }).id };
}

test('agendamento de hoje aparece em Chegando', async () => {
  const { a } = await preparar();
  const h = await asUser(a.recepcaoId, (tx) => getHoje(tx, '2026-11-18', atSP('2026-11-18', '10:40')));
  expect(h.colunas.chegando.map((c) => c.petNome)).toEqual(['Thor']);
  expect(h.widgets.agendados).toBe(1);
  expect(h.saudacao).toBe('Bom dia');
});

test('moverEtapa registra histórico e devolve a etapa anterior', async () => {
  const { a, id } = await preparar();
  const r1 = await asUser(a.recepcaoId, (tx) => moverEtapa(tx, id, 'banho'));
  const r2 = await asUser(a.recepcaoId, (tx) => moverEtapa(tx, id, 'pronto'));
  expect(r1.de).toBe('agendado');
  expect(r2).toEqual({ de: 'banho', pedirAviso: true });
  const [{ n }] = await sql`select count(*)::int as n from etapas_historico where agendamento_id = ${id}`;
  expect(n).toBe(2);
  const h = await asUser(a.recepcaoId, (tx) => getHoje(tx, '2026-11-18', atSP('2026-11-18', '10:40')));
  expect(h.colunas.pronto[0]).toMatchObject({ petNome: 'Thor', avisoPendente: true });
});

test('concluirAviso grava a decisão e a nota do cartão', async () => {
  const { a, id } = await preparar();
  await asUser(a.recepcaoId, (tx) => moverEtapa(tx, id, 'pronto'));
  await asUser(a.recepcaoId, (tx) => concluirAviso(tx, id, false));
  const h = await asUser(a.recepcaoId, (tx) => getHoje(tx, '2026-11-18', atSP('2026-11-18', '10:40')));
  expect(h.colunas.pronto[0]).toMatchObject({ avisoPendente: false, nota: 'Tutor não avisado' });
});
