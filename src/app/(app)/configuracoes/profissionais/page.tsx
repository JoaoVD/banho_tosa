import { requireDona } from '@/auth/current';
import { withSession } from '@/db/session';
import { listProfissionais } from '@/db/repos/config';
import { GroupList, PageHead, Tile } from '@/ui/bits';
import { Voltar } from '../Voltar';
import { NovoProfissional } from './NovoProfissional';

export default async function Page() {
  const user = await requireDona();
  const profs = await withSession(user, (tx) => listProfissionais(tx));
  return (
    <div className="view" style={{ maxWidth: 720 }}>
      <Voltar />
      <PageHead title="Profissionais" />
      <GroupList>
        {profs.map((p) => (
          <div className="row ind" key={p.id}>
            <Tile icon={p.funcao === 'banho' ? 'drop' : 'scis'} color={p.funcao === 'banho' ? 'teal' : 'orange'} />
            <span className="grow">{p.nome}<br /><span className="cap">{p.funcao === 'banho' ? 'Banho' : 'Tosa'}{p.ativo ? '' : ', inativo'}</span></span>
          </div>
        ))}
      </GroupList>
      <NovoProfissional />
    </div>
  );
}
