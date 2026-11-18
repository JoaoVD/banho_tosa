import type { Tx } from '@/db/session';
import { DEFAULT_TEMPLATES, renderTemplate, type TipoMensagem } from '@/domain/templates';

const RESPEITAM_OPTOUT: TipoMensagem[] = ['lembrete_retorno', 'vespera', 'pacote_acabando'];

export type EnqueueInput = {
  tutorId?: string;
  telefoneE164?: string;
  tipo: TipoMensagem | 'manual';
  vars?: Record<string, string>;
  texto?: string;
  prioridade: 'imediata' | 'lote';
  agendarPara?: Date;
  dedupeKey?: string;
  propostaId?: string;
};
export type EnqueueResult = { filaId: string; mensagemId: string } | { ignorado: 'optout' | 'sem_telefone' | 'duplicado' };

export async function textoDoModelo(tx: Tx, lojaId: string, tipo: TipoMensagem): Promise<string> {
  const [m] = await tx`select texto from modelos_mensagem where loja_id = ${lojaId} and tipo = ${tipo}`;
  return m?.texto ?? DEFAULT_TEMPLATES[tipo];
}

/** Põe a mensagem na fila (o worker envia) e já mostra na conversa do tutor com status "fila". */
export async function enqueueMessage(tx: Tx, lojaId: string, input: EnqueueInput): Promise<EnqueueResult> {
  let telefone = input.telefoneE164;
  let tutorNome = '';
  if (input.tutorId) {
    const [t] = await tx`select nome, telefone_e164, lembretes_ativos from tutores where id = ${input.tutorId}`;
    if (!t) return { ignorado: 'sem_telefone' };
    if (input.tipo !== 'manual' && RESPEITAM_OPTOUT.includes(input.tipo) && !t.lembretes_ativos) return { ignorado: 'optout' };
    telefone = t.telefone_e164;
    tutorNome = String(t.nome).split(' ')[0];
  }
  if (!telefone) return { ignorado: 'sem_telefone' };
  if (input.dedupeKey) {
    const [ja] = await tx`select 1 from fila_envio where dedupe_key = ${input.dedupeKey}`;
    if (ja) return { ignorado: 'duplicado' };
  }
  const texto = input.tipo === 'manual' ? (input.texto ?? '') : renderTemplate(await textoDoModelo(tx, lojaId, input.tipo), { tutor: tutorNome, ...input.vars });
  const [conversa] = await tx`insert into conversas (loja_id, telefone_e164, tutor_id, ultima_em) values (${lojaId}, ${telefone}, ${input.tutorId ?? null}, now())
    on conflict (loja_id, telefone_e164) do update set ultima_em = now(), tutor_id = coalesce(conversas.tutor_id, excluded.tutor_id) returning id`;
  const [msg] = await tx`insert into mensagens (loja_id, conversa_id, direcao, origem, tipo, automatica, texto, status)
    values (${lojaId}, ${conversa.id}, 'out', 'sistema', ${input.tipo}, ${input.tipo !== 'manual'}, ${texto}, 'fila') returning id`;
  const [fila] = await tx`insert into fila_envio (loja_id, telefone_e164, tutor_id, texto, tipo, prioridade, agendar_para, mensagem_id, dedupe_key, proposta_id)
    values (${lojaId}, ${telefone}, ${input.tutorId ?? null}, ${texto}, ${input.tipo}, ${input.prioridade}, ${input.agendarPara ?? new Date()}, ${msg.id}, ${input.dedupeKey ?? null}, ${input.propostaId ?? null})
    returning id`;
  return { filaId: fila.id, mensagemId: msg.id };
}
