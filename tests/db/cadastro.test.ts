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

test('criarLoja cria loja, dona e configurações; nasce sem onboarding e sem WhatsApp', async () => {
  const { criarLoja } = await import('@/db/repos/cadastro');
  const userId = crypto.randomUUID();
  await sql`insert into auth.users (id, email) values (${userId}, 'mari@x.com')`;
  const lojaId = await criarLoja(sql, { nomeLoja: 'Pet Spa Bela Vista', nome: 'Mariana', usuario: 'mariana', userId });
  const [l] = await sql`select nome, onboarding_concluido, whatsapp_liberado from lojas where id = ${lojaId}`;
  expect(l).toEqual({ nome: 'Pet Spa Bela Vista', onboarding_concluido: false, whatsapp_liberado: false });
  const [p] = await sql`select nome, papel, usuario from perfis where user_id = ${userId}`;
  expect(p).toEqual({ nome: 'Mariana', papel: 'dona', usuario: 'mariana' });
  expect(await sql`select 1 from configuracoes where loja_id = ${lojaId}`).toHaveLength(1);
});

test('criarLoja não deixa loja pela metade se o usuário já existe', async () => {
  const { criarLoja } = await import('@/db/repos/cadastro');
  const a = await seedLoja();
  const [{ usuario }] = await sql`select usuario from perfis where user_id = ${a.donaId}`;
  const userId = crypto.randomUUID();
  await sql`insert into auth.users (id, email) values (${userId}, 'z@x.com')`;
  await expect(criarLoja(sql, { nomeLoja: 'Outra', nome: 'Z', usuario, userId })).rejects.toMatchObject({ code: '23505' });
  expect(await sql`select 1 from lojas where nome = 'Outra'`).toHaveLength(0);
});

test('cadastrosRecentes conta só a última hora do mesmo IP', async () => {
  const { cadastrosRecentes, registrarCadastro } = await import('@/db/repos/cadastro');
  const agora = new Date('2026-11-25T12:00:00Z');
  await registrarCadastro(sql, '1.2.3.4', new Date('2026-11-25T10:30:00Z'));
  await registrarCadastro(sql, '1.2.3.4', new Date('2026-11-25T11:30:00Z'));
  await registrarCadastro(sql, '5.6.7.8', new Date('2026-11-25T11:40:00Z'));
  expect(await cadastrosRecentes(sql, '1.2.3.4', agora)).toBe(1);
});

test('a dona não consegue liberar o WhatsApp nem trocar a instância pelo banco', async () => {
  const { asUser } = await import('./helpers');
  const a = await seedLoja();
  await sql`update lojas set whatsapp_liberado = false where id = ${a.lojaId}`;
  await expect(asUser(a.donaId, (tx) => tx`update lojas set whatsapp_liberado = true where id = ${a.lojaId}`)).rejects.toMatchObject({ code: '42501' });
  await expect(asUser(a.donaId, (tx) => tx`update lojas set demo = true where id = ${a.lojaId}`)).rejects.toMatchObject({ code: '42501' });
  await expect(asUser(a.donaId, (tx) => tx`update configuracoes set whatsapp_instancia = 'banho-e-tosa' where loja_id = ${a.lojaId}`)).rejects.toMatchObject({ code: '42501' });
  // O que a tela da loja altera continua permitido.
  await asUser(a.donaId, (tx) => tx`update lojas set nome = 'Novo nome' where id = ${a.lojaId}`);
  await asUser(a.donaId, (tx) => tx`update configuracoes set teto_diario = 100 where loja_id = ${a.lojaId}`);
});

test('a mesma instância de WhatsApp não pode ser de duas lojas', async () => {
  const a = await seedLoja('A');
  const b = await seedLoja('B');
  await sql`update configuracoes set whatsapp_instancia = 'x' where loja_id = ${a.lojaId}`;
  await expect(sql`update configuracoes set whatsapp_instancia = 'x' where loja_id = ${b.lojaId}`).rejects.toMatchObject({ code: '23505' });
});

test('tentativas e cadastros contam separados', async () => {
  const { cadastrosRecentes, registrarCadastro } = await import('@/db/repos/cadastro');
  const agora = new Date('2026-11-25T12:00:00Z');
  await registrarCadastro(sql, '9.9.9.9', new Date('2026-11-25T11:30:00Z'), 'tentativa');
  await registrarCadastro(sql, '9.9.9.9', new Date('2026-11-25T11:31:00Z'), 'tentativa');
  await registrarCadastro(sql, '9.9.9.9', new Date('2026-11-25T11:32:00Z'));
  expect(await cadastrosRecentes(sql, '9.9.9.9', agora, 'tentativa')).toBe(2);
  expect(await cadastrosRecentes(sql, '9.9.9.9', agora)).toBe(1);
});
