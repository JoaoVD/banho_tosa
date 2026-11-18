import { expect, test } from 'vitest';
import { isOptOut } from './optout';

test.each([' Parar ', 'SAIR', 'stop', 'PARAR.'])('%j é pedido para parar', (t) => expect(isOptOut(t)).toBe(true));
test.each(['pode parar aqui às 10?', 'Pode sim!', '', 'sair às 10h', 'Cancelar', 'pare'])('%j não é', (t) => expect(isOptOut(t)).toBe(false));
