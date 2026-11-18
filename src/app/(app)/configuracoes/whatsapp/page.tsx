import { requireDona } from '@/auth/current';
import { getProvider } from '@/whatsapp/provider';
import { PageHead } from '@/ui/bits';
import { Voltar } from '../Voltar';
import { Conexao } from './Conexao';

export default async function Page() {
  await requireDona();
  const c = await (await getProvider()).connection().catch(() => ({ state: 'close' as const, qrCodeDataUrl: undefined, erro: true }));
  return (
    <div className="view" style={{ maxWidth: 720 }}>
      <Voltar />
      <PageHead title="WhatsApp" />
      <Conexao estado={c.state} qr={c.qrCodeDataUrl ?? null} erro={'erro' in c} />
    </div>
  );
}
