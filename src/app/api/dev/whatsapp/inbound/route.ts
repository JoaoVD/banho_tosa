import { NextResponse, type NextRequest } from 'next/server';
import { serviceDb } from '@/db/client';
import { FakeProvider } from '@/whatsapp/fake';
import { handleInbound, lojaDaInstancia } from '@/whatsapp/webhook';

/** Só desenvolvimento/testes: simula uma mensagem chegando no WhatsApp. Corpo: { from, text, fromMe? }. */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' || process.env.WHATSAPP_PROVIDER === 'evolution') return new NextResponse(null, { status: 404 });
  const fake = new FakeProvider({ registrar: async () => {}, estado: async () => 'open' });
  const events = fake.parseWebhook(await req.json().catch(() => null));
  const sql = serviceDb();
  const lojaId = await lojaDaInstancia(sql);
  if (lojaId) await handleInbound(sql, lojaId, events);
  return NextResponse.json({ ok: true, eventos: events.length });
}
