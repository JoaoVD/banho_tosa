import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { AuthProvider, SessionUser } from './provider';

export async function authProvider(): Promise<AuthProvider> {
  if (process.env.AUTH_MODE === 'supabase') return (await import('./supabase')).supabaseAuth;
  return (await import('./dev')).devAuth;
}

export const currentUser = cache(async (): Promise<SessionUser | null> => (await authProvider()).currentUser());

export async function getUser(): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) redirect('/entrar');
  return u;
}

export async function requireDona(): Promise<SessionUser> {
  const u = await getUser();
  if (u.papel !== 'dona') redirect('/hoje');
  return u;
}
