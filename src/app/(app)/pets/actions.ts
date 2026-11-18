'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getUser } from '@/auth/current';
import { withSession } from '@/db/session';
import { createPet, updatePet } from '@/db/repos/pets';
import { TelefoneInvalido, setLembretesAtivos, upsertTutor } from '@/db/repos/tutores';
import { PORTES, type Porte } from '@/domain/types';
import type { FormResult } from '@/ui/ActionForm';

export async function cadastrarPet(_: FormResult, f: FormData): Promise<FormResult> {
  const user = await getUser();
  const get = (k: string) => String(f.get(k) ?? '').trim();
  const fieldErrors: Record<string, string> = {};
  if (!get('tutorNome')) fieldErrors.tutorNome = 'Informe o nome do tutor.';
  if (!get('telefone')) fieldErrors.telefone = 'Informe o WhatsApp do tutor.';
  if (!get('petNome')) fieldErrors.petNome = 'Informe o nome do pet.';
  const porte = get('porte') as Porte;
  if (!PORTES.includes(porte)) fieldErrors.porte = 'Escolha o porte.';
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  let petId: string;
  try {
    petId = await withSession(user, async (tx) => {
      const t = await upsertTutor(tx, user.lojaId, { nome: get('tutorNome'), telefone: get('telefone') });
      const cuidados = get('cuidados').split(/[\n,;]/).map((c) => c.trim()).filter(Boolean);
      const p = await createPet(tx, user.lojaId, {
        tutorId: t.id,
        nome: get('petNome'),
        especie: get('especie') === 'gato' ? 'gato' : 'cao',
        raca: get('raca') || null,
        porte,
        nascimento: get('nascimento') || null,
        cuidados,
        observacoes: get('observacoes') || null,
      });
      return p.id;
    });
  } catch (e) {
    if (e instanceof TelefoneInvalido) return { fieldErrors: { telefone: 'Telefone inválido. Use DDD + número, ex.: (11) 98765-4321.' } };
    throw e;
  }
  revalidatePath('/pets');
  redirect(`/pets/${petId}`);
}

export async function alterarLembretes(tutorId: string, ativo: boolean) {
  const user = await getUser();
  await withSession(user, (tx) => setLembretesAtivos(tx, tutorId, ativo));
  revalidatePath('/pets', 'layout');
}

export async function salvarCuidados(petId: string, cuidados: string[]) {
  const user = await getUser();
  await withSession(user, (tx) => updatePet(tx, petId, { cuidados: cuidados.map((c) => c.trim()).filter(Boolean) }));
  revalidatePath(`/pets/${petId}`);
}

export async function salvarFoto(petId: string, url: string | null) {
  const user = await getUser();
  await withSession(user, (tx) => updatePet(tx, petId, { fotoUrl: url }));
  revalidatePath(`/pets/${petId}`);
}

export async function fixarCicloAction(petId: string, dias: number | null) {
  const user = await getUser();
  const { fixarCiclo } = await import('@/db/repos/pets');
  await withSession(user, (tx) => fixarCiclo(tx, petId, dias && dias > 0 ? Math.round(dias) : null));
  revalidatePath(`/pets/${petId}`);
}
