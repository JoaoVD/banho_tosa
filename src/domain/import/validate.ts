import { normalizePhone } from '../phone';
import type { Porte } from '../types';
import type { CampoImport, Mapping } from './map';

export type LinhaImport = {
  linha: number;
  tutorNome: string;
  telefone: string;
  petNome: string;
  especie: 'cao' | 'gato';
  raca: string | null;
  porte: Porte;
  ultimaVisita: string | null;
  servico: string | null;
  pacote: string | null;
  pacoteSaldo: number | null;
  pacoteValidade: string | null;
  pontos: number | null;
};
export type ErroImport = { linha: number; motivo: string };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const PORTES: Record<string, Porte> = {
  mini: 'mini', pp: 'mini', pequeno: 'pequeno', p: 'pequeno', medio: 'medio', m: 'medio', grande: 'grande', g: 'grande', gigante: 'gigante', gg: 'gigante',
};

/** dd/mm/aaaa, dd/mm/aa ou aaaa-mm-dd -> 'aaaa-mm-dd'; null se inválida. */
export function parseData(s: string): string | null {
  let y: number, m: number, d: number;
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (br) [d, m, y] = [+br[1], +br[2], br[3].length === 2 ? 2000 + +br[3] : +br[3]];
  else if (iso) [y, m, d] = [+iso[1], +iso[2], +iso[3]];
  else return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

/**
 * Valida as linhas segundo o mapeamento. `linha` é o número da linha na planilha
 * (o cabeçalho é a linha 1). Linhas com erro não impedem as outras.
 */
export function validateRows(rows: string[][], mapping: Mapping): { ok: LinhaImport[]; erros: ErroImport[] } {
  const ok: LinhaImport[] = [];
  const erros: ErroImport[] = [];
  const col = (campo: CampoImport) => Object.entries(mapping).find(([, c]) => c === campo)?.[0];
  rows.forEach((row, i) => {
    const linha = i + 2;
    const get = (campo: CampoImport) => {
      const c = col(campo);
      return c === undefined ? '' : String(row[Number(c)] ?? '').trim();
    };
    if (row.every((c) => !String(c ?? '').trim())) return;
    const erro = (motivo: string) => erros.push({ linha, motivo });
    const telefone = normalizePhone(get('telefone'));
    if (!telefone) return erro('Telefone inválido');
    const petNome = get('pet');
    if (!petNome) return erro('Sem nome do pet');
    const tutorNome = get('tutor') || `Tutor de ${petNome}`;
    const porteTxt = norm(get('porte'));
    const porte = porteTxt ? PORTES[porteTxt] : 'medio';
    if (!porte) return erro(`Porte desconhecido: ${get('porte')}`);
    const dataTxt = get('ultima_visita');
    const ultimaVisita = dataTxt ? parseData(dataTxt) : null;
    if (dataTxt && !ultimaVisita) return erro(`Data inválida: ${dataTxt}`);
    const validadeTxt = get('pacote_validade');
    const pacoteValidade = validadeTxt ? parseData(validadeTxt) : null;
    if (validadeTxt && !pacoteValidade) return erro(`Data inválida: ${validadeTxt}`);
    const inteiro = (campo: CampoImport) => {
      const t = get(campo).replace(/\D/g, '');
      return t ? Number(t) : null;
    };
    ok.push({
      linha,
      tutorNome,
      telefone,
      petNome,
      especie: /gat/.test(norm(get('especie'))) ? 'gato' : 'cao',
      raca: get('raca') || null,
      porte,
      ultimaVisita,
      servico: get('servico') || null,
      pacote: get('pacote') || null,
      pacoteSaldo: inteiro('pacote_saldo'),
      pacoteValidade,
      pontos: inteiro('pontos'),
    });
  });
  return { ok, erros };
}

export function agruparPorTutor(linhas: LinhaImport[]): { telefone: string; nome: string; pets: LinhaImport[] }[] {
  const grupos = new Map<string, { telefone: string; nome: string; pets: LinhaImport[] }>();
  for (const l of linhas) {
    const g = grupos.get(l.telefone) ?? { telefone: l.telefone, nome: l.tutorNome, pets: [] };
    g.pets.push(l);
    grupos.set(l.telefone, g);
  }
  return [...grupos.values()];
}
