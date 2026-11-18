import { addDaysKey, dayKeySP } from './time';
import type { FormaPagamento } from './types';

type Forma = Exclude<FormaPagamento, 'pacote'>;

/** Dia do caixa de um recebimento: o dia local, ou o seguinte se o dia já foi fechado. */
export function businessDayFor(now: Date, fechados: Set<string>): string {
  let dia = dayKeySP(now);
  while (fechados.has(dia)) dia = addDaysKey(dia, 1);
  return dia;
}

export function summarizeDay(pagamentos: { forma: FormaPagamento; totalCentavos: number; estornado: boolean }[]) {
  const porForma: Record<Forma, number> = { pix: 0, credito: 0, debito: 0, dinheiro: 0 };
  let totalCentavos = 0;
  for (const p of pagamentos) {
    if (p.estornado) continue;
    totalCentavos += p.totalCentavos;
    if (p.forma !== 'pacote') porForma[p.forma] += p.totalCentavos;
  }
  return { totalCentavos, porForma };
}

export function drawerDiff(esperadoDinheiro: number, fundoTroco: number, contado: number): { diferenca: number; estado: 'confere' | 'sobra' | 'falta' } {
  const diferenca = contado - (esperadoDinheiro + fundoTroco);
  return { diferenca, estado: diferenca === 0 ? 'confere' : diferenca > 0 ? 'sobra' : 'falta' };
}
