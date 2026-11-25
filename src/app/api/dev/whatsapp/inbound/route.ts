import { NextResponse, type NextRequest } from 'next/server';
import { serviceDb } from '@/db/client';
import { FakeProvider } from '@/whatsapp/fake';
import { handleInbound } from '@/whatsapp/webhook';

/** Só desenvolvimento/testes: simula uma mensagem chegando no WhatsApp. Corpo: { from, text, fromMe? }. */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' || process.env.WHATSAPP_PROVIDER === 'evolution') return new NextResponse(null, { status: 404 });
  const fake = new FakeProvider({ registrar: async () => {}, estado: async () => 'open' });
  const events = fake.parseWebhook(await req.json().catch(() => null));
  const sql = serviceDb();
  // O WhatsApp falso não tem instância: a mensagem vai para a primeira loja liberada (a do seed).
  const [loja] = await sql`select id from lojas where whatsapp_liberado order by criado_em limit 1`;
  if (loja) await handleInbound(sql, loja.id, events);
  return NextResponse.json({ ok: true, eventos: events.length });
}
