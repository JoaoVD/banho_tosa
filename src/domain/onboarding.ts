/** Etapas do primeiro acesso, na ordem da conversa. */
export const ETAPAS = ['horarios', 'equipe', 'servicos', 'clientes'] as const;
export type EtapaOnboarding = (typeof ETAPAS)[number];

export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

type Dia = { diaSemana: number; abre: string; fecha: string };

const listar = (itens: string[]) => (itens.length < 2 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`);

/** "Seg a Sex, 08:00–18:00 · Sáb, 08:00–14:00": dias seguidos com o mesmo horário viram um intervalo. */
export function resumoHorarios(dias: Dia[]): string {
  if (!dias.length) return 'Fechado todos os dias';
  const ord = [...dias].sort((a, b) => a.diaSemana - b.diaSemana);
  // Agrupa por horário, mantendo a ordem do primeiro dia de cada grupo.
  const grupos = new Map<string, number[]>();
  for (const d of ord) {
    const k = `${d.abre}–${d.fecha}`;
    grupos.set(k, [...(grupos.get(k) ?? []), d.diaSemana]);
  }
  return [...grupos].map(([horas, ds]) => {
    const seguidos = ds.length > 2 && ds.every((d, i) => i === 0 || d === ds[i - 1] + 1);
    const nomes = seguidos ? `${DIAS_CURTOS[ds[0]]} a ${DIAS_CURTOS[ds[ds.length - 1]]}` : listar(ds.map((d) => DIAS_CURTOS[d]));
    return `${nomes}, ${horas}`;
  }).join(' · ');
}

export function resumoEquipe(pessoas: { nome: string; funcao: 'banho' | 'tosa' }[]): string {
  return listar(pessoas.map((p) => `${p.nome} (${p.funcao})`));
}

/** Primeira etapa que ainda falta (ao abrir ou recarregar a conversa). */
export function etapaInicial(p: { horarios: number; equipe: number; servicos: number }): EtapaOnboarding {
  if (!p.horarios) return 'horarios';
  if (!p.equipe) return 'equipe';
  if (!p.servicos) return 'servicos';
  return 'clientes';
}

const PORTES_ORDEM = ['mini', 'pequeno', 'medio', 'grande', 'gigante'] as const;
const PRECO_MAX = 1_000_000; // R$ 10.000,00

/** Preços por serviço vindos do navegador: inteiros em centavos de 0 a R$ 10.000; senão null. */
export function validarPrecos(precos: unknown): Record<string, Record<(typeof PORTES_ORDEM)[number], number>> | null {
  if (!precos || typeof precos !== 'object') return null;
  const saida: Record<string, Record<(typeof PORTES_ORDEM)[number], number>> = {};
  for (const [nome, p] of Object.entries(precos as Record<string, unknown>)) {
    if (!p || typeof p !== 'object') return null;
    const linha = {} as Record<(typeof PORTES_ORDEM)[number], number>;
    for (const porte of PORTES_ORDEM) {
      const v = (p as Record<string, unknown>)[porte];
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > PRECO_MAX) return null;
      linha[porte] = v;
    }
    saida[nome] = linha;
  }
  return saida;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Horários vindos do navegador: um por dia (o primeiro vale), dias 0–6, abre antes de fechar. */
export function normalizarHorarios(dias: Dia[]): { ok: true; dias: Dia[] } | { ok: false; erro: string } {
  const vistos = new Set<number>();
  const validos = (Array.isArray(dias) ? dias : []).filter((d) => {
    if (!Number.isInteger(d?.diaSemana) || d.diaSemana < 0 || d.diaSemana > 6 || vistos.has(d.diaSemana)) return false;
    vistos.add(d.diaSemana);
    return true;
  });
  if (!validos.length) return { ok: false, erro: 'Escolha pelo menos um dia.' };
  if (validos.some((d) => !HHMM.test(d.abre) || !HHMM.test(d.fecha))) return { ok: false, erro: 'Horário inválido.' };
  if (validos.some((d) => d.fecha <= d.abre)) return { ok: false, erro: 'O horário de fechar precisa ser depois do de abrir.' };
  return { ok: true, dias: validos.map((d) => ({ diaSemana: d.diaSemana, abre: d.abre, fecha: d.fecha })) };
}
