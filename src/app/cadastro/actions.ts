'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { authProvider } from '@/auth/current';
import { devEntrarComo } from '@/auth/dev';
import { serviceDb } from '@/db/client';
import { cadastrosRecentes, criarLoja, registrarCadastro } from '@/db/repos/cadastro';
import { ERRO_USUARIO, SENHA_MIN, USUARIO_RE, normalizarUsuario } from '@/domain/usuario';

export type CadastroState = { error?: string; fieldErrors?: Record<string, string> };

const LIMITE_POR_HORA = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function ipDaRequisicao(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'desconhecido';
}

async function supabaseAdmin() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

/** Cadastro aberto: cria um pet shop novo com a dona e já entra. */
export async function cadastrarAction(_: CadastroState, f: FormData): Promise<CadastroState> {
  // Campo invisível: gente não preenche, robô preenche.
  if (String(f.get('site') ?? '')) return { error: 'Não foi possível criar a conta.' };
  const nomeLoja = String(f.get('loja') ?? '').trim();
  const nome = String(f.get('nome') ?? '').trim();
  const usuario = normalizarUsuario(String(f.get('usuario') ?? ''));
  const email = String(f.get('email') ?? '').trim().toLowerCase();
  const senha = String(f.get('senha') ?? '');
  const fieldErrors: Record<string, string> = {};
  if (!nomeLoja) fieldErrors.loja = 'Informe o nome do pet shop.';
  if (!nome) fieldErrors.nome = 'Informe o seu nome.';
  if (!USUARIO_RE.test(usuario)) fieldErrors.usuario = ERRO_USUARIO;
  if (!EMAIL_RE.test(email)) fieldErrors.email = 'E-mail inválido.';
  if (senha.length < SENHA_MIN) fieldErrors.senha = `Mínimo de ${SENHA_MIN} caracteres.`;
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const sql = serviceDb();
  const ip = await ipDaRequisicao();
  if ((await cadastrosRecentes(sql, ip)) >= LIMITE_POR_HORA) return { error: 'Muitos cadastros feitos daqui agora. Tente de novo mais tarde.' };
  const [usuarioExiste] = await sql`select 1 from perfis where lower(usuario) = ${usuario}`;
  if (usuarioExiste) return { fieldErrors: { usuario: 'Esse usuário já existe.' } };
  const [emailExiste] = await sql`select 1 from auth.users where lower(email) = ${email}`;
  if (emailExiste) return { fieldErrors: { email: 'Esse e-mail já tem conta.' } };

  const supabase = process.env.AUTH_MODE === 'supabase';
  const admin = supabase ? await supabaseAdmin() : null;
  let userId: string;
  if (admin) {
    const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
    if (error || !data.user) {
      console.error('cadastro: Supabase recusou a conta', error?.message);
      return { error: `Não foi possível criar a conta${error?.message ? ` (${error.message})` : ''}.` };
    }
    userId = data.user.id;
  } else {
    const [u] = await sql`insert into auth.users (id, email) values (gen_random_uuid(), ${email}) returning id`;
    userId = u.id;
  }
  try {
    await criarLoja(sql, { nomeLoja, nome, usuario, userId });
  } catch (e) {
    // Sem conta solta no Supabase (prenderia o usuário e o e-mail para sempre).
    if (admin) await admin.auth.admin.deleteUser(userId).catch(() => {});
    else await sql`delete from auth.users where id = ${userId}`;
    if ((e as { code?: string }).code === '23505') return { fieldErrors: { usuario: 'Esse usuário já existe.' } };
    return { error: 'Não foi possível criar a conta.' };
  }
  await registrarCadastro(sql, ip);
  if (supabase) {
    const r = await (await authProvider()).signIn(usuario, senha);
    if (!r.ok) redirect('/entrar');
  } else {
    await devEntrarComo(userId);
  }
  redirect('/boas-vindas');
}
