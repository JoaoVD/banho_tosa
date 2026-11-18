import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeEach, expect, test } from 'vitest';
import { asUser, resetDb, seedLoja, seedOperacao, sql } from './helpers';
import { enqueueMessage } from '@/whatsapp/enqueue';
import { criarAgendamento } from '@/db/repos/agenda';
import { concluirAviso, moverEtapa } from '@/db/repos/hoje';
import { avisarRenovacao } from '@/db/repos/pacotes';
import { fecharCaixa } from '@/db/repos/caixa';
import { atSP } from '@/domain/time';

beforeEach(resetDb);
afterAll(() => sql.end());

test('agendar com a chave ligada põe a confirmação na fila e na conversa', async () => {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  await asUser(a.recepcaoId, (tx) => criarAgendamento(tx, a.lojaId, a.recepcaoId, { petId: op.petId, servicoId: op.banhoId, inicio: atSP('2026-11-20', '10:00'), confirmarWhatsApp: true }));
  const fila = await sql`select tipo, texto, prioridade, telefone_e164 from fila_envio`;
  expect(fila).toHaveLength(1);
  expect(fila[0]).toMatchObject({ tipo: 'confirmacao', prioridade: 'imediata', telefone_e164: '+5511987654321' });
  expect(fila[0].texto).toBe('Agendado! Thor na sexta, 20/11, às 10:00. Até lá!');
  const [m] = await sql`select status, automatica, origem from mensagens`;
  expect(m).toMatchObject({ status: 'fila', automatica: true, origem: 'sistema' });
});

test('agendar com a chave desligada não envia nada', async () => {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  await asUser(a.recepcaoId, (tx) => criarAgendamento(tx, a.lojaId, a.recepcaoId, { petId: op.petId, servicoId: op.banhoId, inicio: atSP('2026-11-20', '10:00'), confirmarWhatsApp: false }));
  expect(await sql`select 1 from fila_envio`).toHaveLength(0);
});

test('pacote acabando respeita quem desligou os lembretes; dedupe evita repetir', async () => {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  const [pc] = await sql`insert into pacotes_cliente (loja_id, tutor_id, nome, servico_id, total, saldo, valido_ate)
    values (${a.lojaId}, ${op.tutorId}, '4 banhos', ${op.banhoId}, 4, 1, '2026-12-05') returning id`;
  expect(await asUser(a.recepcaoId, (tx) => avisarRenovacao(tx, a.lojaId, pc.id))).toMatchObject({ filaId: expect.any(String) });
  expect(await asUser(a.recepcaoId, (tx) => avisarRenovacao(tx, a.lojaId, pc.id))).toEqual({ ignorado: 'duplicado' });
  await sql`update tutores set lembretes_ativos = false`;
  const r = await asUser(a.recepcaoId, (tx) =>
    enqueueMessage(tx, a.lojaId, { tutorId: op.tutorId, tipo: 'pacote_acabando', vars: { pet: 'Thor', pacote: 'x' }, prioridade: 'imediata' }),
  );
  expect(r).toEqual({ ignorado: 'optout' });
});

test('pet pronto com mensagem e resumo do caixa para a dona', async () => {
  const a = await seedLoja();
  const op = await seedOperacao(a.lojaId);
  await sql`update lojas set telefone_dona = '+5511912345678'`;
  const r = await asUser(a.recepcaoId, (tx) => criarAgendamento(tx, a.lojaId, a.recepcaoId, { petId: op.petId, servicoId: op.banhoId, inicio: atSP('2026-11-18', '10:00'), confirmarWhatsApp: false }));
  const id = (r as { id: string }).id;
  await asUser(a.recepcaoId, async (tx) => { await moverEtapa(tx, id, 'pronto'); await concluirAviso(tx, id, true); });
  await asUser(a.recepcaoId, (tx) => fecharCaixa(tx, a.lojaId, a.recepcaoId, { dia: '2026-11-18', contadoCentavos: 0 }));
  const fila = await sql`select tipo, telefone_e164, texto from fila_envio order by criada_em`;
  expect(fila.map((f) => f.tipo)).toEqual(['pronto', 'resumo_caixa']);
  expect(fila[0].texto).toContain('Thor está pronto');
  expect(fila[1].telefone_e164).toBe('+5511912345678');
});

test('nenhuma tela ou repositório chama o provedor direto', () => {
  const arquivos = (d: string): string[] =>
    readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? arquivos(join(d, f)) : [join(d, f)]));
  const culpados = [...arquivos('src/app'), ...arquivos('src/db')].filter((f) => /\.(ts|tsx)$/.test(f) && /sendText\(/.test(readFileSync(f, 'utf8')));
  expect(culpados).toEqual([]);
});
