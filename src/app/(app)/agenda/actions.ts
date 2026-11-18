'use server';
import { revalidatePath } from 'next/cache';
import { getUser } from '@/auth/current';
import { withSession } from '@/db/session';
import { cancelar, criarAgendamento, horariosLivres, marcarNaoCompareceu, remarcar, type ResultadoAgendar } from '@/db/repos/agenda';
import { agora } from '@/lib/agora';
import { dayKeySP, hhmmSP } from '@/domain/time';
import type { FormResult } from '@/ui/ActionForm';

export type OpcaoHorario = { value: string; label: string };

const DIA = /^\d{4}-\d{2}-\d{2}$/;

export async function buscarHorarios(petId: string, servicoId: string, dia: string, ignorarAgendamento?: string): Promise<OpcaoHorario[]> {
  const user = await getUser();
  if (!petId || !servicoId || !DIA.test(dia)) return [];
  const agoraMesmo = agora();
  const livres = await withSession(user, (tx) =>
    horariosLivres(tx, { petId, servicoId, dia, ignorarAgendamento, depoisDe: dia === dayKeySP(agoraMesmo) ? agoraMesmo : undefined }),
  );
  return livres.map((h) => ({ value: h.inicio.toISOString(), label: `${hhmmSP(h.inicio)} com ${h.profissionalNome}` }));
}

function mensagemOcupado(r: Extract<ResultadoAgendar, { erro: string }>): string {
  if (!r.proximo) return 'Esse horário foi ocupado e não há horário livre nos próximos dias.';
  const dia = r.proximo.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit' });
  return `Esse horário foi ocupado. Próximo livre: ${dia} às ${hhmmSP(r.proximo)}.`;
}

export async function agendar(_: FormResult, f: FormData): Promise<FormResult> {
  const user = await getUser();
  const petId = String(f.get('petId') ?? '');
  const servicoId = String(f.get('servicoId') ?? '');
  const inicioIso = String(f.get('inicio') ?? '');
  const fieldErrors: Record<string, string> = {};
  if (!petId) fieldErrors.petId = 'Escolha o pet para agendar.';
  if (!servicoId) fieldErrors.servicoId = 'Escolha o serviço.';
  if (!inicioIso) fieldErrors.inicio = 'Escolha um horário livre.';
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  const r = await withSession(user, async (tx) => {
    const res = await criarAgendamento(tx, user.lojaId, user.id, { petId, servicoId, inicio: new Date(inicioIso), confirmarWhatsApp: f.get('confirmar') === 'on' });
    const [pet] = await tx`select nome from pets where id = ${petId}`;
    return { res, pet: pet?.nome as string };
  });
  if ('erro' in r.res) return { fieldErrors: { inicio: mensagemOcupado(r.res) } };
  revalidatePath('/agenda');
  revalidatePath('/hoje');
  return { ok: true, at: Date.now(), msg: `${r.pet} agendado, ${hhmmSP(r.res.inicio)} com ${r.res.profissionalNome}` };
}

export async function remarcarAction(id: string, inicioIso: string): Promise<{ ok: boolean; msg: string }> {
  const user = await getUser();
  const r = await withSession(user, (tx) => remarcar(tx, user.lojaId, id, new Date(inicioIso)));
  if ('erro' in r) return { ok: false, msg: mensagemOcupado(r) };
  revalidatePath('/agenda');
  revalidatePath('/hoje');
  return { ok: true, msg: `Remarcado para ${hhmmSP(r.inicio)} com ${r.profissionalNome}` };
}

export async function cancelarAction(id: string, motivo: string) {
  const user = await getUser();
  await withSession(user, (tx) => cancelar(tx, id, motivo));
  revalidatePath('/agenda');
  revalidatePath('/hoje');
}

export async function naoCompareceuAction(id: string) {
  const user = await getUser();
  await withSession(user, (tx) => marcarNaoCompareceu(tx, id));
  revalidatePath('/agenda');
  revalidatePath('/hoje');
}
