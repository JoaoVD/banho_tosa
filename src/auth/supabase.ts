import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { withClaims } from '@/db/session';
import { contaDoUsuario } from './usuario';
import { ERRO_LOGIN, type AuthProvider, type SessionUser } from './provider';

async function client() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Chamado de um Server Component: o middleware renova a sessão.
        }
      },
    },
  });
}

export const supabaseAuth: AuthProvider = {
  async currentUser() {
    const { data } = await (await client()).auth.getUser();
    if (!data.user) return null;
    const rows = await withClaims(data.user.id, (tx) => tx<SessionUser[]>`
      select user_id as id, loja_id as "lojaId", papel, nome from perfis where user_id = ${data.user!.id}`);
    return rows[0] ?? null;
  },
  async signIn(usuario, password) {
    const conta = await contaDoUsuario(usuario);
    if (!conta) return { ok: false, error: ERRO_LOGIN };
    const { error } = await (await client()).auth.signInWithPassword({ email: conta.email, password });
    return error ? { ok: false, error: ERRO_LOGIN } : { ok: true };
  },
  async signOut() {
    await (await client()).auth.signOut();
  },
};
