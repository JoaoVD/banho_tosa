import { getUser } from '@/auth/current';
import { withSession } from '@/db/session';
import { diaCaixaAtual, getCaixaDia } from '@/db/repos/caixa';
import { dayKeySP } from '@/domain/time';
import { agora } from '@/lib/agora';
import { CaixaView } from './CaixaView';

const DIA = /^\d{4}-\d{2}-\d{2}$/;

export default async function Page({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const user = await getUser();
  const sp = await searchParams;
  const hoje = dayKeySP(agora());
  const dia = sp.dia && DIA.test(sp.dia) ? sp.dia : hoje;
  const { caixa, proximo } = await withSession(user, async (tx) => ({ caixa: await getCaixaDia(tx, dia), proximo: await diaCaixaAtual(tx, agora()) }));
  return (
    <CaixaView
      caixa={{ ...caixa, fechamento: caixa.fechamento && { ...caixa.fechamento, fechadoEm: caixa.fechamento.fechadoEm.toISOString() } }}
      hoje={hoje}
      proximoDia={proximo}
      dona={user.papel === 'dona'}
    />
  );
}
