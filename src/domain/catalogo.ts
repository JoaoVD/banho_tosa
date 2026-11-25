import type { Porte } from './types';

/** Preço (centavos) e duração (min) por porte. */
export type Tabela = Record<Porte, [number, number]>;
export type ServicoSugerido = { nome: string; banho: boolean; tosa: boolean; ciclo: number; precos: Tabela };

/** Serviços mais comuns, com preços sugeridos: o ponto de partida de uma loja nova (e dos dados de exemplo). */
export const CATALOGO: ServicoSugerido[] = [
  { nome: 'Banho', banho: true, tosa: false, ciclo: 15, precos: { mini: [5000, 45], pequeno: [7000, 60], medio: [8500, 75], grande: [11000, 90], gigante: [14000, 120] } },
  { nome: 'Banho + tosa higiênica', banho: true, tosa: true, ciclo: 15, precos: { mini: [7000, 75], pequeno: [8500, 90], medio: [10000, 105], grande: [13000, 120], gigante: [16000, 150] } },
  { nome: 'Banho + hidratação', banho: true, tosa: false, ciclo: 15, precos: { mini: [9000, 60], pequeno: [11000, 75], medio: [12500, 90], grande: [15000, 105], gigante: [18000, 135] } },
  { nome: 'Banho + escovação', banho: true, tosa: false, ciclo: 15, precos: { mini: [7000, 60], pequeno: [9000, 75], medio: [11000, 90], grande: [13000, 105], gigante: [16000, 135] } },
  { nome: 'Banho + tosa bebê', banho: true, tosa: true, ciclo: 21, precos: { mini: [8000, 90], pequeno: [9500, 105], medio: [11500, 120], grande: [14500, 150], gigante: [17500, 180] } },
  { nome: 'Tosa na tesoura', banho: false, tosa: true, ciclo: 30, precos: { mini: [10000, 75], pequeno: [12000, 90], medio: [14000, 105], grande: [17000, 120], gigante: [20000, 150] } },
  { nome: 'Tosa da raça', banho: false, tosa: true, ciclo: 30, precos: { mini: [10000, 75], pequeno: [12000, 90], medio: [14000, 105], grande: [17000, 120], gigante: [20000, 150] } },
];

export type PresetHorario = { id: string; rotulo: string; dias: { diaSemana: number; abre: string; fecha: string }[] };

const SEG_SEX = [1, 2, 3, 4, 5];

/** Horários mais comuns para o primeiro acesso. */
export const PRESETS_HORARIO: PresetHorario[] = [
  { id: 'semana-sabado-meio', rotulo: 'Seg a Sex 8h–18h, Sáb 8h–14h',
    dias: [...SEG_SEX.map((d) => ({ diaSemana: d, abre: '08:00', fecha: '18:00' })), { diaSemana: 6, abre: '08:00', fecha: '14:00' }] },
  { id: 'seg-sab', rotulo: 'Seg a Sáb 8h–18h', dias: [...SEG_SEX, 6].map((d) => ({ diaSemana: d, abre: '08:00', fecha: '18:00' })) },
];
