import { NextResponse } from 'next/server';
import postgres from 'postgres';
import { urlDoBanco } from '@/db/client';

export const dynamic = 'force-dynamic';

/**
 * Diagnóstico da implantação, sem expor segredos: de qual variável veio o banco,
 * para onde conecta e se a conexão funciona. Abra /api/saude no navegador.
 */
export async function GET() {
  const env = process.env;
  const fonte = env.POSTGRES_URL ? 'POSTGRES_URL' : env.DATABASE_URL ? 'DATABASE_URL' : null;
  const url = urlDoBanco();
  let destino: Record<string, string> | null = null;
  if (url) {
    try {
      const u = new URL(url);
      destino = { usuario: decodeURIComponent(u.username), host: u.hostname, porta: u.port || '5432', senha: u.password ? `${u.password.length} caracteres` : 'VAZIA' };
    } catch {
      destino = { erro: 'URL inválida' };
    }
  }
  let banco: Record<string, unknown> = { ok: false, erro: 'sem URL do banco' };
  if (url) {
    const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 8, onnotice: () => {} });
    try {
      const [r] = await sql`select current_user as usuario, (select count(*)::int from public.lojas) as lojas`;
      banco = { ok: true, ...r };
    } catch (e) {
      const err = e as { code?: string; message?: string };
      banco = { ok: false, codigo: err.code ?? null, erro: err.message ?? String(e) };
    } finally {
      await sql.end({ timeout: 2 }).catch(() => {});
    }
  }
  const tem = (k: string) => Boolean(env[k]);
  return NextResponse.json({
    commit: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    auth_mode: env.AUTH_MODE ?? null,
    fonte_do_banco: fonte,
    destino,
    banco,
    variaveis: Object.fromEntries(['POSTGRES_URL', 'DATABASE_URL', 'SUPABASE_SERVICE_DATABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'WHATSAPP_PROVIDER', 'WEBHOOK_SECRET'].map((k) => [k, tem(k)])),
  }, { headers: { 'cache-control': 'no-store' } });
}
