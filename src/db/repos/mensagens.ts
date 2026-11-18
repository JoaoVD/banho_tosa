import { selectReminderCandidates, type HistLembrete } from '@/domain/reminders';
import { addDaysKey, atSP, dayKeySP, hhmmSP } from '@/domain/time';
import { enqueueMessage } from '@/whatsapp/enqueue';
import type { Tx } from '../session';
import { criarAgendamento, type ResultadoAgendar } from './agenda';
import { petsNoPontoDeVoltar } from './pets';

export type ConversaItem = { id: string; telefone: string; tutorId: string | null; tutorNome: string | null; petNome: string | null; naoLidas: number; ultimaTexto: string; ultimaEm: Date };

export async function listConversas(tx: Tx, filtro: 'tutores' | 'outros'): Promise<ConversaItem[]> {
  const rows = await tx`
    select c.id, c.telefone_e164, c.tutor_id, c.nao_lidas, c.ultima_em, t.nome as tutor,
      (select string_agg(p.nome, ' e ' order by p.nome) from pets p where p.tutor_id = c.tutor_id) as pets,
      (select m.texto from mensagens m where m.conversa_id = c.id order by m.em desc limit 1) as ultima
    from conversas c left join tutores t on t.id = c.tutor_id
    where c.loja_id = loja_atual() and ${filtro === 'tutores' ? tx`c.tutor_id is not null` : tx`c.tutor_id is null`}
    order by c.ultima_em desc limit 200`;
  return rows.map((r) => ({ id: r.id, telefone: r.telefone_e164, tutorId: r.tutor_id, tutorNome: r.tutor, petNome: r.pets, naoLidas: r.nao_lidas, ultimaTexto: r.ultima ?? '', ultimaEm: new Date(r.ultima_em) }));
}

export async function totalNaoLidas(tx: Tx): Promise<number> {
  const [r] = await tx`select coalesce(sum(nao_lidas), 0)::int as n from conversas where loja_id = loja_atual() and tutor_id is not null`;
  return r.n;
}

export type MensagemView = { id: string; direcao: 'in' | 'out'; origem: 'sistema' | 'celular' | 'tutor'; automatica: boolean; texto: string; status: string; em: Date };
export type PropostaView = { id: string; status: 'enviada' | 'respondida' | 'confirmada' | 'descartada'; petId: string; petNome: string; servicoId: string; servicoNome: string; inicio: Date };

export async function getConversa(tx: Tx, id: string) {
  await tx`update conversas set nao_lidas = 0 where id = ${id}`;
  const [c] = await tx`select c.id, c.telefone_e164, c.tutor_id, t.nome as tutor,
      (select string_agg(p.nome, ' e ' order by p.nome) from pets p where p.tutor_id = c.tutor_id) as pets,
      (select p.id from pets p where p.tutor_id = c.tutor_id order by p.nome limit 1) as pet_id
    from conversas c left join tutores t on t.id = c.tutor_id where c.id = ${id}`;
  if (!c) throw new Error('Conversa não encontrada');
  const msgs = await tx`select id, direcao, origem, automatica, texto, status, em from mensagens where conversa_id = ${id} order by em, id`;
  const [p] = c.tutor_id
    ? await tx`select pr.id, pr.status, pr.pet_id, pe.nome as pet, pr.servico_id, s.nome as servico, pr.inicio
        from propostas_horario pr join pets pe on pe.id = pr.pet_id join servicos s on s.id = pr.servico_id
        where pr.tutor_id = ${c.tutor_id} and pr.status <> 'descartada' order by pr.criada_em desc limit 1`
    : [];
  return {
    id: c.id as string,
    telefone: c.telefone_e164 as string,
    tutorId: c.tutor_id as string | null,
    tutorNome: c.tutor as string | null,
    petNome: c.pets as string | null,
    petId: c.pet_id as string | null,
    mensagens: msgs.map((m) => ({ id: m.id, direcao: m.direcao, origem: m.origem, automatica: m.automatica, texto: m.texto, status: m.status, em: new Date(m.em) })) as MensagemView[],
    proposta: p ? ({ id: p.id, status: p.status, petId: p.pet_id, petNome: p.pet, servicoId: p.servico_id, servicoNome: p.servico, inicio: new Date(p.inicio) } as PropostaView) : null,
  };
}

