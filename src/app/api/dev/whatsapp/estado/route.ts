import { NextResponse, type NextRequest } from 'next/server';
import { serviceDb } from '@/db/client';

/** Só desenvolvimento/testes: muda o estado do WhatsApp falso (open | close | falhar). */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' || process.env.WHATSAPP_PROVIDER === 'evolution') return new NextResponse(null, { status: 404 });
  const { valor } = (await req.json().catch(() => ({}))) as { valor?: string };
  if (!valor || !['open', 'close', 'connecting', 'falhar'].includes(valor)) return NextResponse.json({ erro: 'valor inválido' }, { status: 400 });
  await serviceDb()`insert into fake_whatsapp_estado (chave, valor) values ('conexao', ${valor}) on conflict (chave) do update set valor = excluded.valor`;
  return NextResponse.json({ ok: true });
}
