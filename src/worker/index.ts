/* Worker da VPS: dispara os lembretes diários e esvazia a fila de envio do WhatsApp. */
import postgres from 'postgres';
import { dayKeySP, hhmmSP } from '@/domain/time';
import { getProvider } from '@/whatsapp/provider';
import { realClock } from './clock';
import { runDaily } from './daily';
import { drainOnce } from './send-queue';
import { WORKER_SQL_OPTIONS } from './options';
import { urlDoBanco } from '@/db/client';

const url = urlDoBanco(process.env, true);
if (!url) throw new Error('SUPABASE_SERVICE_DATABASE_URL não configurado');
const sql = postgres(url, WORKER_SQL_OPTIONS);
const PAUSA_MS = 30_000;

async function ciclo() {
  const provider = await getProvider();
  const lojas = await sql`select l.id, c.hora_lembrete from lojas l join configuracoes c on c.loja_id = l.id`;
  const agora = realClock.now();
  for (const l of lojas) {
    try {
      if (hhmmSP(agora) >= String(l.hora_lembrete).slice(0, 5)) {
        const r = await runDaily({ sql, clock: realClock, lojaId: l.id }, dayKeySP(agora));
        if (r.lembretes || r.vesperas) console.log(`[${l.id}] lembretes ${r.lembretes}, véspera ${r.vesperas}`);
      }
      const d = await drainOnce({ sql, provider, clock: realClock, random: Math.random, lojaId: l.id });
      if (d.enviadas) console.log(`[${l.id}] enviadas ${d.enviadas}, adiadas ${d.adiadas}`);
    } catch (e) {
      console.error(`[${l.id}] erro no ciclo`, e);
    }
  }
}

async function main() {
  console.log('worker iniciado');
  for (;;) {
    await ciclo();
    await realClock.sleep(PAUSA_MS);
  }
}

main();
