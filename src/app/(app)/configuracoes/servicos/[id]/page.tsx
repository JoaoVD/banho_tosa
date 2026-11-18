import { notFound } from 'next/navigation';
import { requireDona } from '@/auth/current';
import { withSession } from '@/db/session';
import { listServicos, type ServicoComPrecos } from '@/db/repos/servicos';
import { PageHead } from '@/ui/bits';
import { Voltar } from '../../Voltar';
import { ServicoForm } from './ServicoForm';

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string }> }) {
  const user = await requireDona();
  const { id } = await params;
  const { salvo } = await searchParams;
  let servico: ServicoComPrecos | null = null;
  if (id !== 'novo') {
    servico = (await withSession(user, (tx) => listServicos(tx))).find((s) => s.id === id) ?? null;
    if (!servico) notFound();
  }
  return (
    <div className="view" style={{ maxWidth: 720 }}>
      <Voltar href="/configuracoes/servicos" label="Serviços" />
      <PageHead title={servico?.nome ?? 'Novo serviço'} />
      <ServicoForm servico={servico} recemCriado={salvo === '1'} />
    </div>
  );
}
