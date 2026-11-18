import { expect, test } from 'vitest';
import { FakeProvider } from './fake';

test('o falso registra o envio e devolve um id', async () => {
  const enviados: { to: string; text: string }[] = [];
  const fake = new FakeProvider({ registrar: async (to, text) => { enviados.push({ to, text }); }, estado: async () => 'open' });
  const r = await fake.sendText('+5511987654321', 'Oi!');
  expect(r.providerId).toMatch(/^fake-/);
  expect(enviados).toEqual([{ to: '+5511987654321', text: 'Oi!' }]);
  expect((await fake.connection()).state).toBe('open');
});

test('o falso entende o webhook simplificado de desenvolvimento', () => {
  const fake = new FakeProvider({ registrar: async () => {}, estado: async () => 'open' });
  const [e] = fake.parseWebhook({ from: '(11) 98765-4321', text: 'Pode sim!' });
  expect(e).toMatchObject({ kind: 'message', fromE164: '+5511987654321', fromMe: false, text: 'Pode sim!', isGroup: false });
});
