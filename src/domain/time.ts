export const TZ = 'America/Sao_Paulo';

const PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function localParts(d: Date) {
  const p = Object.fromEntries(PARTS.formatToParts(d).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second };
}

/** Diferença (ms) entre o relógio local de São Paulo e UTC no instante dado. */
function offsetMs(d: Date): number {
  const p = localParts(d);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(d.getTime() / 1000) * 1000;
}

/** 'YYYY-MM-DD' do dia local em São Paulo. */
export function dayKeySP(d: Date): string {
  const p = localParts(d);
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

/** Instante correspondente a `hhmm` no dia `dayKey` em São Paulo. */
export function atSP(dayKey: string, hhmm: string): Date {
  const [y, m, d] = dayKey.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const first = guess - offsetMs(new Date(guess));
  return new Date(guess - offsetMs(new Date(first)));
}

export function startOfDaySP(d: Date): Date {
  return atSP(dayKeySP(d), '00:00');
}

export function addDaysKey(dayKey: string, n: number): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** 'HH:MM' local de São Paulo. */
export function hhmmSP(d: Date): string {
  const p = localParts(d);
  return `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`;
}

const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** "sexta, 20/11" no fuso de São Paulo. */
export function diaCurtoSP(d: Date): string {
  const k = dayKeySP(d);
  const dow = new Date(`${k}T12:00:00Z`).getUTCDay();
  return `${SEMANA[dow]}, ${k.slice(8)}/${k.slice(5, 7)}`;
}
