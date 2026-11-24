import { requireDona } from '@/auth/current';
import { withSession } from '@/db/session';
import { GroupList, PageHead } from '@/ui/bits';
import { Mono, gradientFor, initials } from '@/ui/Mono';
import { Voltar } from '../Voltar';
import { listUsuarios } from '@/db/repos/usuarios';
import { NovoUsuarioForm } from './NovoUsuarioForm';
import { RedefinirSenha } from './RedefinirSenha';

export default async function Page() {
  const user = await requireDona();
  const perfis = await withSession(user, listUsuarios);
  return (
    <div className="view" style={{ maxWidth: 720 }}>
      <Voltar />
      <PageHead title="Usuários" />
      <GroupList>
        {perfis.map((p) => (
          <div className="row ind" key={p.id}>
            <Mono initials={initials(p.nome)} gradient={gradientFor(p.id)} size="sm" />
            <span className="grow">{p.nome}<br /><span className="cap">{`${p.usuario} · ${p.papel === 'dona' ? 'Dona (administração)' : 'Recepção'}`}</span></span>
            <RedefinirSenha userId={p.id} nome={p.nome} />
          </div>
        ))}
      </GroupList>
      <NovoUsuarioForm />
    </div>
  );
}
