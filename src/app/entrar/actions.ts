'use server';
import { redirect } from 'next/navigation';
import { authProvider } from '@/auth/current';

export type EntrarState = { error?: string };

export async function entrarAction(_prev: EntrarState, form: FormData): Promise<EntrarState> {
  const auth = await authProvider();
  const res = await auth.signIn(String(form.get('email') ?? ''), String(form.get('senha') ?? ''));
  if (!res.ok) return { error: res.error };
  redirect('/hoje');
}

export async function sairAction() {
  await (await authProvider()).signOut();
  redirect('/entrar');
}
