'use server';
import { revalidatePath } from 'next/cache';
import { getUser, requireDona } from '@/auth/current';
import { withSession } from '@/db/session';
import { estenderValidade, listModelos, upsertModelo, venderPacote } from '@/db/repos/pacotes';
import { upsertPremio } from '@/db/repos/pontos';
import { parseBRL } from '@/domain/money';
import { dayKeySP } from '@/domain/time';
import { PORTES, type Porte } from '@/domain/types';
import { agora } from '@/lib/agora';
import type { FormResult } from '@/ui/ActionForm';

export async function salvarModelo(_: FormResult, f: FormData): Promise<FormResult> {
  const user = await requireDona();
  const get = (k: string) => String(f.get(k) ?? '').trim();
  const fieldErrors: Record<string, string> = {};
  const preco = parseBRL(get('preco'));
  const banhos = Number(get('banhos'));
  const validade = Number(get('validade'));
  const porte = get('porte') as Porte | '';
  if (!get('nome')) fieldErrors.nome = 'Informe o nome do pacote.';
  if (preco === null) fieldErrors.preco = 'Digite um valor como 260,00';
  if (!Number.isInteger(banhos) || banhos < 1) fieldErrors.banhos = 'Quantos atendimentos o pacote dá.';
  if (!get('servicoId')) fieldErrors.servicoId = 'Escolha o serviço.';
  if (!Number.isInteger(validade) || validade < 1) fieldErrors.validade = 'Validade em dias.';
  if (porte && !PORTES.includes(porte)) fieldErrors.porte = 'Porte inválido.';
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  await withSession(user, (tx) =>
    upsertModelo(tx, user.lojaId, { id: get('id') || undefined, nome: get('nome'), precoCentavos: preco!, banhos, servicoId: get('servicoId'), porte: porte || null, validadeDias: validade }),
  );
  revalidatePath('/pacotes');
  return { ok: true, msg: 'Pacote salvo', at: Date.now() };
}

export async function salvarPremio(_: FormResult, f: FormData): Promise<FormResult> {
  const user = await requireDona();
  const nome = String(f.get('nome') ?? '').trim();
  const pontos = Number(f.get('pontos'));
  if (!nome || !Number.isInteger(pontos) || pontos < 1) return { fieldErrors: { ...(nome ? {} : { nome: 'Informe o prêmio.' }), ...(pontos >= 1 ? {} : { pontos: 'Pontos necessários.' }) } };
  await withSession(user, (tx) => upsertPremio(tx, user.lojaId, { nome, pontos, servicoId: String(f.get('servicoId') ?? '') || null }));
  revalidatePath('/pacotes');
  return { ok: true, msg: 'Prêmio salvo', at: Date.now() };
}

export async function modelosParaVenda() {
  const user = await getUser();
  return withSession(user, (tx) => listModelos(tx, dayKeySP(agora()), true));
}

export async function venderAction(input: { idempotencyKey: string; tutorId: string; modeloId: string; forma: 'pix' | 'credito' | 'debito' | 'dinheiro' }) {
  const user = await getUser();
  await withSession(user, (tx) => venderPacote(tx, user.lojaId, user.id, { ...input, diaCaixa: dayKeySP(agora()) }));
  revalidatePath('/pacotes');
  revalidatePath('/pets', 'layout');
  revalidatePath('/hoje');
  revalidatePath('/caixa');
}

export async function estenderAction(pacoteClienteId: string, novaData: string) {
  const user = await getUser();
  await withSession(user, (tx) => estenderValidade(tx, pacoteClienteId, novaData));
  revalidatePath('/pacotes');
}
