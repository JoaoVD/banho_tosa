import { getUser } from '@/auth/current';
import { withSession } from '@/db/session';
import { listAcabando, listModelos } from '@/db/repos/pacotes';
import { listPremios } from '@/db/repos/pontos';
import { listServicos } from '@/db/repos/servicos';
import { dayKeySP } from '@/domain/time';
import { agora } from '@/lib/agora';
import { PacotesView } from './PacotesView';

export default async function Page() {
  const user = await getUser();
  const hoje = dayKeySP(agora());
  const data = await withSession(user, async (tx) => ({
    modelos: await listModelos(tx, hoje),
    acabando: await listAcabando(tx, hoje),
    premios: await listPremios(tx),
    servicos: (await listServicos(tx, true)).map((s) => ({ id: s.id, nome: s.nome })),
  }));
  return <PacotesView {...data} dona={user.papel === 'dona'} />;
}
