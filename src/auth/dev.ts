import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { serviceDb } from '@/db/client';
import { contaDoUsuario } from './usuario';
import { ERRO_LOGIN, type AuthProvider, type SessionUser } from './provider';

export const DEV_COOKIE = 'bt_dev';
const SENHA_DEV = 'dev';

function secret(): string {
  if (process.env.NODE_ENV === 'production') throw new Error('AUTH_MODE=dev não pode ser usado em produção');
  return process.env.AUTH_SECRET ?? 'dev-secret';
}

function sign(userId: string): string {
  return `${userId}.${createHmac('sha256', secret()).update(userId).digest('hex')}`;
}

function verify(value: string | undefined): string | null {
  if (!value) return null;
  const [userId] = value.split('.');
  const expected = Buffer.from(sign(userId));
  const got = Buffer.from(value);
  return expected.length === got.length && timingSafeEqual(expected, got) ? userId : null;
}

async function perfil(userId: string): Promise<SessionUser | null> {
  const [p] = await serviceDb()<SessionUser[]>`
    select user_id as id, loja_id as "lojaId", papel, nome from perfis where user_id = ${userId}`;
  return p ?? null;
}

/** Modo dev: entra direto como o usuário recém-cadastrado (no dev a senha de login é sempre "dev"). */
export async function devEntrarComo(userId: string): Promise<void> {
  (await cookies()).set(DEV_COOKIE, sign(userId), { httpOnly: true, sameSite: 'lax', path: '/' });
}

/** Login de desenvolvimento: usuários do seed, senha "dev". Bloqueado em produção. */
export const devAuth: AuthProvider = {
  async currentUser() {
    const id = verify((await cookies()).get(DEV_COOKIE)?.value);
    return id ? perfil(id) : null;
  },
  async signIn(usuario, password) {
    if (password !== SENHA_DEV) return { ok: false, error: ERRO_LOGIN };
    const u = await contaDoUsuario(usuario);
    if (!u || !(await perfil(u.id))) return { ok: false, error: ERRO_LOGIN };
    (await cookies()).set(DEV_COOKIE, sign(u.id), { httpOnly: true, sameSite: 'lax', path: '/' });
    return { ok: true };
  },
  async signOut() {
    (await cookies()).delete(DEV_COOKIE);
  },
};
