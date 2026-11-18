'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export function Filtro({ q }: { q: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [valor, setValor] = useState(q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setValor(q), [q]);

  // Clicar num link (ex.: um pet da lista) cancela a atualização pendente do filtro,
  // senão ela chegaria depois e mandaria a tela de volta para a lista.
  useEffect(() => {
    const cancelar = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest('a') && timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
    document.addEventListener('click', cancelar, true);
    return () => document.removeEventListener('click', cancelar, true);
  }, []);

  useEffect(() => {
    if (valor === q) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      router.replace(`${pathname}${valor ? `?q=${encodeURIComponent(valor)}` : ''}`);
    }, 200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [valor, q, pathname, router]);

  return (
    <div className="field">
      <label htmlFor="filtro-pets">Filtrar</label>
      <input id="filtro-pets" className="input" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Pet, tutor ou telefone" autoComplete="off" />
    </div>
  );
}
