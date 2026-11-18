import { expect, test } from 'vitest';
import { cycleStatus, suggestCycle } from './cycle';

const d = (s: string) => new Date(`${s}T15:00:00Z`);

test('com 3 visitas ou mais, sugere a mediana dos intervalos', () => {
  expect(suggestCycle([d('2026-09-01'), d('2026-09-15'), d('2026-09-29'), d('2026-10-16')], 15)).toBe(14);
});

test('com menos de 3 visitas, usa o padrão do serviço', () => {
  expect(suggestCycle([d('2026-09-01'), d('2026-09-11')], 15)).toBe(15);
  expect(suggestCycle([], 21)).toBe(21);
});

test('no ponto de voltar quando passou o ciclo e não há agendamento futuro', () => {
  expect(cycleStatus({ ultimaVisita: d('2026-11-03'), cicloDias: 15, temAgendamentoFuturo: false, hoje: '2026-11-18' }))
    .toEqual({ diasDesde: 15, voltaEm: 0, noPonto: true });
  expect(cycleStatus({ ultimaVisita: d('2026-11-03'), cicloDias: 15, temAgendamentoFuturo: true, hoje: '2026-11-18' }).noPonto).toBe(false);
  expect(cycleStatus({ ultimaVisita: d('2026-11-10'), cicloDias: 15, temAgendamentoFuturo: false, hoje: '2026-11-18' }))
    .toEqual({ diasDesde: 8, voltaEm: 7, noPonto: false });
  expect(cycleStatus({ ultimaVisita: null, cicloDias: 15, temAgendamentoFuturo: false, hoje: '2026-11-18' }))
    .toEqual({ diasDesde: null, voltaEm: null, noPonto: false });
});
