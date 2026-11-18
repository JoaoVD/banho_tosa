'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function Filtro({ q }: { q: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [valor, setValor] = useState(q);
  useEffect(() => setValor(q), [q]);
  useEffect(() => {
    if (valor === q) return;
    const t = setTimeout(() => router.replace(`${pathname}${valor ? `?q=${encodeURIComponent(valor)}` : ''}`), 200);
    return () => clearTimeout(t);
  }, [valor, q, pathname, router]);
  return (
    <div className="field">
      <label htmlFor="filtro-pets">Filtrar</label>
      <input id="filtro-pets" className="input" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Pet, tutor ou telefone" autoComplete="off" />
    </div>
  );
}
