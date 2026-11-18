import { normalizePhone } from '@/domain/phone';
import type { Conexao, InboundEvent, WhatsAppProvider } from './provider';

type Deps = { registrar: (to: string, text: string) => Promise<void>; estado: () => Promise<string> };

const QR_FALSO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29"><rect width="29" height="29" fill="#fff"/><path d="M1 1h7v7H1zM21 1h7v7h-7zM1 21h7v7H1zM10 10h3v3h-3zM14 14h3v3h-3zM18 10h2v6h-2zM10 18h6v2h-6z" fill="#1D1D1F"/></svg>');

/** WhatsApp de mentira para desenvolvimento e testes: registra o que "enviaria". */
export class FakeProvider implements WhatsAppProvider {
  constructor(private deps: Deps) {}

  async sendText(toE164: string, text: string) {
    if ((await this.deps.estado()) === 'falhar') throw new Error('Falha simulada no envio');
    await this.deps.registrar(toE164, text);
    return { providerId: `fake-${crypto.randomUUID()}` };
  }

  async connection(): Promise<Conexao> {
    const s = await this.deps.estado();
    return s === 'close' || s === 'connecting' ? { state: s, qrCodeDataUrl: QR_FALSO } : { state: 'open' };
  }

  /** Formato simplificado usado pela rota /api/dev/whatsapp/inbound: { from, text, fromMe? }. */
  parseWebhook(body: unknown): InboundEvent[] {
    const b = (body ?? {}) as { from?: string; text?: string; fromMe?: boolean; id?: string };
    const fromE164 = normalizePhone(String(b.from ?? ''));
    if (!fromE164 || !b.text) return [];
    return [{ kind: 'message', providerId: b.id ?? `fake-in-${crypto.randomUUID()}`, fromE164, fromMe: !!b.fromMe, text: b.text, at: new Date(), isGroup: false }];
  }
}

export async function fakeDbDeps(): Promise<Deps> {
  const { serviceDb } = await import('@/db/client');
  const sql = serviceDb();
  return {
    registrar: async (to, text) => { await sql`insert into fake_whatsapp_log (para, texto) values (${to}, ${text})`; },
    estado: async () => (await sql`select valor from fake_whatsapp_estado where chave = 'conexao'`)[0]?.valor ?? 'open',
  };
}
