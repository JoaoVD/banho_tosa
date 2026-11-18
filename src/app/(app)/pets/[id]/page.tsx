import { notFound } from 'next/navigation';
import { getUser } from '@/auth/current';
import { withSession } from '@/db/session';
import { cicloDoPet, fidelidadeDoTutor, getPetFicha, historicoDoPet, prontoParaReceber, searchPets } from '@/db/repos/pets';
import { dayKeySP } from '@/domain/time';
import { agora } from '@/lib/agora';
import { Ficha } from '../Ficha';
import { PetsLayout } from '../PetsLayout';

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string }> }) {
  const user = await getUser();
  const { id } = await params;
  const q = (await searchParams).q ?? '';
  const { pets, ficha, ciclo, historico, receberId } = await withSession(user, async (tx) => ({
    pets: await searchPets(tx, q),
    ficha: await getPetFicha(tx, id),
    ciclo: await cicloDoPet(tx, id, dayKeySP(agora())),
    historico: await historicoDoPet(tx, id),
    receberId: await prontoParaReceber(tx, id),
  }));
  const fid = ficha ? await withSession(user, (tx) => fidelidadeDoTutor(tx, ficha.tutor.id, dayKeySP(agora()))) : null;
  if (!ficha || !ciclo) notFound();
  return (
    <PetsLayout pets={pets} q={q} selecionado={id}>
      <Ficha ficha={ficha} ciclo={ciclo} historico={historico} pacote={fid?.pacote ?? null} pontos={fid?.pontos ?? 0} receberId={receberId} />
    </PetsLayout>
  );
}
