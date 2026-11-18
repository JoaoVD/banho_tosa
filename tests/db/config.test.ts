import { afterAll, beforeEach, expect, test } from 'vitest';
import { asUser, resetDb, seedLoja, sql } from './helpers';
import { getConfig, updateConfig } from '@/db/repos/config';
import { listServicos, upsertServico, type ServicoInput } from '@/db/repos/servicos';

beforeEach(resetDb);
afterAll(() => sql.end());

const banho: ServicoInput = {
  nome: 'Banho',
  incluiBanho: true,
  incluiTosa: false,
  cicloPadraoDias: 15,
  precos: {
    mini: { precoCentavos: 5000, duracaoMin: 45 },
    pequeno: { precoCentavos: 7000, duracaoMin: 60 },
    medio: { precoCentavos: 8500, duracaoMin: 75 },
    grande: { precoCentavos: 11000, duracaoMin: 90 },
    gigante: { precoCentavos: 14000, duracaoMin: 120 },
  },
};

test('upsertServico salva os 5 portes e listServicos devolve', async () => {
  const a = await seedLoja();
  const { id } = await asUser(a.donaId, (tx) => upsertServico(tx, a.lojaId, banho));
  const lista = await asUser(a.recepcaoId, (tx) => listServicos(tx));
  expect(lista).toHaveLength(1);
  expect(lista[0].id).toBe(id);
  expect(lista[0].precos.pequeno).toEqual({ precoCentavos: 7000, duracaoMin: 60 });
  expect(Object.keys(lista[0].precos).sort()).toEqual(['gigante', 'grande', 'medio', 'mini', 'pequeno']);
});

test('upsertServico com id atualiza o preço', async () => {
  const a = await seedLoja();
  const { id } = await asUser(a.donaId, (tx) => upsertServico(tx, a.lojaId, banho));
  await asUser(a.donaId, (tx) =>
    upsertServico(tx, a.lojaId, { ...banho, id, precos: { ...banho.precos, pequeno: { precoCentavos: 7500, duracaoMin: 60 } } }),
  );
  const [s] = await asUser(a.donaId, (tx) => listServicos(tx));
  expect(s.precos.pequeno.precoCentavos).toBe(7500);
});

test('recepção não consegue criar serviço', async () => {
  const a = await seedLoja();
  await expect(asUser(a.recepcaoId, (tx) => upsertServico(tx, a.lojaId, banho))).rejects.toThrow();
});

test('getConfig e updateConfig', async () => {
  const a = await seedLoja();
  await asUser(a.donaId, (tx) => updateConfig(tx, a.lojaId, { tetoDiario: 80, horaLembrete: '10:00' }));
  const cfg = await asUser(a.recepcaoId, (tx) => getConfig(tx));
  expect(cfg.tetoDiario).toBe(80);
  expect(cfg.horaLembrete).toBe('10:00');
  expect(cfg.envioInicio).toBe('08:00');
});
