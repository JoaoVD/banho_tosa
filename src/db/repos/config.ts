import type { Tx } from '../session';

export type Config = {
  horaLembrete: string;
  envioInicio: string;
  envioFim: string;
  tetoDiario: number;
  intervaloMinS: number;
  intervaloMaxS: number;
  fundoTrocoCentavos: number;
};

const hhmm = (t: string) => t.slice(0, 5);

export async function getConfig(tx: Tx): Promise<Config> {
  const [c] = await tx`select * from configuracoes where loja_id = loja_atual()`;
  if (!c) throw new Error('Configurações da loja não encontradas');
  return {
    horaLembrete: hhmm(c.hora_lembrete),
    envioInicio: hhmm(c.envio_inicio),
    envioFim: hhmm(c.envio_fim),
    tetoDiario: c.teto_diario,
    intervaloMinS: c.intervalo_min_s,
    intervaloMaxS: c.intervalo_max_s,
    fundoTrocoCentavos: c.fundo_troco_centavos,
  };
}

const COLS: Record<keyof Config, string> = {
  horaLembrete: 'hora_lembrete',
  envioInicio: 'envio_inicio',
  envioFim: 'envio_fim',
  tetoDiario: 'teto_diario',
  intervaloMinS: 'intervalo_min_s',
  intervaloMaxS: 'intervalo_max_s',
  fundoTrocoCentavos: 'fundo_troco_centavos',
};

export async function updateConfig(tx: Tx, lojaId: string, patch: Partial<Config>): Promise<void> {
  const row = Object.fromEntries(Object.entries(patch).map(([k, v]) => [COLS[k as keyof Config], v]));
  if (!Object.keys(row).length) return;
  const res = await tx`update configuracoes set ${tx(row)} where loja_id = ${lojaId} returning loja_id`;
  if (!res.length) throw new Error('Sem permissão para alterar as configurações');
}

export type Loja = { id: string; nome: string; telefoneDona: string | null; onboardingConcluido: boolean };

export async function getLoja(tx: Tx): Promise<Loja> {
  const [l] = await tx`select id, nome, telefone_dona, onboarding_concluido from lojas where id = loja_atual()`;
  return { id: l.id, nome: l.nome, telefoneDona: l.telefone_dona, onboardingConcluido: l.onboarding_concluido };
}

export async function updateLoja(tx: Tx, lojaId: string, patch: { nome?: string; telefoneDona?: string | null; onboardingConcluido?: boolean }) {
  const row: Record<string, unknown> = {};
  if (patch.nome !== undefined) row.nome = patch.nome;
  if (patch.telefoneDona !== undefined) row.telefone_dona = patch.telefoneDona;
  if (patch.onboardingConcluido !== undefined) row.onboarding_concluido = patch.onboardingConcluido;
  const res = await tx`update lojas set ${tx(row)} where id = ${lojaId} returning id`;
  if (!res.length) throw new Error('Sem permissão para alterar a loja');
}

export type Horario = { diaSemana: number; abre: string; fecha: string };

export async function getHorarios(tx: Tx): Promise<Horario[]> {
  const rows = await tx`select dia_semana, abre, fecha from horarios_funcionamento where loja_id = loja_atual() order by dia_semana`;
  return rows.map((r) => ({ diaSemana: r.dia_semana, abre: hhmm(r.abre), fecha: hhmm(r.fecha) }));
}

/** Substitui os horários da loja. Dias ausentes ficam fechados. */
export async function setHorarios(tx: Tx, lojaId: string, horarios: Horario[]): Promise<void> {
  await tx`delete from horarios_funcionamento where loja_id = ${lojaId}`;
  for (const h of horarios) {
    await tx`insert into horarios_funcionamento (loja_id, dia_semana, abre, fecha) values (${lojaId}, ${h.diaSemana}, ${h.abre}, ${h.fecha})`;
  }
}

export type Profissional = { id: string; nome: string; funcao: 'banho' | 'tosa'; ativo: boolean };

export async function listProfissionais(tx: Tx, apenasAtivos = false): Promise<Profissional[]> {
  const rows = await tx`select id, nome, funcao, ativo from profissionais where loja_id = loja_atual()
    ${apenasAtivos ? tx`and ativo` : tx``} order by funcao, nome`;
  return rows.map((r) => ({ id: r.id, nome: r.nome, funcao: r.funcao, ativo: r.ativo }));
}

export async function upsertProfissional(tx: Tx, lojaId: string, p: Omit<Profissional, 'id'> & { id?: string }) {
  if (p.id) {
    await tx`update profissionais set nome = ${p.nome}, funcao = ${p.funcao}, ativo = ${p.ativo} where id = ${p.id} and loja_id = ${lojaId}`;
    return { id: p.id };
  }
  const [r] = await tx`insert into profissionais (loja_id, nome, funcao, ativo) values (${lojaId}, ${p.nome}, ${p.funcao}, ${p.ativo}) returning id`;
  return { id: r.id as string };
}
