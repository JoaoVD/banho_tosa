'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Tile } from '@/ui/bits';

export function Conexao({ estado, qr, erro }: { estado: 'open' | 'connecting' | 'close'; qr: string | null; erro: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (estado === 'open') return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [estado, router]);
  if (estado === 'open') {
    return (
      <div className="card pad" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Tile icon="check" color="green" size={44} />
        <div><h2 className="title3">Conectado</h2><p className="cap" style={{ margin: 0 }}>As mensagens automáticas saem pelo número da loja. O número continua funcionando normalmente no celular.</p></div>
      </div>
    );
  }
  return (
    <div className="card pad" style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
      {qr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr} alt="QR code para conectar o WhatsApp" width={220} height={220} style={{ borderRadius: 16, background: '#fff', padding: 8, boxShadow: 'var(--shadow)' }} />
      ) : (
        <div className="empty" style={{ width: 220, height: 220, flex: '0 0 auto' }}>{erro ? 'Não foi possível falar com o servidor do WhatsApp.' : 'Gerando QR code…'}</div>
      )}
      <div style={{ flex: '1 1 260px' }}>
        <h2 className="title3">{estado === 'connecting' ? 'Conectando…' : 'WhatsApp desconectado'}</h2>
        <ol style={{ paddingLeft: 18, lineHeight: 1.7 }}>
          <li>Abra o WhatsApp no celular da loja.</li>
          <li>Toque em <b>Aparelhos conectados</b> e depois em <b>Conectar um aparelho</b>.</li>
          <li>Aponte a câmera para este QR code.</li>
        </ol>
        <p className="cap" style={{ margin: 0 }}>Esta tela atualiza sozinha a cada 5 segundos. Enquanto estiver desconectado, as mensagens ficam guardadas na fila.</p>
      </div>
    </div>
  );
}
