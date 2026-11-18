import { requireDona } from '@/auth/current';
import { withSession } from '@/db/session';
import { getHorarios } from '@/db/repos/config';
import { PageHead } from '@/ui/bits';
import { Voltar } from '../Voltar';
import { HorariosForm } from './HorariosForm';

export default async function Page() {
  const user = await requireDona();
  const horarios = await withSession(user, getHorarios);
  return (
    <div className="view" style={{ maxWidth: 720 }}>
      <Voltar />
      <PageHead title="Horário de funcionamento" />
      <HorariosForm horarios={horarios} />
    </div>
  );
}
