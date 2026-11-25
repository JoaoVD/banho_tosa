import { NextResponse, type NextRequest } from 'next/server';

const PUBLICAS = ['/entrar', '/cadastro', '/api/saude', '/api/whatsapp/webhook', '/api/dev/'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLICAS.some((p) => pathname.startsWith(p))) return NextResponse.next();
  const temSessao =
    process.env.AUTH_MODE === 'supabase'
      ? req.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))
      : req.cookies.has('bt_dev');
  if (!temSessao) return NextResponse.redirect(new URL('/entrar', req.url));
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/|favicon.ico|.*\\.(?:png|svg|jpg|ico|webp)$).*)'] };
