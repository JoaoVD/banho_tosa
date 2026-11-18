import { afterAll, beforeEach, expect, test } from 'vitest';
import { resetDb, seedLoja, seedOperacao, sql } from './helpers';
import { handleInbound } from '@/whatsapp/webhook';
import type { InboundEvent } from '@/whatsapp/provider';

beforeEach(resetDb);
afterAll(() => sql.end());

const msg = (p: Partial<Extract<InboundEvent, { kind: 'message' }>>): InboundEvent => ({
  kind: 'message', providerId: crypto.randomUUID(), fromE164: '+5511987654321', fromMe: false, text: 'Pode sim!', at: new Date('2026-11-18T13:31:00Z'), isGroup: false, ...p,
});

async function preparar() {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  await sql`insert into propostas_horario (loja_id, tutor_id, pet_id, servico_id, inicio) values (${a.lojaId}, ${op.tutorId}, ${op.petId}, ${op.banhoId}, '2026-11-20T13:00:00Z')`;
  await sql`insert into lembretes_enviados (loja_id, tutor_id, enviado_em) values (${a.lojaId}, ${op.tutorId}, '2026-11-18T12:00:00Z')`;
  return { a, op };
}

test('resposta do tutor entra na conversa dele e marca proposta e lembrete', async () => {
  const { a, op } = await preparar();
  await handleInbound(sql, a.lojaId, [msg({})]);
  const [c] = await sql`select tutor_id, nao_lidas from conversas`;
  expect(c).toMatchObject({ tutor_id: op.tutorId, nao_lidas: 1 });
  const [p] = await sql`select status from propostas_horario`;
  expect(p.status).toBe('respondida');
  const [l] = await sql`select respondido from lembretes_enviados`;
  expect(l.respondido).toBe(true);
});

test('o mesmo id duas vezes grava uma mensagem só', async () => {
  const { a } = await preparar();
  const e = msg({ providerId: 'ABC' });
  await handleInbound(sql, a.lojaId, [e]);
  await handleInbound(sql, a.lojaId, [e]);
  const [{ n }] = await sql`select count(*)::int as n from mensagens`;
  expect(n).toBe(1);
});

test('mensagem mandada pelo celular da loja aparece como enviada, sem contar como não lida', async () => {
  const { a } = await preparar();
  await handleInbound(sql, a.lojaId, [msg({ fromMe: true, text: 'Já já fica pronto!' })]);
  const [m] = await sql`select direcao, origem from mensagens`;
  expect(m).toMatchObject({ direcao: 'out', origem: 'celular' });
  const [c] = await sql`select nao_lidas from conversas`;
  expect(c.nao_lidas).toBe(0);
});

test('eco do envio do próprio sistema não duplica', async () => {
  const { a } = await preparar();
  const [c] = await sql`insert into conversas (loja_id, telefone_e164) values (${a.lojaId}, '+5511987654321') returning id`;
  await sql`insert into mensagens (loja_id, conversa_id, direcao, origem, automatica, texto, status, em) values (${a.lojaId}, ${c.id}, 'out', 'sistema', true, 'Oi Ana!', 'enviada', '2026-11-18T13:30:30Z')`;
  await handleInbound(sql, a.lojaId, [msg({ fromMe: true, text: 'Oi Ana!', providerId: 'ECO1' })]);
  const rows = await sql`select provider_id, origem from mensagens`;
  expect(rows).toEqual([{ provider_id: 'ECO1', origem: 'sistema' }]);
});

test('PARAR desliga os lembretes do tutor', async () => {
  const { a, op } = await preparar();
  await handleInbound(sql, a.lojaId, [msg({ text: 'PARAR' })]);
  const [t] = await sql`select lembretes_ativos from tutores where id = ${op.tutorId}`;
  expect(t.lembretes_ativos).toBe(false);
});

test('número desconhecido cria conversa sem tutor; grupo é ignorado', async () => {
  const { a } = await preparar();
  await handleInbound(sql, a.lojaId, [msg({ fromE164: '+5511900001111', text: 'Oi, quanto custa?' }), msg({ isGroup: true, fromE164: '' })]);
  const cs = await sql`select telefone_e164, tutor_id from conversas`;
  expect(cs).toEqual([{ telefone_e164: '+5511900001111', tutor_id: null }]);
});
