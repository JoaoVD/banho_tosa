'use server';
import { redirect } from 'next/navigation';
import { requireDona } from '@/auth/current';
import { withSession } from '@/db/session';
import { setHorarios, updateLoja, upsertProfissional, type Horario } from '@/db/repos/config';
import { aplicarCatalogo, type PrecosPorNome } from '@/db/repos/onboarding';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
type Resultado = { ok: true } | { ok: false; erro: string };

export async function salvarHorariosAction(dias: Horario[]): Promise<Resultado> {
  const user = await requireDona();
  const validos = dias.filter((d) => Number.isInteger(d.diaSemana) && d.diaSemana >= 0 && d.diaSemana <= 6);
  if (!validos.length) return { ok: false, erro: 'Escolha pelo menos um dia.' };
  if (validos.some((d) => !HHMM.test(d.abre) || !HHMM.test(d.fecha))) return { ok: false, erro: 'Horário inválido.' };
  if (validos.some((d) => d.fecha <= d.abre)) return { ok: false, erro: 'O horário de fechar precisa ser depois do de abrir.' };
  await withSession(user, (tx) => setHorarios(tx, user.lojaId, validos));
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
  await withSession(user, (tx) => tx`update profissionais set ativo = false where id = ${id} and loja_id = ${user.lojaId}`);
}

export async function salvarServicosAction(precos: PrecosPorNome = {}): Promise<{ ok: true; total: number }> {
  const user = await requireDona();
  const total = await withSession(user, (tx) => aplicarCatalogo(tx, user.lojaId, precos));
  return { ok: true, total };
}

/** Fim do primeiro acesso. "importar" já leva para a importação da planilha. */
export async function concluirAction(destino: 'importar' | 'hoje'): Promise<void> {
  const user = await requireDona();
  await withSession(user, (tx) => updateLoja(tx, user.lojaId, { onboardingConcluido: true }));
  if (destino === 'importar') redirect('/configuracoes/importar');
}
