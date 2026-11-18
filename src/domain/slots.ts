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

/** Intervalos livres dentro do expediente, sem os ocupados; descarta sobras menores que minimoMin. */
export function freeGaps(input: { dia: string; abre: string; fecha: string; ocupados: Intervalo[]; minimoMin?: number }): Intervalo[] {
  const minimo = (input.minimoMin ?? 30) * 60_000;
  const fecha = atSP(input.dia, input.fecha).getTime();
  let cursor = atSP(input.dia, input.abre).getTime();
  const gaps: Intervalo[] = [];
  const ordenados = [...input.ocupados].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  for (const o of ordenados) {
    const ini = o.inicio.getTime();
    if (ini - cursor >= minimo) gaps.push({ inicio: new Date(cursor), fim: new Date(Math.min(ini, fecha)) });
    cursor = Math.max(cursor, o.fim.getTime());
  }
  if (fecha - cursor >= minimo) gaps.push({ inicio: new Date(cursor), fim: new Date(fecha) });
  return gaps;
}
