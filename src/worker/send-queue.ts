import type postgres from 'postgres';
import { atSP, dayKeySP, hhmmSP } from '@/domain/time';
import type { WhatsAppProvider } from '@/whatsapp/provider';
import type { Clock } from './clock';

export type DrainDeps = { sql: postgres.Sql; provider: WhatsAppProvider; clock: Clock; random: () => number; lojaId: string };

const RETENTATIVAS_MIN = [1, 5, 15];
const RESPEITAM_OPTOUT = ['lembrete_retorno', 'vespera', 'pacote_acabando'];

type Item = {
  id: string; telefone_e164: string; texto: string; tipo: string; prioridade: 'imediata' | 'lote';
  tutor_id: string | null; mensagem_id: string | null; tentativas: number; proposta_id: string | null;
};

/**
 * Envia o que está pendente na fila de uma loja (proteção contra bloqueio do número):
 * - só dentro da janela de horário;
 * - lote (lembretes) com intervalo aleatório entre envios e teto diário;
 * - imediatas (avisos que a recepção pediu, respostas) sem teto, com 2–5 s entre envios,
 *   e passando na frente do lote: são procuradas de novo antes de cada envio do lote.
 */
export async function drainOnce({ sql, provider, clock, random, lojaId }: DrainDeps): Promise<{ enviadas: number; adiadas: number }> {
  const [cfg] = await sql`select envio_inicio, envio_fim, teto_diario, intervalo_min_s, intervalo_max_s from configuracoes where loja_id = ${lojaId}`;
  if (!cfg) return { enviadas: 0, adiadas: 0 };
  // Loja de demonstração: os telefones são inventados, nada sai.
  const [{ demo }] = await sql`select demo from lojas where id = ${lojaId}`;
  if (demo) return { enviadas: 0, adiadas: 0 };
  const inicio = String(cfg.envio_inicio).slice(0, 5), fim = String(cfg.envio_fim).slice(0, 5);
  const naJanela = () => { const h = hhmmSP(clock.now()); return h >= inicio && h < fim; };
  const pendentes = (prioridade: 'imediata' | 'lote') => sql<Item[]>`
    select id, telefone_e164, texto, tipo, prioridade, tutor_id, mensagem_id, tentativas, proposta_id from fila_envio
    where loja_id = ${lojaId} and status = 'pendente' and agendar_para <= ${clock.now()} and prioridade = ${prioridade}
    order by criada_em`;

  if (!naJanela()) {
    const [{ n }] = await sql`select count(*)::int as n from fila_envio where loja_id = ${lojaId} and status = 'pendente' and agendar_para <= ${clock.now()}`;
    return { enviadas: 0, adiadas: n };
  }

  const dia = dayKeySP(clock.now());
  const [{ n: loteHoje }] = await sql`select count(*)::int as n from fila_envio where loja_id = ${lojaId} and status = 'enviada'
    and prioridade = 'lote' and enviada_em >= ${atSP(dia, '00:00')}`;
  let lotesEnviados = loteHoje as number;
  let enviadas = 0, adiadas = 0, jaEnviouAlgo = false;
  const espera = (min: number, max: number) => clock.sleep(Math.round((min + random() * (max - min)) * 1000));

  async function enviar(item: Item): Promise<boolean> {
    if (RESPEITAM_OPTOUT.includes(item.tipo) && item.tutor_id) {
      const [t] = await sql`select lembretes_ativos from tutores where id = ${item.tutor_id}`;
      if (t && !t.lembretes_ativos) {
        await cancelar(item, 'Tutor pediu para não receber');
        return false;
      }
    }
    if (item.proposta_id) {
      // Não oferece um horário que já passou.
      const [p] = await sql`select inicio, status from propostas_horario where id = ${item.proposta_id}`;
      if (p && (new Date(p.inicio) <= clock.now() || p.status === 'descartada')) {
        await cancelar(item, 'Horário sugerido já passou');
        await sql`update propostas_horario set status = 'descartada' where id = ${item.proposta_id} and status = 'enviada'`;
        return false;
      }
    }
    // Marca antes de enviar: outro processo não pega o mesmo item.
    const [pego] = await sql`update fila_envio set status = 'enviando' where id = ${item.id} and status = 'pendente' returning id`;
    if (!pego) return false;
    try {
      const { providerId } = await provider.sendText(item.telefone_e164, item.texto);
      const agora = clock.now();
      await sql`update fila_envio set status = 'enviada', enviada_em = ${agora} where id = ${item.id}`;
      if (item.mensagem_id) await sql`update mensagens set status = 'enviada', provider_id = ${providerId || null}, em = ${agora} where id = ${item.mensagem_id}`;
      if (item.tipo === 'lembrete_retorno' && item.tutor_id) {
        await sql`insert into lembretes_enviados (loja_id, tutor_id, enviado_em) values (${lojaId}, ${item.tutor_id}, ${agora})`;
      }
      return true;
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
      return false;
    }
  }

  async function cancelar(item: Item, motivo: string) {
    await sql`update fila_envio set status = 'cancelada', erro = ${motivo} where id = ${item.id}`;
    if (item.mensagem_id) await sql`update mensagens set status = 'falhou' where id = ${item.mensagem_id}`;
  }

  async function enviarImediatas() {
    for (const item of await pendentes('imediata')) {
      if (jaEnviouAlgo) await espera(2, 5);
      if (!naJanela()) { adiadas++; continue; }
      if (await enviar(item)) { enviadas++; jaEnviouAlgo = true; }
    }
  }

  await enviarImediatas();
  for (const item of await pendentes('lote')) {
    if (lotesEnviados >= cfg.teto_diario) { adiadas++; continue; }
    if (jaEnviouAlgo) await espera(cfg.intervalo_min_s, cfg.intervalo_max_s);
    await enviarImediatas();
    if (!naJanela()) { adiadas++; continue; }
    if (await enviar(item)) { enviadas++; lotesEnviados++; jaEnviouAlgo = true; }
  }
  return { enviadas, adiadas };
}
