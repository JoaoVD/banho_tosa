import { requireDona } from '@/auth/current';
import { withSession } from '@/db/session';
import { getProvider } from '@/whatsapp/provider';
import { PageHead } from '@/ui/bits';
import { Voltar } from '../Voltar';
import { Conexao } from './Conexao';

export default async function Page() {
  const user = await requireDona();
  // O número configurado no servidor é de uma loja só: as outras não veem o estado nem o QR Code.
  const [loja] = await withSession(user, (tx) => tx<{ liberado: boolean }[]>`select whatsapp_liberado as liberado from lojas where id = ${user.lojaId}`);
  if (!loja?.liberado) {
    return (
      <div className="view" style={{ maxWidth: 720 }}>
        <Voltar />
        <PageHead title="WhatsApp" />
        <div className="card pad" role="status">
          <b>O WhatsApp ainda não está disponível para esta loja.</b>
          <p className="muted" style={{ margin: '4px 0 0' }}>Assim que for liberado, a conexão com o número da loja aparece aqui.</p>
        </div>
      </div>
    );
  }
  const c = await (await getProvider()).connection().catch(() => ({ state: 'close' as const, qrCodeDataUrl: undefined, erro: true }));
  return (
    <div className="view" style={{ maxWidth: 720 }}>
      <Voltar />
      <PageHead title="WhatsApp" />
      <Conexao estado={c.state} qr={c.qrCodeDataUrl ?? null} erro={'erro' in c} />
    </div>
  );
}
