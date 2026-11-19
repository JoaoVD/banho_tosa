import Link from 'next/link';
import type { ReactNode } from 'react';
import type { PetListItem } from '@/db/repos/pets';
import { EmptyState, PageHead } from '@/ui/bits';
import { Icon } from '@/ui/icons';
import { Mono, gradientFor, initials } from '@/ui/Mono';
import { Filtro } from './Filtro';
import s from './pets.module.css';

/** tela: no celular, a lista (/pets) e a ficha (/pets/[id]) aparecem uma de cada vez. */
export function PetsLayout({ pets, q, selecionado, tela, children }: { pets: PetListItem[]; q: string; selecionado?: string; tela: 'lista' | 'ficha'; children?: ReactNode }) {
  return (
    <div className="view" data-tela={tela}>
      {tela === 'ficha' && (
        <Link className={`so-celular ${s.voltar}`} href={q ? `/pets?q=${encodeURIComponent(q)}` : '/pets'}><Icon name="left" />Pets</Link>
      )}
      <div className={s.cabeca}><PageHead title="Pets e tutores" actions={<Link className="btn" href="/pets/novo"><Icon name="plus" />Cadastrar pet</Link>} /></div>
      <div className={s.split}>
        <div className={s.left}>
          <Filtro q={q} />
          {pets.length ? (
            <div className="glist">
              {pets.map((p) => (
                <Link key={p.id} className="row ind" href={`/pets/${p.id}${q ? `?q=${encodeURIComponent(q)}` : ''}`} aria-current={p.id === selecionado ? 'true' : undefined}>
                  <Mono initials={initials(p.nome)} gradient={gradientFor(p.id)} size="sm" photo={p.fotoUrl} />
                  <span className="grow"><b style={{ fontWeight: 600 }}>{p.nome}</b><br /><span className="cap">{p.tutorNome}</span></span>
                  <Icon name="chev" size="sm" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="card">
              <EmptyState
                icon="search"
                text={q ? `Nenhum pet ou tutor com “${q}”.` : 'Nenhum pet cadastrado ainda.'}
                action={<Link className="btn sm" href="/pets/novo"><Icon name="plus" size="sm" />Cadastrar pet</Link>}
              />
            </div>
          )}
        </div>
        <div className={s.right}>{children}</div>
      </div>
    </div>
  );
}
