import { getUser } from '@/auth/current';
import { PageHead } from '@/ui/bits';
import { NovoPetForm } from './NovoPetForm';

export default async function Page() {
  await getUser();
  return (
    <div className="view" style={{ maxWidth: 720 }}>
      <PageHead title="Cadastrar pet" />
      <NovoPetForm />
    </div>
  );
}
