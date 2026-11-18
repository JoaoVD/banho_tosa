import { afterAll, beforeEach, expect, test } from 'vitest';
import { resetDb, seedLoja, seedOperacao, sql, asUser } from './helpers';
import { fakeClock } from '@/worker/clock';
import { drainOnce } from '@/worker/send-queue';
import { runDaily } from '@/worker/daily';
import { WORKER_SQL_OPTIONS } from '@/worker/options';
import { receber } from '@/db/repos/pagamentos';
import { estornar, fecharCaixa } from '@/db/repos/caixa';
import { atSP } from '@/domain/time';
import type { WhatsAppProvider } from '@/whatsapp/provider';

beforeEach(resetDb);
afterAll(() => sql.end());

const okProvider = (onSend?: (text: string) => Promise<void>) => {
  const enviados: string[] = [];
  const p: WhatsAppProvider = {
    async sendText(_to, text) { enviados.push(text); await onSend?.(text); return { providerId: `p${enviados.length}` }; },
    async connection() { return { state: 'open' }; },
    parseWebhook: () => [],
  };
  return { p, enviados };
};

async function tutorAtrasado(lojaId: string, op: Awaited<ReturnType<typeof seedOperacao>>) {
  await sql`insert into agendamentos (loja_id, pet_id, servico_id, preco_centavos, etapa, inicio, fim, historico)
    values (${lojaId}, ${op.petId}, ${op.banhoId}, 7000, 'concluido', '2026-10-20T15:00:00Z', '2026-10-20T16:00:00Z', true)`;
}

test('#1 lembrete parado na fila não é enfileirado de novo no dia seguinte', async () => {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  await tutorAtrasado(a.lojaId, op);
  await runDaily({ sql, clock: fakeClock(atSP('2026-11-18', '09:00')), lojaId: a.lojaId }, '2026-11-18');
  await runDaily({ sql, clock: fakeClock(atSP('2026-11-19', '09:00')), lojaId: a.lojaId }, '2026-11-19');
  const [{ n }] = await sql`select count(*)::int as n from fila_envio where tipo = 'lembrete_retorno'`;
  expect(n).toBe(1);
});

test('#1 lembrete cuja sugestão de horário já passou é cancelado, não enviado', async () => {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  await tutorAtrasado(a.lojaId, op);
  await runDaily({ sql, clock: fakeClock(atSP('2026-11-18', '09:00')), lojaId: a.lojaId }, '2026-11-18');
  const clock = fakeClock(atSP('2026-11-25', '10:00'));
  const { p, enviados } = okProvider();
  await drainOnce({ sql, provider: p, clock, random: () => 0, lojaId: a.lojaId });
  expect(enviados).toEqual([]);
  const [f] = await sql`select status from fila_envio where tipo = 'lembrete_retorno'`;
  expect(f.status).toBe('cancelada');
  const [pr] = await sql`select status from propostas_horario`;
  expect(pr.status).toBe('descartada');
});

test('#2 mensagem imediata não para no teto e fura a fila do lote', async () => {
  const a = await seedLoja();
  await sql`update configuracoes set teto_diario = 2`;
  for (let i = 0; i < 3; i++) {
    await sql`insert into fila_envio (loja_id, telefone_e164, texto, tipo, prioridade, agendar_para, criada_em)
      values (${a.lojaId}, '+5511900000000', ${`lote ${i}`}, 'lembrete_retorno', 'lote', '2026-11-18T00:00:00Z', ${new Date(Date.UTC(2026, 10, 18, 0, 0, i))})`;
  }
  let inserido = false;
  const { p, enviados } = okProvider(async (t) => {
    if (t === 'lote 0' && !inserido) {
      inserido = true;
      await sql`insert into fila_envio (loja_id, telefone_e164, texto, tipo, prioridade, agendar_para) values (${a.lojaId}, '+5511900000001', 'pronto!', 'pronto', 'imediata', '2026-11-18T00:00:00Z')`;
    }
  });
  await drainOnce({ sql, provider: p, clock: fakeClock(atSP('2026-11-18', '10:00')), random: () => 0, lojaId: a.lojaId });
  expect(enviados).toEqual(['lote 0', 'pronto!', 'lote 1']);
});

test('#3 execução diária que falha não fica marcada como feita', async () => {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  await tutorAtrasado(a.lojaId, op);
  await sql`delete from precos_servico where porte = 'pequeno'`;
  await expect(runDaily({ sql, clock: fakeClock(atSP('2026-11-18', '09:00')), lojaId: a.lojaId }, '2026-11-18')).rejects.toThrow();
  const [{ n }] = await sql`select count(*)::int as n from execucoes_diarias`;
  expect(n).toBe(0);
});

test('#5 conexão do worker funciona com o pooler do Supabase', () => {
  expect(WORKER_SQL_OPTIONS.prepare).toBe(false);
});

test('#6 dois recebimentos simultâneos não usam o mesmo banho do pacote', async () => {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  await sql`insert into pacotes_cliente (loja_id, tutor_id, nome, servico_id, total, saldo, valido_ate) values (${a.lojaId}, ${op.tutorId}, 'P', ${op.banhoId}, 4, 1, '2026-12-31')`;
  const [luna] = await sql`insert into pets (loja_id, tutor_id, nome, porte) values (${a.lojaId}, ${op.tutorId}, 'Luna', 'pequeno') returning id`;
  const ags = [];
  for (const pet of [op.petId, luna.id]) {
    const [r] = await sql`insert into agendamentos (loja_id, pet_id, servico_id, preco_centavos, etapa, inicio, fim) values (${a.lojaId}, ${pet}, ${op.banhoId}, 7000, 'pronto', '2026-11-18T13:00:00Z', '2026-11-18T14:00:00Z') returning id`;
    ags.push(r.id);
  }
  const rs = await Promise.all(ags.map((id) => asUser(a.recepcaoId, (tx) => receber(tx, a.lojaId, a.recepcaoId, { idempotencyKey: crypto.randomUUID(), agendamentoIds: [id], usarPacote: true, forma: 'pix', diaCaixa: '2026-11-18' }))));
  expect(rs.map((r) => r.totalCentavos).sort()).toEqual([0, 7000]);
  const [pc] = await sql`select saldo from pacotes_cliente`;
  expect(pc.saldo).toBe(0);
});

test('#7 estorno em dia fechado é recusado', async () => {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  const [ag] = await sql`insert into agendamentos (loja_id, pet_id, servico_id, preco_centavos, etapa, inicio, fim) values (${a.lojaId}, ${op.petId}, ${op.banhoId}, 7000, 'pronto', '2026-11-18T13:00:00Z', '2026-11-18T14:00:00Z') returning id`;
  const r = await asUser(a.recepcaoId, (tx) => receber(tx, a.lojaId, a.recepcaoId, { idempotencyKey: crypto.randomUUID(), agendamentoIds: [ag.id], usarPacote: false, forma: 'pix', diaCaixa: '2026-11-18' }));
  await asUser(a.recepcaoId, (tx) => fecharCaixa(tx, a.lojaId, a.recepcaoId, { dia: '2026-11-18', contadoCentavos: 0 }));
  await expect(asUser(a.recepcaoId, (tx) => estornar(tx, r.pagamentoId, 'x'))).rejects.toThrow(/fechado/);
});
