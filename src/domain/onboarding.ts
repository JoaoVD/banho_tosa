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
