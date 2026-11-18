import { getUser } from '@/auth/current';
import { withSession } from '@/db/session';
import { cicloDoPet, getPetFicha, historicoDoPet, searchPets } from '@/db/repos/pets';
import { dayKeySP } from '@/domain/time';
import { agora } from '@/lib/agora';
import { Ficha } from './Ficha';
import { PetsLayout } from './PetsLayout';

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getUser();
  const q = (await searchParams).q ?? '';
  const { pets, ficha, ciclo, historico } = await withSession(user, async (tx) => {
    const pets = await searchPets(tx, q);
    const id = pets[0]?.id;
    return {
      pets,
      ficha: id ? await getPetFicha(tx, id) : null,
      ciclo: id ? await cicloDoPet(tx, id, dayKeySP(agora())) : null,
      historico: id ? await historicoDoPet(tx, id) : [],
    };
  });
  return (
    <PetsLayout pets={pets} q={q} selecionado={ficha?.id}>
      {ficha && ciclo && <Ficha ficha={ficha} ciclo={ciclo} historico={historico} />}
    </PetsLayout>
  );
}
