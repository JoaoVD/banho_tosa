export type Porte = 'mini' | 'pequeno' | 'medio' | 'grande' | 'gigante';
export const PORTES: Porte[] = ['mini', 'pequeno', 'medio', 'grande', 'gigante'];
export const PORTE_LABEL: Record<Porte, string> = {
  mini: 'Mini',
  pequeno: 'Pequeno',
  medio: 'Médio',
  grande: 'Grande',
  gigante: 'Gigante',
};

export type Etapa =
  | 'agendado'
  | 'chegando'
  | 'banho'
  | 'tosa'
  | 'pronto'
  | 'concluido'
  | 'cancelado'
  | 'nao_compareceu';

export type FormaPagamento = 'pix' | 'credito' | 'debito' | 'dinheiro' | 'pacote';

export type Papel = 'dona' | 'recepcao';

export type Premio = { id: string; nome: string; pontos: number; servicoId: string | null };
export type PacoteCliente = { id: string; saldo: number; validoAte: string; servicoId: string; porte: Porte | null };
