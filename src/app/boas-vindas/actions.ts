'use server';
import { redirect } from 'next/navigation';
import { requireDona } from '@/auth/current';
import { withSession } from '@/db/session';
import { updateLoja } from '@/db/repos/config';

export async function comecarDoZero() {
  const user = await requireDona();
  await withSession(user, (tx) => updateLoja(tx, user.lojaId, { onboardingConcluido: true }));
  redirect('/hoje');
}
