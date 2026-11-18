import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Normaliza um telefone brasileiro para E.164 (+55...).
 * Aceita máscaras, DDI, o sufixo do WhatsApp (@s.whatsapp.net) e celulares antigos
 * sem o nono dígito. Retorna null quando não é um número válido.
 */
export function normalizePhone(raw: string): string | null {
  let digits = raw.split('@')[0].replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length !== 10 && digits.length !== 11) return null;
  const ddd = digits.slice(0, 2);
  let numero = digits.slice(2);
  if (numero.length === 8 && /^[6-9]/.test(numero)) numero = `9${numero}`;
  const parsed = parsePhoneNumberFromString(`+55${ddd}${numero}`);
  return parsed && parsed.isValid() ? parsed.number : null;
}
