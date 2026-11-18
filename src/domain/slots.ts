import { atSP } from './time';

type Intervalo = { inicio: Date; fim: Date };

/** Inícios possíveis (de passoMin em passoMin) em que cabe um serviço de duracaoMin sem conflito. */
export function freeSlots(input: { dia: string; abre: string; fecha: string; ocupados: Intervalo[]; duracaoMin: number; passoMin?: number; depoisDe?: Date }): Date[] {
  const passo = (input.passoMin ?? 30) * 60_000;
  const dur = input.duracaoMin * 60_000;
  const fecha = atSP(input.dia, input.fecha).getTime();
  const livres: Date[] = [];
  for (let t = atSP(input.dia, input.abre).getTime(); t + dur <= fecha; t += passo) {
    if (input.depoisDe && t < input.depoisDe.getTime()) continue;
    const conflita = input.ocupados.some((o) => t < o.fim.getTime() && t + dur > o.inicio.getTime());
    if (!conflita) livres.push(new Date(t));
  }
  return livres;
}

/** Dá a cada pedido (na ordem) um horário ainda não usado pelos anteriores. */
export function pickDistinctSlots(candidates: Date[][], n: number): (Date | null)[] {
  const usados = new Set<number>();
  return candidates.slice(0, n).map((lista) => {
    const escolhido = lista.find((d) => !usados.has(d.getTime())) ?? null;
    if (escolhido) usados.add(escolhido.getTime());
    return escolhido;
  });
}
