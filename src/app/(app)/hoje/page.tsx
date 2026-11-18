import { getUser } from '@/auth/current';
import { PageHead } from '@/ui/bits';

export default async function HojePage() {
  const user = await getUser();
  return (
    <div className="view">
      <PageHead eyebrow="Hoje" title={`Bom dia, ${user.nome}`} />
    </div>
  );
}
