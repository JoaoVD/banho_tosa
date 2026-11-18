'use server';
import { revalidatePath } from 'next/cache';
import { getUser } from '@/auth/current';
import { withSession } from '@/db/session';
import { AjusteSemMotivo, FormaObrigatoria, previewRecebimento, receber, type Preview, type ReceberInput } from '@/db/repos/pagamentos';
import { dayKeySP } from '@/domain/time';
import { diaCaixaAtual } from '@/db/repos/caixa';
import { agora } from '@/lib/agora';

export async function prepararRecebimento(agendamentoIds: string[]): Promise<Preview> {
  const user = await getUser();
  return withSession(user, (tx) => previewRecebimento(tx, agendamentoIds, dayKeySP(agora())));
}

export async function receberAction(input: Omit<ReceberInput, 'diaCaixa'>): Promise<{ ok: true; totalCentavos: number; pontosGanhos: number } | { ok: false; error: string }> {
  const user = await getUser();
  try {
    const r = await withSession(user, async (tx) => receber(tx, user.lojaId, user.id, { ...input, diaCaixa: await diaCaixaAtual(tx, agora()) }));
    revalidatePath('/hoje');
    revalidatePath('/caixa');
    revalidatePath('/pets', 'layout');
    return { ok: true, totalCentavos: r.totalCentavos, pontosGanhos: r.pontosGanhos };
  } catch (e) {
    if (e instanceof AjusteSemMotivo) return { ok: false, error: 'Informe o motivo do ajuste de preço.' };
    if (e instanceof FormaObrigatoria) return { ok: false, error: 'Escolha a forma de pagamento.' };
    if (e instanceof Error && /já recebido|mesmo tutor|Pontos insuficientes/.test(e.message)) return { ok: false, error: e.message + '.' };
    throw e;
  }
}
