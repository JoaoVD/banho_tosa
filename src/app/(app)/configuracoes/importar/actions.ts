'use server';
import { revalidatePath } from 'next/cache';
import { requireDona } from '@/auth/current';
import { withSession } from '@/db/session';
import { commitImport, type ResultadoImport } from '@/db/repos/importacao';
import { updateLoja } from '@/db/repos/config';
import { guessMapping, validateRows, type Mapping } from '@/domain/import';
import { parseSheet } from '@/domain/import/parse';

export type Leitura = { ok: true; headers: string[]; rows: string[][]; mapping: Mapping } | { ok: false; error: string };

const LIMITE = 5_000_000;

export async function lerPlanilha(form: FormData): Promise<Leitura> {
  await requireDona();
  const file = form.get('arquivo');
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Escolha um arquivo .xlsx ou .csv.' };
  if (!/\.(xlsx|csv)$/i.test(file.name)) return { ok: false, error: 'Formato não aceito. Use .xlsx ou .csv.' };
  if (file.size > LIMITE) return { ok: false, error: 'Arquivo grande demais (máximo 5 MB).' };
  try {
    const { headers, rows } = await parseSheet(await file.arrayBuffer(), file.name);
    if (!headers.length || !rows.length) return { ok: false, error: 'A planilha está vazia ou sem cabeçalho na primeira linha.' };
    return { ok: true, headers, rows, mapping: guessMapping(headers) };
  } catch {
    return { ok: false, error: 'Não foi possível ler a planilha. Salve como .xlsx ou .csv e tente de novo.' };
  }
}

export async function importar(rows: string[][], mapping: Mapping): Promise<ResultadoImport> {
  const user = await requireDona();
  const { ok } = validateRows(rows, mapping);
  const r = await withSession(user, async (tx) => {
    const res = await commitImport(tx, user.lojaId, ok);
    await updateLoja(tx, user.lojaId, { onboardingConcluido: true });
    return res;
  });
  revalidatePath('/', 'layout');
  return r;
}
