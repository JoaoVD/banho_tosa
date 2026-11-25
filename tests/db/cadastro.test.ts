import { afterAll, beforeEach, expect, test } from 'vitest';
import { resetDb, seedLoja, seedOperacao, sql } from './helpers';
import { fakeClock } from '@/worker/clock';
import { drainOnce } from '@/worker/send-queue';
import { runDaily } from '@/worker/daily';
import { lojaDaInstancia } from '@/whatsapp/webhook';
import { atSP } from '@/domain/time';
import type { WhatsAppProvider } from '@/whatsapp/provider';

beforeEach(resetDb);
afterAll(() => sql.end());

const provedor = () => {
  const enviados: string[] = [];
  const p: WhatsAppProvider = { async sendText(to) { enviados.push(to); return { providerId: 'x' }; }, async connection() { return { state: 'open' }; }, parseWebhook: () => [] };
  return { p, enviados };
};

test('loja nova nasce sem WhatsApp liberado', async () => {
  const [{ id }] = await sql`insert into lojas (nome) values ('Nova') returning id`;
  const [l] = await sql`select whatsapp_liberado from lojas where id = ${id}`;
  expect(l.whatsapp_liberado).toBe(false);
});

test('worker não envia nada de loja sem WhatsApp liberado', async () => {
  const a = await seedLoja();
  await sql`update lojas set whatsapp_liberado = false where id = ${a.lojaId}`;
  await sql`insert into fila_envio (loja_id, telefone_e164, texto, tipo, prioridade, agendar_para) values (${a.lojaId}, '+5511987650000', 'oi', 'resposta', 'imediata', '2026-11-18T00:00:00Z')`;
  const clock = fakeClock(atSP('2026-11-18', '10:00'));
  const { p, enviados } = provedor();
  await drainOnce({ sql, provider: p, clock, random: () => 0, lojaId: a.lojaId });
  expect(enviados).toEqual([]);
});

test('worker não gera lembretes de loja sem WhatsApp liberado', async () => {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  // Tutor com pet atrasado (20 dias): numa loja liberada, geraria lembrete.
  const [t] = await sql`insert into tutores (loja_id, nome, telefone_e164) values (${a.lojaId}, 'Marta', '+5511911110001') returning id`;
  const [p] = await sql`insert into pets (loja_id, tutor_id, nome, porte) values (${a.lojaId}, ${t.id}, 'Rex', 'pequeno') returning id`;
  const dia = new Date(Date.parse('2026-11-18T15:00:00Z') - 20 * 86_400_000);
  await sql`insert into agendamentos (loja_id, pet_id, servico_id, preco_centavos, etapa, inicio, fim, historico)
    values (${a.lojaId}, ${p.id}, ${op.banhoId}, 7000, 'concluido', ${dia}, ${new Date(dia.getTime() + 3_600_000)}, true)`;
  await sql`update lojas set whatsapp_liberado = false where id = ${a.lojaId}`;
  const r = await runDaily({ sql, clock: fakeClock(atSP('2026-11-18', '09:00')), lojaId: a.lojaId }, '2026-11-18');
  expect(r).toEqual({ lembretes: 0, vesperas: 0 });
});

test('instância desconhecida não cai em nenhuma loja', async () => {
  await seedLoja();
  expect(await lojaDaInstancia(sql, 'outra-instancia')).toBeNull();
  expect(await lojaDaInstancia(sql, undefined)).toBeNull();
});
