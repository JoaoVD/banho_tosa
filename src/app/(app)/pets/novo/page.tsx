import { getUser } from '@/auth/current';
import { PageHead } from '@/ui/bits';
import { NovoPetForm } from './NovoPetForm';

export default async function Page({ searchParams }: { searchParams: Promise<{ telefone?: string }> }) {
  await getUser();
  const { telefone } = await searchParams;
  return (
    <div className="view" style={{ maxWidth: 720 }}>
      <PageHead title="Cadastrar pet" />
      <NovoPetForm telefone={telefone ?? ''} />
    </div>
  );
}
