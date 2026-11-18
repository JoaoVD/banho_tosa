import { afterAll, beforeEach, expect, test } from 'vitest';
import { asUser, resetDb, seedLoja, seedOperacao, sql } from './helpers';
import { confirmarProposta, getConversa, listConversas, listLembretesProximoEnvio, pularLembrete, responder } from '@/db/repos/mensagens';
import { handleInbound } from '@/whatsapp/webhook';
import { atSP } from '@/domain/time';

beforeEach(resetDb);
afterAll(() => sql.end());

async function preparar() {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  const [p] = await sql`insert into propostas_horario (loja_id, tutor_id, pet_id, servico_id, inicio)
    values (${a.lojaId}, ${op.tutorId}, ${op.petId}, ${op.banhoId}, ${atSP('2026-11-19', '10:00')}) returning id`;
  await handleInbound(sql, a.lojaId, [{ kind: 'message', providerId: 'in1', fromE164: '+5511987654321', fromMe: false, text: 'Pode sim!', at: new Date('2026-11-18T13:31:00Z'), isGroup: false }]);
  return { a, op, propostaId: p.id as string };
}

test('conversa do tutor aparece em Tutores com a proposta respondida; abrir zera não lidas', async () => {
  const { a } = await preparar();
  const lista = await asUser(a.recepcaoId, (tx) => listConversas(tx, 'tutores'));
  expect(lista[0]).toMatchObject({ tutorNome: 'Ana Souza', petNome: 'Thor', naoLidas: 1 });
  const c = await asUser(a.recepcaoId, (tx) => getConversa(tx, lista[0].id));
  expect(c.proposta).toMatchObject({ status: 'respondida', petNome: 'Thor' });
  const [x] = await sql`select nao_lidas from conversas`;
  expect(x.nao_lidas).toBe(0);
});

test('confirmar duas vezes cria um agendamento só e enfileira a confirmação', async () => {
  const { a, propostaId } = await preparar();
  const r1 = await asUser(a.recepcaoId, (tx) => confirmarProposta(tx, a.lojaId, a.recepcaoId, propostaId));
  const r2 = await asUser(a.recepcaoId, (tx) => confirmarProposta(tx, a.lojaId, a.recepcaoId, propostaId));
  expect('agendamentoId' in r1 && 'agendamentoId' in r2 && r1.agendamentoId === r2.agendamentoId).toBe(true);
  const [{ n }] = await sql`select count(*)::int as n from agendamentos`;
  expect(n).toBe(1);
  const [f] = await sql`select tipo from fila_envio`;
  expect(f.tipo).toBe('confirmacao');
});

test('horário ocupado devolve o próximo livre', async () => {
  const { a, op, propostaId } = await preparar();
  const [ag] = await sql`insert into agendamentos (loja_id, pet_id, servico_id, preco_centavos, inicio, fim) values (${a.lojaId}, ${op.petId}, ${op.banhoId}, 7000, ${atSP('2026-11-19', '10:00')}, ${atSP('2026-11-19', '11:00')}) returning id`;
  await sql`insert into agendamento_blocos (loja_id, agendamento_id, profissional_id, periodo) values (${a.lojaId}, ${ag.id}, ${op.juliaId}, tstzrange(${atSP('2026-11-19', '10:00')}, ${atSP('2026-11-19', '11:00')}))`;
  const r = await asUser(a.recepcaoId, (tx) => confirmarProposta(tx, a.lojaId, a.recepcaoId, propostaId));
  expect(r).toEqual({ erro: 'horario_ocupado', proximo: atSP('2026-11-19', '11:00') });
});

test('responder põe mensagem manual na fila; número desconhecido vai para Outros', async () => {
  const { a } = await preparar();
  await handleInbound(sql, a.lojaId, [{ kind: 'message', providerId: 'in2', fromE164: '+5511900001111', fromMe: false, text: 'Quanto custa?', at: new Date(), isGroup: false }]);
  const outros = await asUser(a.recepcaoId, (tx) => listConversas(tx, 'outros'));
  expect(outros.map((o) => o.telefone)).toEqual(['+5511900001111']);
  await asUser(a.recepcaoId, (tx) => responder(tx, a.lojaId, outros[0].id, 'R$ 70 o banho'));
  const [f] = await sql`select tipo, prioridade, telefone_e164 from fila_envio`;
  expect(f).toEqual({ tipo: 'manual', prioridade: 'imediata', telefone_e164: '+5511900001111' });
});

test('lista do próximo envio e tirar da lista', async () => {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  await sql`insert into agendamentos (loja_id, pet_id, servico_id, preco_centavos, etapa, inicio, fim, historico)
    values (${a.lojaId}, ${op.petId}, ${op.banhoId}, 7000, 'concluido', '2026-10-30T15:00:00Z', '2026-10-30T16:00:00Z', true)`;
  const l1 = await asUser(a.recepcaoId, (tx) => listLembretesProximoEnvio(tx, new Date('2026-11-18T13:00:00Z')));
  expect(l1.dia).toBe('2026-11-19');
  expect(l1.itens.map((i) => i.petNome)).toEqual(['Thor']);
  await asUser(a.recepcaoId, (tx) => pularLembrete(tx, a.lojaId, op.tutorId, l1.dia));
  const l2 = await asUser(a.recepcaoId, (tx) => listLembretesProximoEnvio(tx, new Date('2026-11-18T13:00:00Z')));
  expect(l2.itens).toEqual([]);
});
