export type CampoImport =
  | 'tutor' | 'telefone' | 'pet' | 'especie' | 'raca' | 'porte' | 'ultima_visita' | 'servico'
  | 'pacote' | 'pacote_saldo' | 'pacote_validade' | 'pontos' | 'ignorar';

export const CAMPO_LABEL: Record<CampoImport, string> = {
  tutor: 'Nome do tutor',
  telefone: 'WhatsApp / telefone',
  pet: 'Nome do pet',
  especie: 'Espécie',
  raca: 'Raça',
  porte: 'Porte',
  ultima_visita: 'Data da última visita',
  servico: 'Serviço da última visita',
  pacote: 'Pacote',
  pacote_saldo: 'Banhos restantes no pacote',
  pacote_validade: 'Validade do pacote',
  pontos: 'Pontos',
  ignorar: 'Não importar',
};

export type Mapping = Record<number, CampoImport>;

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Ordem importa: regras mais específicas primeiro.
const REGRAS: [CampoImport, RegExp][] = [
  ['pacote_saldo', /(saldo|restante|banhos restantes)/],
  ['pacote_validade', /(validade|vence|vencimento)/],
  ['pacote', /pacote|plano|assinatura/],
  ['pontos', /pontos?|fidelidade|cashback/],
  ['ultima_visita', /(ultim[oa]|ultima visita|data|visita)/],
  ['telefone', /(telefone|celular|whats|fone|contato)/],
  ['pet', /(pet|cachorro|cao|animal|gato|nome do pet)/],
  ['tutor', /(tutor|cliente|dono|responsavel|proprietario|nome)/],
  ['especie', /especie/],
  ['raca', /raca/],
  ['porte', /(porte|tamanho)/],
  ['servico', /servico/],
];

export function guessMapping(headers: string[]): Mapping {
  const usados = new Set<CampoImport>();
  const m: Mapping = {};
  headers.forEach((h, i) => {
    const n = norm(h);
    const achou = REGRAS.find(([campo, re]) => !usados.has(campo) && re.test(n));
    m[i] = achou ? achou[0] : 'ignorar';
    if (achou) usados.add(achou[0]);
  });
  return m;
}
