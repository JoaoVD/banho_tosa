'use client';
import { useRef, useState } from 'react';
import { useToast } from '@/ui/Toast';
import { salvarFoto } from './actions';

/** Envio de foto para o Supabase Storage (bucket "fotos"). Só aparece com o Supabase configurado. */
export function FotoPet({ petId }: { petId: string }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const toast = useToast();
  if (!url || !key) return null;
  return (
    <>
      <button type="button" className="btn tinted sm" onClick={() => input.current?.click()} aria-busy={enviando || undefined}>
        {enviando ? 'Enviando foto…' : 'Trocar foto'}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setEnviando(true);
          try {
            const { createBrowserClient } = await import('@supabase/ssr');
            const sb = createBrowserClient(url, key);
            const path = `${petId}/${Date.now()}-${file.name.replace(/[^\w.]/g, '_')}`;
            const { error } = await sb.storage.from('fotos').upload(path, file, { upsert: true });
            if (error) throw error;
            await salvarFoto(petId, sb.storage.from('fotos').getPublicUrl(path).data.publicUrl);
            toast('Foto atualizada');
          } catch {
            toast('Não foi possível enviar a foto. Tente uma imagem menor.');
          } finally {
            setEnviando(false);
          }
        }}
      />
    </>
  );
}
