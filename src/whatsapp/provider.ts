export type InboundEvent =
  | { kind: 'message'; providerId: string; fromE164: string; fromMe: boolean; text: string; at: Date; isGroup: boolean }
  | { kind: 'connection'; state: string };

export type Conexao = { state: 'open' | 'connecting' | 'close'; qrCodeDataUrl?: string };

/** Única porta de saída para o WhatsApp. Trocar de provedor = nova implementação desta interface. */
export interface WhatsAppProvider {
  sendText(toE164: string, text: string): Promise<{ providerId: string }>;
  connection(): Promise<Conexao>;
  parseWebhook(body: unknown): InboundEvent[];
}

export async function getProvider(): Promise<WhatsAppProvider> {
  if (process.env.WHATSAPP_PROVIDER === 'evolution') {
    const { EvolutionProvider } = await import('./evolution');
    return new EvolutionProvider({
      url: process.env.EVOLUTION_URL ?? '',
      apiKey: process.env.EVOLUTION_API_KEY ?? '',
      instance: process.env.EVOLUTION_INSTANCE ?? '',
    });
  }
  const { FakeProvider, fakeDbDeps } = await import('./fake');
  return new FakeProvider(await fakeDbDeps());
}
