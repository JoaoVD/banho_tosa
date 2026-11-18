'use server';
import { revalidatePath } from 'next/cache';
import { getUser } from '@/auth/current';
import { withSession } from '@/db/session';
import { confirmarProposta, descartarProposta, getConversa, pularLembrete, responder } from '@/db/repos/mensagens';
import { diaCurtoSP, hhmmSP } from '@/domain/time';

export async function abrirConversa(id: string) {
  const user = await getUser();
  const c = await withSession(user, (tx) => getConversa(tx, id));
  revalidatePath('/', 'layout');
  return c;
}

export async function responderAction(conversaId: string, texto: string) {
  const user = await getUser();
  if (!texto.trim()) return;
  await withSession(user, (tx) => responder(tx, user.lojaId, conversaId, texto));
}

export async function confirmarAction(propostaId: string, inicioIso?: string): Promise<{ ok: true; msg: string } | { ok: false; msg: string; proximo: string | null }> {
  const user = await getUser();
  const r = await withSession(user, (tx) => confirmarProposta(tx, user.lojaId, user.id, propostaId, inicioIso ? new Date(inicioIso) : undefined));
  revalidatePath('/agenda');
  revalidatePath('/hoje');
  if ('erro' in r) {
    const msg = r.proximo ? `Esse horário foi ocupado. Próximo livre: ${diaCurtoSP(r.proximo)} às ${hhmmSP(r.proximo)}.` : 'Esse horário foi ocupado e não há outro livre nos próximos dias.';
    return { ok: false, msg, proximo: r.proximo?.toISOString() ?? null };
  }
  return { ok: true, msg: 'Agendamento confirmado' };
}

export async function descartarAction(propostaId: string) {
  const user = await getUser();
  await withSession(user, (tx) => descartarProposta(tx, propostaId));
}

export async function pularAction(tutorId: string, dia: string) {
  const user = await getUser();
  await withSession(user, (tx) => pularLembrete(tx, user.lojaId, tutorId, dia));
  revalidatePath('/mensagens');
}
