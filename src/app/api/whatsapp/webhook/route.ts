import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { serviceDb } from '@/db/client';
import { getProvider } from '@/whatsapp/provider';
import { handleInbound, lojaDaInstancia } from '@/whatsapp/webhook';

function segredoOk(recebido: string | null): boolean {
  const esperado = process.env.WEBHOOK_SECRET;
  if (!esperado || !recebido) return false;
  const a = Buffer.from(recebido), b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!segredoOk(req.nextUrl.searchParams.get('secret'))) return NextResponse.json({ erro: 'não autorizado' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const provider = await getProvider();
  const events = provider.parseWebhook(body);
  const sql = serviceDb();
  const lojaId = await lojaDaInstancia(sql, typeof body?.instance === 'string' ? body.instance : undefined);
  if (lojaId && events.length) await handleInbound(sql, lojaId, events);
  return NextResponse.json({ ok: true, eventos: events.length });
}
