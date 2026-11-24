import { serviceDb } from '@/db/client';

/** Conta de login (id e e-mail interno) de um usuário, sem diferenciar maiúsculas nem espaços. */
export async function contaDoUsuario(usuario: string): Promise<{ id: string; email: string } | null> {
  const u = usuario.trim().toLowerCase();
  if (!u) return null;
  const [c] = await serviceDb()<{ id: string; email: string }[]>`
    select u.id, u.email from perfis p join auth.users u on u.id = p.user_id where lower(p.usuario) = ${u}`;
  return c ?? null;
}
