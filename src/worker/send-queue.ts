import type postgres from 'postgres';
import { atSP, dayKeySP, hhmmSP } from '@/domain/time';
import type { WhatsAppProvider } from '@/whatsapp/provider';
import type { Clock } from './clock';

export type DrainDeps = { sql: postgres.Sql; provider: WhatsAppProvider; clock: Clock; random: () => number; lojaId: string };

const RETENTATIVAS_MIN = [1, 5, 15];
const RESPEITAM_OPTOUT = ['lembrete_retorno', 'vespera', 'pacote_acabando'];

/**
 * Envia o que está pendente na fila de uma loja, respeitando a janela de horário, o teto diário
 * de mensagens automáticas e o intervalo entre envios (proteção contra bloqueio do número).
 */
export async function drainOnce({ sql, provider, clock, random, lojaId }: DrainDeps): Promise<{ enviadas: number; adiadas: number }> {
  const [cfg] = await sql`select envio_inicio, envio_fim, teto_diario, intervalo_min_s, intervalo_max_s from configuracoes where loja_id = ${lojaId}`;
  if (!cfg) return { enviadas: 0, adiadas: 0 };
  const inicio = String(cfg.envio_inicio).slice(0, 5), fim = String(cfg.envio_fim).slice(0, 5);
  const naJanela = () => { const h = hhmmSP(clock.now()); return h >= inicio && h < fim; };
  const pendentes = await sql`select id, telefone_e164, texto, tipo, prioridade, tutor_id, mensagem_id, tentativas from fila_envio
    where loja_id = ${lojaId} and status = 'pendente' and agendar_para <= ${clock.now()}
    order by case prioridade when 'imediata' then 0 else 1 end, criada_em`;
  if (!naJanela()) return { enviadas: 0, adiadas: pendentes.length };

  const dia = dayKeySP(clock.now());
  const [{ n: jaEnviadas }] = await sql`select count(*)::int as n from fila_envio where loja_id = ${lojaId} and status = 'enviada'
    and tipo <> 'manual' and enviada_em >= ${atSP(dia, '00:00')}`;
  let automaticas = jaEnviadas as number;
  let enviadas = 0, adiadas = 0, anterior: string | null = null;

  for (const item of pendentes) {
    const automatica = item.tipo !== 'manual';
    if (automatica && automaticas >= cfg.teto_diario) { adiadas++; continue; }
    if (anterior) {
      const [min, max] = item.prioridade === 'imediata' ? [2, 5] : [cfg.intervalo_min_s, cfg.intervalo_max_s];
      await clock.sleep(Math.round((min + random() * (max - min)) * 1000));
    }
    if (!naJanela()) { adiadas++; continue; }
    if (RESPEITAM_OPTOUT.includes(item.tipo) && item.tutor_id) {
      const [t] = await sql`select lembretes_ativos from tutores where id = ${item.tutor_id}`;
      if (t && !t.lembretes_ativos) {
        await sql`update fila_envio set status = 'cancelada', erro = 'Tutor pediu para não receber' where id = ${item.id}`;
        if (item.mensagem_id) await sql`update mensagens set status = 'falhou' where id = ${item.mensagem_id}`;
        continue;
      }
    }
    // Marca antes de enviar: outro processo não pega o mesmo item.
    const [pego] = await sql`update fila_envio set status = 'enviando' where id = ${item.id} and status = 'pendente' returning id`;
    if (!pego) continue;
    anterior = item.id;
    try {
      const { providerId } = await provider.sendText(item.telefone_e164, item.texto);
      const agora = clock.now();
      await sql`update fila_envio set status = 'enviada', enviada_em = ${agora} where id = ${item.id}`;
      if (item.mensagem_id) await sql`update mensagens set status = 'enviada', provider_id = ${providerId || null}, em = ${agora} where id = ${item.mensagem_id}`;
      if (item.tipo === 'lembrete_retorno' && item.tutor_id) {
        await sql`insert into lembretes_enviados (loja_id, tutor_id, enviado_em) values (${lojaId}, ${item.tutor_id}, ${agora})`;
      }
      enviadas++;
      if (automatica) automaticas++;
    } catch (e) {
      const tentativas = item.tentativas + 1;
      const erro = e instanceof Error ? e.message.slice(0, 300) : 'erro';
      if (tentativas > RETENTATIVAS_MIN.length) {
        await sql`update fila_envio set status = 'falhou', tentativas = ${tentativas}, erro = ${erro} where id = ${item.id}`;
        if (item.mensagem_id) await sql`update mensagens set status = 'falhou' where id = ${item.mensagem_id}`;
      } else {
        const depois = new Date(clock.now().getTime() + RETENTATIVAS_MIN[tentativas - 1] * 60_000);
        await sql`update fila_envio set status = 'pendente', tentativas = ${tentativas}, erro = ${erro}, agendar_para = ${depois} where id = ${item.id}`;
      }
    }
  }
  return { enviadas, adiadas };
}
