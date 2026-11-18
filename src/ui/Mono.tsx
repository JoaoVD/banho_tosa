export type Gradiente = 1 | 2 | 3 | 4 | 5 | 6;

/** Gradiente estável a partir de um id (mesmo pet, mesma cor). */
export function gradientFor(id: string): Gradiente {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ((h % 5) + 2) as Gradiente;
}

export function initials(nome: string, max = 1): string {
  return nome.trim().split(/\s+/).slice(0, max).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export function Mono({ initials: ini, gradient, size, photo }: { initials: string; gradient: Gradiente; size?: 'sm' | 'xl'; photo?: string | null }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (photo) return <img className={`mono ${size ?? ''}`} src={photo} alt="" />;
  return (
    <span className={`mono g${gradient} ${size ?? ''}`} aria-hidden="true">
      {ini}
    </span>
  );
}
