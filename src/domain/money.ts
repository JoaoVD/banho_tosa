const FORMATTER = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const WITH_THOUSANDS = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/;
const PLAIN = /^\d+(,\d{1,2})?$/;

/** Converte um valor digitado em reais ("1.234,56", "80", "R$ 80,50") para centavos. */
export function parseBRL(input: string): number | null {
  const s = input.replace(/R\$/i, '').replace(/\s| /g, '');
  if (!s || !(WITH_THOUSANDS.test(s) || PLAIN.test(s))) return null;
  const [inteiro, decimais = ''] = s.replace(/\./g, '').split(',');
  return Number(inteiro) * 100 + Number(decimais.padEnd(2, '0'));
}

export function formatBRL(cents: number): string {
  return FORMATTER.format(cents / 100);
}
