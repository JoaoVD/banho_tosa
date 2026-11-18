import { expect, test } from 'vitest';
import { agruparPorTutor, guessMapping, validateRows } from './index';

test('adivinha as colunas pelos cabeçalhos em português', () => {
  expect(guessMapping(['Nome do tutor', 'Celular', 'Pet', 'Porte', 'Último banho'])).toEqual({
    0: 'tutor', 1: 'telefone', 2: 'pet', 3: 'porte', 4: 'ultima_visita',
  });
  expect(guessMapping(['Cliente', 'WhatsApp', 'Nome do cachorro', 'Raça', 'Observação'])).toEqual({
    0: 'tutor', 1: 'telefone', 2: 'pet', 3: 'raca', 4: 'ignorar',
  });
});

const mapping = { 0: 'tutor', 1: 'telefone', 2: 'pet', 3: 'porte', 4: 'ultima_visita' } as const;

test('linhas do mesmo telefone viram um tutor com vários pets', () => {
  const { ok, erros } = validateRows(
    [
      ['Ana Souza', '(11) 98765-4321', 'Thor', 'Pequeno', '04/11/2026'],
      ['Ana Souza', '11987654321', 'Luna', 'médio', '2026-10-28'],
    ],
    mapping,
  );
  expect(erros).toEqual([]);
  expect(ok[0]).toMatchObject({ telefone: '+5511987654321', petNome: 'Thor', porte: 'pequeno', ultimaVisita: '2026-11-04' });
  expect(ok[1]).toMatchObject({ porte: 'medio', ultimaVisita: '2026-10-28' });
  const grupos = agruparPorTutor(ok);
  expect(grupos).toHaveLength(1);
  expect(grupos[0].pets.map((p) => p.petNome)).toEqual(['Thor', 'Luna']);
});

test('linha com telefone inválido vira erro e não trava as outras', () => {
  const { ok, erros } = validateRows(
    [
      ['Ana', '123', 'Thor', 'P', ''],
      ['Bia', '(21) 99876-5432', 'Mel', 'G', ''],
    ],
    mapping,
  );
  expect(erros).toEqual([{ linha: 2, motivo: 'Telefone inválido' }]);
  expect(ok).toHaveLength(1);
  expect(ok[0]).toMatchObject({ linha: 3, porte: 'grande', ultimaVisita: null });
});

test('porte vazio vira médio; porte desconhecido e data inválida são erros', () => {
  const r = validateRows(
    [
      ['Ana', '(11) 98765-4321', 'Thor', '', ''],
      ['Bia', '(11) 98765-4322', 'Mel', 'enorme', ''],
      ['Caio', '(11) 98765-4323', 'Rex', 'P', '31/02/2026'],
      ['Duda', '(11) 98765-4324', '', 'P', ''],
    ],
    mapping,
  );
  expect(r.ok.map((l) => l.porte)).toEqual(['medio']);
  expect(r.erros).toEqual([
    { linha: 3, motivo: 'Porte desconhecido: enorme' },
    { linha: 4, motivo: 'Data inválida: 31/02/2026' },
    { linha: 5, motivo: 'Sem nome do pet' },
  ]);
});
