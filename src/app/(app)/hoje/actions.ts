'use server';
import { revalidatePath } from 'next/cache';
import { getUser } from '@/auth/current';
import { withSession } from '@/db/session';
import { concluirAviso, moverEtapa } from '@/db/repos/hoje';
import type { BoardStage } from '@/domain/stages';
import type { Etapa } from '@/domain/types';
import { agora } from '@/lib/agora';

export async function moverAction(agendamentoId: string, para: BoardStage | Etapa): Promise<{ de: Etapa }> {
  const user = await getUser();
  const destino = (para === 'concluido' ? 'pronto' : para) as BoardStage | 'agendado';
  const r = await withSession(user, (tx) => moverEtapa(tx, agendamentoId, destino));
  revalidatePath('/hoje');
  revalidatePath('/agenda');
  return { de: r.de };
}

export async function concluirAvisoAction(agendamentoId: string, enviar: boolean) {
  const user = await getUser();
  await withSession(user, (tx) => concluirAviso(tx, agendamentoId, enviar, agora()));
  revalidatePath('/hoje');
}
