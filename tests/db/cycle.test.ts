import { afterAll, beforeEach, expect, test } from 'vitest';
import { asUser, resetDb, seedLoja, seedOperacao, sql } from './helpers';
import { cicloDoPet, petsNoPontoDeVoltar } from '@/db/repos/pets';

beforeEach(resetDb);
afterAll(() => sql.end());

async function visita(lojaId: string, petId: string, servicoId: string, dia: string, etapa = 'concluido') {
  await sql`insert into agendamentos (loja_id, pet_id, servico_id, preco_centavos, etapa, inicio, fim)
    values (${lojaId}, ${petId}, ${servicoId}, 7000, ${etapa}, ${dia + 'T13:00:00Z'}, ${dia + 'T14:00:00Z'})`;
}

test('última visita concluída define o status; cancelados e faltas não contam', async () => {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  await visita(a.lojaId, op.petId, op.banhoId, '2026-11-01');
  await visita(a.lojaId, op.petId, op.banhoId, '2026-11-10', 'cancelado');
  await visita(a.lojaId, op.petId, op.banhoId, '2026-11-12', 'nao_compareceu');
  const c = await asUser(a.recepcaoId, (tx) => cicloDoPet(tx, op.petId, '2026-11-18'));
  expect(c).toMatchObject({ cicloDias: 15, diasDesde: 17, noPonto: true });
  const lista = await asUser(a.recepcaoId, (tx) => petsNoPontoDeVoltar(tx, '2026-11-18'));
  expect(lista.map((p) => p.petNome)).toEqual(['Thor']);
});

test('agendamento futuro tira o pet do ponto de voltar', async () => {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  await visita(a.lojaId, op.petId, op.banhoId, '2026-11-01');
  await visita(a.lojaId, op.petId, op.banhoId, '2026-11-25', 'agendado');
  expect(await asUser(a.recepcaoId, (tx) => petsNoPontoDeVoltar(tx, '2026-11-18'))).toEqual([]);
});

test('ciclo fixo manda sobre a sugestão', async () => {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  await sql`update pets set ciclo_dias = 30, ciclo_fixo = true where id = ${op.petId}`;
  await visita(a.lojaId, op.petId, op.banhoId, '2026-11-01');
  const c = await asUser(a.recepcaoId, (tx) => cicloDoPet(tx, op.petId, '2026-11-18'));
  expect(c).toMatchObject({ cicloDias: 30, noPonto: false, voltaEm: 13 });
});
