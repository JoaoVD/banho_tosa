import { notFound } from 'next/navigation';
import { getUser } from '@/auth/current';
import { withSession } from '@/db/session';
import { getPetFicha, searchPets } from '@/db/repos/pets';
import { Ficha } from '../Ficha';
import { PetsLayout } from '../PetsLayout';

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string }> }) {
  const user = await getUser();
  const { id } = await params;
  const q = (await searchParams).q ?? '';
  const { pets, ficha } = await withSession(user, async (tx) => ({ pets: await searchPets(tx, q), ficha: await getPetFicha(tx, id) }));
  if (!ficha) notFound();
  return (
    <PetsLayout pets={pets} q={q} selecionado={id}>
      <Ficha ficha={ficha} />
    </PetsLayout>
  );
}
