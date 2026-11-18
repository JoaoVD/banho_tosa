import type postgres from 'postgres';
import { isOptOut } from '@/domain/optout';
import type { InboundEvent } from './provider';

const ECO_JANELA_MS = 5 * 60_000;

/** Grava mensagens recebidas (do tutor ou enviadas pelo celular da loja). Idempotente pelo id do WhatsApp. */
export async function handleInbound(sql: postgres.Sql, lojaId: string, events: InboundEvent[]): Promise<void> {
  for (const e of events) {
    if (e.kind !== 'message' || e.isGroup || !e.fromE164) continue;
    await sql.begin(async (tx) => {
      if (e.providerId) {
        const [ja] = await tx`select 1 from mensagens where provider_id = ${e.providerId}`;
        if (ja) return;
      }
      const [tutor] = await tx`select id from tutores where loja_id = ${lojaId} and telefone_e164 = ${e.fromE164}`;
      const [conversa] = await tx`insert into conversas (loja_id, telefone_e164, tutor_id, ultima_em) values (${lojaId}, ${e.fromE164}, ${tutor?.id ?? null}, ${e.at})
        on conflict (loja_id, telefone_e164) do update set ultima_em = greatest(conversas.ultima_em, excluded.ultima_em),
          tutor_id = coalesce(conversas.tutor_id, excluded.tutor_id) returning id`;

      if (e.fromMe) {
        // Eco do que o próprio sistema mandou: só anota o id.
        const [eco] = await tx`select id from mensagens where conversa_id = ${conversa.id} and origem = 'sistema' and provider_id is null
          and texto = ${e.text} and em > ${new Date(e.at.getTime() - ECO_JANELA_MS)} order by em desc limit 1`;
        if (eco) {
          await tx`update mensagens set provider_id = ${e.providerId}, status = 'enviada' where id = ${eco.id}`;
          return;
        }
        await tx`insert into mensagens (loja_id, conversa_id, direcao, origem, automatica, texto, provider_id, status, em)
          values (${lojaId}, ${conversa.id}, 'out', 'celular', false, ${e.text}, ${e.providerId || null}, 'enviada', ${e.at})`;
        return;
      }

      await tx`insert into mensagens (loja_id, conversa_id, direcao, origem, automatica, texto, provider_id, status, em)
        values (${lojaId}, ${conversa.id}, 'in', 'tutor', false, ${e.text}, ${e.providerId || null}, 'recebida', ${e.at})`;
      await tx`update conversas set nao_lidas = nao_lidas + 1 where id = ${conversa.id}`;
      if (!tutor) return;
      await tx`update lembretes_enviados set respondido = true where id = (
        select id from lembretes_enviados where tutor_id = ${tutor.id} order by enviado_em desc limit 1)`;
      await tx`update propostas_horario set status = 'respondida' where id = (
        select id from propostas_horario where tutor_id = ${tutor.id} and status = 'enviada' order by criada_em desc limit 1)`;
      if (isOptOut(e.text)) await tx`update tutores set lembretes_ativos = false where id = ${tutor.id}`;
    });
  }
}

/** Loja dona da instância do WhatsApp (v1: a única loja, ou a que tem essa instância configurada). */
export async function lojaDaInstancia(sql: postgres.Sql, instancia?: string): Promise<string | null> {
  if (instancia) {
    const [l] = await sql`select loja_id from configuracoes where whatsapp_instancia = ${instancia}`;
    if (l) return l.loja_id;
  }
  const [l] = await sql`select id from lojas order by criado_em limit 1`;
  return l?.id ?? null;
}
