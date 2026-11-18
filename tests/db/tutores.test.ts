import { afterAll, beforeEach, expect, test } from 'vitest';
import { asUser, resetDb, seedLoja, sql } from './helpers';
import { TelefoneInvalido, setLembretesAtivos, upsertTutor } from '@/db/repos/tutores';
import { createPet, getPetFicha, searchPets } from '@/db/repos/pets';

beforeEach(resetDb);
afterAll(() => sql.end());

test('upsertTutor reconhece o mesmo telefone em formatos diferentes', async () => {
  const a = await seedLoja();
  const r1 = await asUser(a.recepcaoId, (tx) => upsertTutor(tx, a.lojaId, { nome: 'Ana Souza', telefone: '(11) 98765-4321' }));
  const r2 = await asUser(a.recepcaoId, (tx) => upsertTutor(tx, a.lojaId, { nome: 'Ana', telefone: '11987654321' }));
  expect(r1.criado).toBe(true);
  expect(r2).toEqual({ id: r1.id, criado: false });
});

test('upsertTutor rejeita telefone inválido', async () => {
  const a = await seedLoja();
  await expect(asUser(a.recepcaoId, (tx) => upsertTutor(tx, a.lojaId, { nome: 'X', telefone: '123' }))).rejects.toBeInstanceOf(TelefoneInvalido);
});

test('searchPets encontra por nome do pet, do tutor e dígitos do telefone', async () => {
  const a = await seedLoja();
  await asUser(a.recepcaoId, async (tx) => {
    const t = await upsertTutor(tx, a.lojaId, { nome: 'Ana Souza', telefone: '(11) 98765-4321' });
    await createPet(tx, a.lojaId, { tutorId: t.id, nome: 'Thor', especie: 'cao', raca: 'Shih-tzu', porte: 'pequeno' });
  });
  for (const q of ['thor', 'souza', '98765', '']) {
    const r = await asUser(a.recepcaoId, (tx) => searchPets(tx, q));
    expect(r.map((p) => p.nome)).toEqual(['Thor']);
  }
  expect(await asUser(a.recepcaoId, (tx) => searchPets(tx, 'zzz'))).toEqual([]);
});

test('getPetFicha traz pet, tutor e cuidados; setLembretesAtivos persiste', async () => {
  const a = await seedLoja();
  const petId = await asUser(a.recepcaoId, async (tx) => {
    const t = await upsertTutor(tx, a.lojaId, { nome: 'Ana Souza', telefone: '(11) 98765-4321' });
    const p = await createPet(tx, a.lojaId, { tutorId: t.id, nome: 'Thor', especie: 'cao', raca: 'Shih-tzu', porte: 'pequeno', cuidados: ['Sensível nas orelhas'] });
    await setLembretesAtivos(tx, t.id, false);
    return p.id;
  });
  const f = await asUser(a.recepcaoId, (tx) => getPetFicha(tx, petId));
  expect(f).toMatchObject({ nome: 'Thor', raca: 'Shih-tzu', porte: 'pequeno', cuidados: ['Sensível nas orelhas'] });
  expect(f!.tutor).toMatchObject({ nome: 'Ana Souza', telefone: '+5511987654321', lembretesAtivos: false });
});
