import { requireDona } from '@/auth/current';
import { withSession } from '@/db/session';
import { getLoja } from '@/db/repos/config';
import { PageHead } from '@/ui/bits';
import { Voltar } from '../Voltar';
import { LojaForm } from './LojaForm';

export default async function Page() {
  const user = await requireDona();
  const loja = await withSession(user, getLoja);
  return (
    <div className="view" style={{ maxWidth: 720 }}>
      <Voltar />
      <PageHead title="Loja" />
      <LojaForm nome={loja.nome} telefone={loja.telefoneDona ?? ''} />
    </div>
  );
}
