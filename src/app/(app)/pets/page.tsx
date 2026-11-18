import { getUser } from '@/auth/current';
import { withSession } from '@/db/session';
import { getPetFicha, searchPets } from '@/db/repos/pets';
import { Ficha } from './Ficha';
import { PetsLayout } from './PetsLayout';

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getUser();
  const q = (await searchParams).q ?? '';
  const { pets, ficha } = await withSession(user, async (tx) => {
    const pets = await searchPets(tx, q);
    return { pets, ficha: pets[0] ? await getPetFicha(tx, pets[0].id) : null };
  });
  return (
    <PetsLayout pets={pets} q={q} selecionado={ficha?.id}>
      {ficha && <Ficha ficha={ficha} />}
    </PetsLayout>
  );
}
