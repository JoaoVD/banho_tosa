import { requireDona } from '@/auth/current';
import { withSession } from '@/db/session';
import { GroupList, PageHead } from '@/ui/bits';
import { Mono, gradientFor, initials } from '@/ui/Mono';
import { Voltar } from '../Voltar';
import { ConvidarForm } from './ConvidarForm';

export default async function Page() {
  const user = await requireDona();
  const perfis = await withSession(user, (tx) => tx<{ id: string; nome: string; papel: string }[]>`
    select user_id as id, nome, papel from perfis where loja_id = loja_atual() order by papel, nome`);
  return (
    <div className="view" style={{ maxWidth: 720 }}>
      <Voltar />
      <PageHead title="Usuários" />
      <GroupList>
        {perfis.map((p) => (
          <div className="row ind" key={p.id}>
            <Mono initials={initials(p.nome)} gradient={gradientFor(p.id)} size="sm" />
            <span className="grow">{p.nome}<br /><span className="cap">{p.papel === 'dona' ? 'Dona (administração)' : 'Recepção'}</span></span>
          </div>
        ))}
      </GroupList>
      <ConvidarForm />
    </div>
  );
}
