import { getUser } from '@/auth/current';
import { withSession } from '@/db/session';
import { cicloDoPet, fidelidadeDoTutor, getPetFicha, historicoDoPet, prontoParaReceber, searchPets } from '@/db/repos/pets';
import { dayKeySP } from '@/domain/time';
import { agora } from '@/lib/agora';
import { Ficha } from './Ficha';
import { PetsLayout } from './PetsLayout';

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getUser();
  const q = (await searchParams).q ?? '';
  const { pets, ficha, ciclo, historico, fid, receberId } = await withSession(user, async (tx) => {
    const pets = await searchPets(tx, q);
    const id = pets[0]?.id;
    const ficha = id ? await getPetFicha(tx, id) : null;
    return {
      pets,
      ficha,
      fid: ficha ? await fidelidadeDoTutor(tx, ficha.tutor.id, dayKeySP(agora())) : null,
      receberId: id ? await prontoParaReceber(tx, id) : null,
      ciclo: id ? await cicloDoPet(tx, id, dayKeySP(agora())) : null,
      historico: id ? await historicoDoPet(tx, id) : [],
    };
  });
  return (
    <PetsLayout pets={pets} q={q} selecionado={ficha?.id}>
      {ficha && ciclo && <Ficha ficha={ficha} ciclo={ciclo} historico={historico} pacote={fid?.pacote ?? null} pontos={fid?.pontos ?? 0} receberId={receberId} />}
    </PetsLayout>
  );
}
