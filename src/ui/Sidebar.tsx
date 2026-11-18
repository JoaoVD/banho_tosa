'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Papel } from '@/domain/types';
import { Icon, type IconName } from './icons';

type Item = { href: string; label: string; icon: IconName; color: string; group?: string };

export const NAV: Item[] = [
  { href: '/hoje', label: 'Hoje', icon: 'sun', color: 'orange' },
  { href: '/agenda', label: 'Agenda', icon: 'cal', color: 'red' },
  { href: '/mensagens', label: 'Mensagens', icon: 'msg', color: 'green' },
  { href: '/pets', label: 'Pets e tutores', icon: 'paw', color: 'blue', group: 'Clientes' },
  { href: '/pacotes', label: 'Pacotes e pontos', icon: 'gift', color: 'pink' },
  { href: '/caixa', label: 'Caixa', icon: 'wallet', color: 'teal', group: 'Loja' },
];
const CONFIG: Item = { href: '/configuracoes', label: 'Configurações', icon: 'gear', color: 'gray' };

export function titleFor(pathname: string): string {
  const item = [...NAV, CONFIG].find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  return item?.label ?? 'Banho e Tosa';
}

export function Sidebar({ papel, nomeLoja, naoLidas, sair }: { papel: Papel; nomeLoja: string; naoLidas: number; sair: () => Promise<void> }) {
  const pathname = usePathname();
  const items = papel === 'dona' ? [...NAV, CONFIG] : NAV;
  return (
    <nav className="side" aria-label="Menu principal">
      <div className="app-id">
        <span className="app-icon"><Icon name="paw" size="lg" /></span>
        <div>
          <b>{nomeLoja}</b>
          <span>{papel === 'dona' ? 'Administração' : 'Recepção'}</span>
        </div>
      </div>
      {items.map((i) => {
        const active = pathname === i.href || pathname.startsWith(`${i.href}/`);
        return (
          <div key={i.href} style={{ display: 'contents' }}>
            {i.group && <div className="group">{i.group}</div>}
            <Link href={i.href} aria-current={active ? 'page' : undefined}>
              <span className={`tile t-${i.color}`} aria-hidden="true"><Icon name={i.icon} /></span>
              {i.label}
              {i.href === '/mensagens' && naoLidas > 0 && (
                <span className="count hot" aria-label={`${naoLidas} não lidas`}>{naoLidas}</span>
              )}
            </Link>
          </div>
        );
      })}
      <div className="foot">
        <form action={sair}><button type="submit">Sair</button></form>
      </div>
    </nav>
  );
}
