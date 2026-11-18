import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { EvolutionProvider } from './evolution';

const fixture = (n: string) => JSON.parse(readFileSync(`tests/fixtures/evolution/${n}.json`, 'utf8'));
const evo = new EvolutionProvider({ url: 'https://evo.exemplo.dev', apiKey: 'chave', instance: 'banho-e-tosa' });

afterEach(() => vi.unstubAllGlobals());

test('mensagem recebida do tutor', () => {
  expect(evo.parseWebhook(fixture('message-in'))).toEqual([
    { kind: 'message', providerId: '3EB0C767D26A1B3C5F12', fromE164: '+5511987654321', fromMe: false, text: 'Pode sim! Deixo ele lá às 10h', at: new Date(1763470260 * 1000), isGroup: false },
  ]);
});

test('mensagem enviada pelo celular da loja', () => {
  const [e] = evo.parseWebhook(fixture('message-from-me'));
  expect(e).toMatchObject({ kind: 'message', fromMe: true, text: 'Já já fica pronto!', fromE164: '+5511987654321' });
});

test('grupo é marcado como grupo', () => {
  expect(evo.parseWebhook(fixture('message-group'))[0]).toMatchObject({ kind: 'message', isGroup: true });
});

test('mudança de conexão', () => {
  expect(evo.parseWebhook(fixture('connection-update'))).toEqual([{ kind: 'connection', state: 'open' }]);
});

test('corpo desconhecido não quebra', () => {
  expect(evo.parseWebhook({ event: 'presence.update', data: {} })).toEqual([]);
  expect(evo.parseWebhook(null)).toEqual([]);
});

test('sendText chama a Evolution com a chave e o número sem o +', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ key: { id: 'ABC123' } }), { status: 201 }));
  vi.stubGlobal('fetch', fetchMock);
  const r = await evo.sendText('+5511987654321', 'Oi Ana!');
  expect(r).toEqual({ providerId: 'ABC123' });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('https://evo.exemplo.dev/message/sendText/banho-e-tosa');
  expect(init.method).toBe('POST');
  expect(init.headers).toMatchObject({ apikey: 'chave', 'Content-Type': 'application/json' });
  expect(JSON.parse(init.body)).toEqual({ number: '5511987654321', text: 'Oi Ana!' });
});

test('erro HTTP vira exceção', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('fora do ar', { status: 500 })));
  await expect(evo.sendText('+5511987654321', 'x')).rejects.toThrow(/500/);
});

test('estado da conexão e QR code', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ instance: { instanceName: 'banho-e-tosa', state: 'close' } })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ base64: 'data:image/png;base64,AAAA' }))));
  expect(await evo.connection()).toEqual({ state: 'close', qrCodeDataUrl: 'data:image/png;base64,AAAA' });
});

test('cria a instância quando ela ainda não existe e devolve o QR', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(new Response('{"status":404}', { status: 404 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ instance: { instanceName: 'banho-e-tosa' }, qrcode: { base64: 'data:image/png;base64,QR' } }), { status: 201 })));
  expect(await evo.connection()).toEqual({ state: 'close', qrCodeDataUrl: 'data:image/png;base64,QR' });
  const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[1];
  expect(url).toBe('https://evo.exemplo.dev/instance/create');
  expect(JSON.parse(init.body)).toEqual({ instanceName: 'banho-e-tosa', integration: 'WHATSAPP-BAILEYS', qrcode: true });
});
