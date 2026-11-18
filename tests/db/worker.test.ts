import { afterAll, beforeEach, expect, test } from 'vitest';
import { resetDb, seedLoja, seedOperacao, sql } from './helpers';
import { fakeClock } from '@/worker/clock';
import { drainOnce } from '@/worker/send-queue';
import { runDaily } from '@/worker/daily';
import { atSP, hhmmSP } from '@/domain/time';
import type { WhatsAppProvider } from '@/whatsapp/provider';

beforeEach(resetDb);
afterAll(() => sql.end());

function provedor(clock: { now(): Date }, falhas = 0) {
  const enviados: { to: string; text: string; em: string }[] = [];
  let restantes = falhas;
  const p: WhatsAppProvider = {
    async sendText(to, text) {
      if (restantes-- > 0) throw new Error('fora do ar');
      enviados.push({ to, text, em: hhmmSP(clock.now()) + ':' + String(clock.now().getUTCSeconds()).padStart(2, '0') });
      return { providerId: `p-${enviados.length}` };
    },
    async connection() { return { state: 'open' }; },
    parseWebhook: () => [],
  };
  return { p, enviados };
}

async function fila(lojaId: string, n: number, prioridade = 'lote', tipo = 'lembrete_retorno') {
  for (let i = 0; i < n; i++) {
    await sql`insert into fila_envio (loja_id, telefone_e164, texto, tipo, prioridade, agendar_para, criada_em)
      values (${lojaId}, ${`+55119876500${String(i).padStart(2, '0')}`}, ${`msg ${i}`}, ${tipo}, ${prioridade}, '2026-11-18T00:00:00Z', ${new Date(Date.UTC(2026, 10, 18, 0, 0, i))})`;
  }
}

test('lote sai com 20 s de intervalo (aleatório no mínimo)', async () => {
  const a = await seedLoja();
  await fila(a.lojaId, 3);
  const clock = fakeClock(atSP('2026-11-18', '10:00'));
  const { p, enviados } = provedor(clock);
  const r = await drainOnce({ sql, provider: p, clock, random: () => 0, lojaId: a.lojaId });
  expect(r.enviadas).toBe(3);
  expect(enviados.map((e) => e.em)).toEqual(['10:00:00', '10:00:20', '10:00:40']);
});

test('fora da janela de envio nada sai', async () => {
  const a = await seedLoja();
  await fila(a.lojaId, 2);
  const clock = fakeClock(atSP('2026-11-18', '19:30'));
  const { p, enviados } = provedor(clock);
  const r = await drainOnce({ sql, provider: p, clock, random: () => 0, lojaId: a.lojaId });
  expect(enviados).toEqual([]);
  expect(r.adiadas).toBe(2);
  const [{ n }] = await sql`select count(*)::int as n from fila_envio where status = 'pendente'`;
  expect(n).toBe(2);
});

test('teto diário segura o resto para o dia seguinte; manuais passam', async () => {
  const a = await seedLoja();
  await sql`update configuracoes set teto_diario = 2`;
  await fila(a.lojaId, 3);
  await fila(a.lojaId, 1, 'imediata', 'manual');
  const clock = fakeClock(atSP('2026-11-18', '10:00'));
  const { p, enviados } = provedor(clock);
  await drainOnce({ sql, provider: p, clock, random: () => 0, lojaId: a.lojaId });
  expect(enviados.map((e) => e.text).sort()).toEqual(['msg 0', 'msg 0', 'msg 1'].sort());
  const [{ n }] = await sql`select count(*)::int as n from fila_envio where status = 'pendente'`;
  expect(n).toBe(1);
});

test('falha no envio tenta de novo depois', async () => {
  const a = await seedLoja();
  await fila(a.lojaId, 1, 'imediata', 'pronto');
  const clock = fakeClock(atSP('2026-11-18', '10:00'));
  const { p, enviados } = provedor(clock, 1);
  await drainOnce({ sql, provider: p, clock, random: () => 0, lojaId: a.lojaId });
  expect(enviados).toEqual([]);
  clock.advance(61_000);
  await drainOnce({ sql, provider: p, clock, random: () => 0, lojaId: a.lojaId });
  expect(enviados).toHaveLength(1);
  const [f] = await sql`select status, tentativas from fila_envio`;
  expect(f).toMatchObject({ status: 'enviada', tentativas: 1 });
});

async function petAtrasado(lojaId: string, op: Awaited<ReturnType<typeof seedOperacao>>, nome: string, tel: string, diasAtras: number) {
  const [t] = await sql`insert into tutores (loja_id, nome, telefone_e164) values (${lojaId}, ${nome}, ${tel}) returning id`;
  const [p] = await sql`insert into pets (loja_id, tutor_id, nome, porte) values (${lojaId}, ${t.id}, ${'Pet de ' + nome}, 'pequeno') returning id`;
  const dia = new Date(Date.parse('2026-11-18T15:00:00Z') - diasAtras * 86_400_000);
  await sql`insert into agendamentos (loja_id, pet_id, servico_id, preco_centavos, etapa, inicio, fim, historico)
    values (${lojaId}, ${p.id}, ${op.banhoId}, 7000, 'concluido', ${dia}, ${new Date(dia.getTime() + 3_600_000)}, true)`;
  return t.id as string;
}

test('lembretes do dia: uma vez só, horários diferentes, respeita o limite de 7 dias', async () => {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  await petAtrasado(a.lojaId, op, 'Marta', '+5511911110001', 20);
  await petAtrasado(a.lojaId, op, 'Lucas', '+5511911110002', 18);
  const vera = await petAtrasado(a.lojaId, op, 'Vera', '+5511911110003', 30);
  await sql`insert into lembretes_enviados (loja_id, tutor_id, enviado_em) values (${a.lojaId}, ${vera}, ${new Date(Date.parse('2026-11-15T12:00:00Z'))})`;
  const clock = fakeClock(atSP('2026-11-18', '09:00'));
  const r1 = await runDaily({ sql, clock, lojaId: a.lojaId }, '2026-11-18');
  const r2 = await runDaily({ sql, clock, lojaId: a.lojaId }, '2026-11-18');
  expect(r1.lembretes).toBe(2);
  expect(r2).toEqual({ lembretes: 0, vesperas: 0 });
  const props = await sql`select inicio from propostas_horario`;
  expect(new Set(props.map((p) => new Date(p.inicio).getTime())).size).toBe(2);
  const textos = await sql`select texto from fila_envio where tipo = 'lembrete_retorno'`;
  expect(textos).toHaveLength(2);
  expect(textos.every((t) => /Temos \w+, \d\d\/\d\d às \d\d:\d\d/.test(t.texto))).toBe(true);
});

test('véspera: avisa quem tem banho amanhã', async () => {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  await sql`insert into agendamentos (loja_id, pet_id, servico_id, preco_centavos, inicio, fim)
    values (${a.lojaId}, ${op.petId}, ${op.banhoId}, 7000, ${atSP('2026-11-19', '11:00')}, ${atSP('2026-11-19', '12:00')})`;
  const r = await runDaily({ sql, clock: fakeClock(atSP('2026-11-18', '09:00')), lojaId: a.lojaId }, '2026-11-18');
  expect(r.vesperas).toBe(1);
  const [f] = await sql`select texto from fila_envio where tipo = 'vespera'`;
  expect(f.texto).toContain('amanhã às 11:00');
});
