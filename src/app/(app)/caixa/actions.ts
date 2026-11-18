'use server';
import { revalidatePath } from 'next/cache';
import { getUser, requireDona } from '@/auth/current';
import { withSession } from '@/db/session';
import { estornar, fecharCaixa, reabrirCaixa } from '@/db/repos/caixa';
import { parseBRL } from '@/domain/money';
import { agora } from '@/lib/agora';

export async function fecharCaixaAction(dia: string, contado: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getUser();
  const centavos = parseBRL(contado);
  if (centavos === null) return { ok: false, error: 'Digite um valor como 80,00' };
  try {
    await withSession(user, (tx) => fecharCaixa(tx, user.lojaId, user.id, { dia, contadoCentavos: centavos, em: agora() }));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Não foi possível fechar o caixa.' };
  }
  revalidatePath('/caixa');
  revalidatePath('/hoje');
  return { ok: true };
}

export async function reabrirAction(dia: string) {
  const user = await requireDona();
  await withSession(user, (tx) => reabrirCaixa(tx, dia));
  revalidatePath('/caixa');
}

export async function estornarAction(pagamentoId: string, motivo: string) {
  const user = await getUser();
  await withSession(user, (tx) => estornar(tx, pagamentoId, motivo));
  revalidatePath('/caixa');
  revalidatePath('/hoje');
  revalidatePath('/pets', 'layout');
}
