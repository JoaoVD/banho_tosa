import { dayKeySP } from './time';

export type CycleStatus = { diasDesde: number | null; voltaEm: number | null; noPonto: boolean };

const DIA = 86_400_000;
const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DIA);

/** Mediana dos intervalos (em dias) entre visitas concluídas; padrão se houver menos de 3 visitas. */
export function suggestCycle(visitas: Date[], padrao: number): number {
  if (visitas.length < 3) return padrao;
  const dias = visitas.map(dayKeySP).sort();
  const intervalos = dias.slice(1).map((d, i) => diasEntre(dias[i], d)).sort((a, b) => a - b);
  const meio = Math.floor(intervalos.length / 2);
  const mediana = intervalos.length % 2 ? intervalos[meio] : Math.round((intervalos[meio - 1] + intervalos[meio]) / 2);
  return Math.max(1, mediana);
}

export function cycleStatus(input: { ultimaVisita: Date | null; cicloDias: number; temAgendamentoFuturo: boolean; hoje: string }): CycleStatus {
  if (!input.ultimaVisita) return { diasDesde: null, voltaEm: null, noPonto: false };
  const diasDesde = diasEntre(dayKeySP(input.ultimaVisita), input.hoje);
  return { diasDesde, voltaEm: input.cicloDias - diasDesde, noPonto: diasDesde >= input.cicloDias && !input.temAgendamentoFuturo };
}
