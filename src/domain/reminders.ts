import type { CycleStatus } from './cycle';

export type HistLembrete = { enviadoEm: Date; respondido: boolean };

const SETE_DIAS = 7 * 86_400_000;

/** No máximo 1 lembrete a cada 7 dias e no máximo 2 sem resposta seguidos. */
export function canSendReminder(hist: HistLembrete[], now: Date): boolean {
  const ordenado = [...hist].sort((a, b) => a.enviadoEm.getTime() - b.enviadoEm.getTime());
  const ultimo = ordenado.at(-1);
  if (ultimo && now.getTime() - ultimo.enviadoEm.getTime() < SETE_DIAS) return false;
  const doisUltimos = ordenado.slice(-2);
  return !(doisUltimos.length === 2 && doisUltimos.every((h) => !h.respondido));
}

export function selectReminderCandidates(
  pets: { petId: string; tutorId: string; lembretesAtivos: boolean; status: CycleStatus }[],
  hist: Map<string, HistLembrete[]>,
  now: Date,
): { petId: string; tutorId: string }[] {
  const porTutor = new Map<string, { petId: string; tutorId: string; voltaEm: number }>();
  for (const p of pets) {
    if (!p.lembretesAtivos || !p.status.noPonto) continue;
    if (!canSendReminder(hist.get(p.tutorId) ?? [], now)) continue;
    const voltaEm = p.status.voltaEm ?? 0;
    const atual = porTutor.get(p.tutorId);
    if (!atual || voltaEm < atual.voltaEm) porTutor.set(p.tutorId, { petId: p.petId, tutorId: p.tutorId, voltaEm });
  }
  return [...porTutor.values()].sort((a, b) => a.voltaEm - b.voltaEm).map(({ petId, tutorId }) => ({ petId, tutorId }));
}
