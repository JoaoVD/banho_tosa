import { requireDona } from '@/auth/current';
import { withSession } from '@/db/session';
import { getConfig } from '@/db/repos/config';
import { PageHead } from '@/ui/bits';
import { Voltar } from '../Voltar';
import { EnvioForm } from './EnvioForm';

export default async function Page() {
  const user = await requireDona();
  const cfg = await withSession(user, getConfig);
  return (
    <div className="view" style={{ maxWidth: 720 }}>
      <Voltar />
      <PageHead title="Lembretes, envio e caixa" />
      <EnvioForm cfg={cfg} />
    </div>
  );
}