export async function responder(tx: Tx, lojaId: string, conversaId: string, texto: string) {
  const [c] = await tx`select telefone_e164, tutor_id from conversas where id = ${conversaId}`;
  return enqueueMessage(tx, lojaId, { tutorId: c.tutor_id ?? undefined, telefoneE164: c.telefone_e164, tipo: 'manual', texto: texto.trim(), prioridade: 'imediata' });
}

/** Confirma a proposta de horário (opcionalmente noutro horário). Repetir não duplica o agendamento. */
export async function confirmarProposta(
  tx: Tx, lojaId: string, userId: string, propostaId: string, inicioAlternativo?: Date,
): Promise<{ agendamentoId: string; inicio: Date } | Extract<ResultadoAgendar, { erro: string }>> {
  const [p] = await tx`select * from propostas_horario where id = ${propostaId} for update`;
  if (!p) throw new Error('Proposta não encontrada');
  if (p.status === 'confirmada' && p.agendamento_id) return { agendamentoId: p.agendamento_id, inicio: new Date(p.inicio) };
  const inicio = inicioAlternativo ?? new Date(p.inicio);
  const r = await criarAgendamento(tx, lojaId, userId, { petId: p.pet_id, servicoId: p.servico_id, inicio, confirmarWhatsApp: true });
  if ('erro' in r) return r;
  await tx`update propostas_horario set status = 'confirmada', agendamento_id = ${r.id}, inicio = ${inicio} where id = ${propostaId}`;
  return { agendamentoId: r.id, inicio };
}

export async function descartarProposta(tx: Tx, propostaId: string) {
  await tx`update propostas_horario set status = 'descartada' where id = ${propostaId}`;
}

/** Quem deve receber lembrete no próximo envio diário (prévia; o worker decide na hora). */
export async function listLembretesProximoEnvio(tx: Tx, agora: Date) {
  const [cfg] = await tx`select hora_lembrete from configuracoes where loja_id = loja_atual()`;
  const hora = String(cfg?.hora_lembrete ?? '09:00').slice(0, 5);
  const hoje = dayKeySP(agora);
  const [jaRodou] = await tx`select 1 from execucoes_diarias where loja_id = loja_atual() and dia = ${hoje}::date and tipo = 'lembretes'`;
  const dia = !jaRodou && hhmmSP(agora) < hora ? hoje : addDaysKey(hoje, 1);
  const quando = atSP(dia, hora);
  const pets = await petsNoPontoDeVoltar(tx, dia);
  const histRows = await tx`select tutor_id, enviado_em, respondido from lembretes_enviados where loja_id = loja_atual()`;
  const hist = new Map<string, HistLembrete[]>();
  for (const h of histRows) hist.set(h.tutor_id, [...(hist.get(h.tutor_id) ?? []), { enviadoEm: new Date(h.enviado_em), respondido: h.respondido }]);
  const pulados = new Set((await tx`select tutor_id from lembretes_pulados where loja_id = loja_atual() and dia = ${dia}::date`).map((r) => r.tutor_id));
  const candidatos = selectReminderCandidates(
    pets.map((p) => ({ petId: p.petId, tutorId: p.tutorId, lembretesAtivos: p.lembretesAtivos, status: p.ciclo })), hist, quando,
  ).filter((c) => !pulados.has(c.tutorId));
  const nomes = new Map(pets.map((p) => [p.petId, p.petNome]));
  const tutores = candidatos.length ? await tx`select id, nome from tutores where id = any(${candidatos.map((c) => c.tutorId)})` : [];
  const tn = new Map(tutores.map((t) => [t.id, t.nome]));
  return { dia, hora, itens: candidatos.map((c) => ({ tutorId: c.tutorId, tutorNome: tn.get(c.tutorId) ?? '', petNome: nomes.get(c.petId) ?? '' })) };
}

export async function pularLembrete(tx: Tx, lojaId: string, tutorId: string, dia: string) {
  await tx`insert into lembretes_pulados (loja_id, tutor_id, dia) values (${lojaId}, ${tutorId}, ${dia}::date) on conflict do nothing`;
}
