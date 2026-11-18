import { normalizePhone } from '@/domain/phone';
import type { Conexao, InboundEvent, WhatsAppProvider } from './provider';

type Cfg = { url: string; apiKey: string; instance: string };
type Json = Record<string, unknown>;

const obj = (v: unknown): Json => (v && typeof v === 'object' ? (v as Json) : {});

function textoDa(message: Json): string {
  const ext = obj(message.extendedTextMessage);
  const img = obj(message.imageMessage);
  return String(message.conversation ?? ext.text ?? img.caption ?? '').trim();
}

/** Evolution API v2 (WhatsApp Web via Baileys), rodando na VPS. */
export class EvolutionProvider implements WhatsAppProvider {
  constructor(private cfg: Cfg) {}

  private async call(path: string, init?: RequestInit): Promise<Json> {
    const res = await fetch(`${this.cfg.url.replace(/\/$/, '')}${path}`, {
      ...init,
      headers: { apikey: this.cfg.apiKey, 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`Evolution API respondeu ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return obj(await res.json());
  }

  async sendText(toE164: string, text: string) {
    const r = await this.call(`/message/sendText/${this.cfg.instance}`, {
      method: 'POST',
      body: JSON.stringify({ number: toE164.replace(/^\+/, ''), text }),
    });
    return { providerId: String(obj(r.key).id ?? '') };
  }

  async connection(): Promise<Conexao> {
    const r = await this.call(`/instance/connectionState/${this.cfg.instance}`);
    const state = String(obj(r.instance).state ?? 'close') as Conexao['state'];
    if (state === 'open') return { state };
    const qr = await this.call(`/instance/connect/${this.cfg.instance}`);
    return { state, qrCodeDataUrl: typeof qr.base64 === 'string' ? qr.base64 : undefined };
  }

  parseWebhook(body: unknown): InboundEvent[] {
    const b = obj(body);
    const event = String(b.event ?? '').toLowerCase().replace('_', '.');
    const data = obj(b.data);
    if (event === 'connection.update') return [{ kind: 'connection', state: String(data.state ?? '') }];
    if (event !== 'messages.upsert') return [];
    const key = obj(data.key);
    const jid = String(key.remoteJid ?? '');
    const isGroup = jid.endsWith('@g.us');
    // Contas novas do WhatsApp podem vir com "@lid": o número real vem em senderPn/remoteJidAlt.
    const numero = jid.endsWith('@lid') ? String(key.senderPn ?? key.remoteJidAlt ?? '') : jid;
    const fromE164 = isGroup ? '' : normalizePhone(numero) ?? '';
    const text = textoDa(obj(data.message));
    if (!isGroup && (!fromE164 || !text)) return [];
    const ts = Number(data.messageTimestamp ?? 0);
    return [{ kind: 'message', providerId: String(key.id ?? ''), fromE164, fromMe: key.fromMe === true, text, at: ts ? new Date(ts * 1000) : new Date(), isGroup }];
  }
}
