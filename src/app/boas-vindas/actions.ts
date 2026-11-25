'use server';
import { redirect } from 'next/navigation';
import { requireDona } from '@/auth/current';
import { withSession } from '@/db/session';
import { setHorarios, updateLoja, upsertProfissional, type Horario } from '@/db/repos/config';
import { aplicarCatalogo, precosParaAjuste, type PrecosPorNome } from '@/db/repos/onboarding';
import { normalizarHorarios, validarPrecos } from '@/domain/onboarding';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Resultado = { ok: true } | { ok: false; erro: string };

export async function salvarHorariosAction(dias: Horario[]): Promise<Resultado> {
  const user = await requireDona();
  const r = normalizarHorarios(dias);
  if (!r.ok) return { ok: false, erro: r.erro };
  await withSession(user, (tx) => setHorarios(tx, user.lojaId, r.dias));
  return { ok: true };
}

export async function adicionarProfissionalAction(nome: string, funcao: 'banho' | 'tosa'): Promise<{ ok: true; id: string } | { ok: false; erro: string }> {
  const user = await requireDona();
  const n = nome.trim();
  if (!n) return { ok: false, erro: 'Informe o nome.' };
  const { id } = await withSession(user, (tx) => upsertProfissional(tx, user.lojaId, { nome: n.slice(0, 60), funcao: funcao === 'tosa' ? 'tosa' : 'banho', ativo: true }));
  return { ok: true, id };
}

export async function removerProfissionalAction(id: string): Promise<void> {
  const user = await requireDona();
  if (!UUID.test(id)) return;
  await withSession(user, (tx) => tx`update profissionais set ativo = false where id = ${id} and loja_id = ${user.lojaId}`);
}

export async function salvarServicosAction(precos: PrecosPorNome = {}): Promise<{ ok: true; total: number; precos: PrecosPorNome } | { ok: false; erro: string }> {
  const user = await requireDona();
  const validos = validarPrecos(precos);
  if (!validos) return { ok: false, erro: 'Confira os preços: até R$ 10.000,00 por porte.' };
  const r = await withSession(user, async (tx) => ({ total: await aplicarCatalogo(tx, user.lojaId, validos), precos: await precosParaAjuste(tx) }));
  return { ok: true, ...r };
}

/** Fim do primeiro acesso. "importar" já leva para a importação da planilha. */
export async function concluirAction(destino: 'importar' | 'hoje'): Promise<void> {
  const user = await requireDona();
  await withSession(user, (tx) => updateLoja(tx, user.lojaId, { onboardingConcluido: true }));
  if (destino === 'importar') redirect('/configuracoes/importar');
}
