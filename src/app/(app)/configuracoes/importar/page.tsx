import { requireDona } from '@/auth/current';
import { PageHead } from '@/ui/bits';
import { Voltar } from '../Voltar';
import { Importador } from './Importador';

export default async function Page() {
  await requireDona();
  return (
    <div className="view" style={{ maxWidth: 820 }}>
      <Voltar />
      <PageHead title="Importar planilha" />
      <Importador />
    </div>
  );
}
