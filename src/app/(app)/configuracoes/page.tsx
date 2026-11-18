import { requireDona } from '@/auth/current';
import { PageHead } from '@/ui/bits';

export default async function Page() {
  await requireDona();
  return (
    <div className="view">
      <PageHead title="Configurações" />
    </div>
  );
}
