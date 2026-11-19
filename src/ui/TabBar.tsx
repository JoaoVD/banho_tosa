'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Papel } from '@/domain/types';
import { Icon, type IconName } from './icons';
import { Sheet } from './Sheet';

type Aba = { href: string; label: string; icon: IconName; color: string };

/** Telas do dia a dia: sempre a um toque no celular. */
export const ABAS: Aba[] = [
  { href: '/hoje', label: 'Hoje', icon: 'sun', color: 'orange' },
  { href: '/agenda', label: 'Agenda', icon: 'cal', color: 'red' },
  { href: '/mensagens', label: 'Mensagens', icon: 'msg', color: 'green' },
  { href: '/pets', label: 'Pets', icon: 'paw', color: 'blue' },
];
/** O resto, dentro de "Mais". Configurações só para a dona. */
export const MAIS: (Aba & { soDona?: boolean })[] = [
  { href: '/pacotes', label: 'Pacotes e pontos', icon: 'gift', color: 'pink' },
  { href: '/caixa', label: 'Caixa', icon: 'wallet', color: 'teal' },
  { href: '/configuracoes', label: 'Configurações', icon: 'gear', color: 'gray', soDona: true },
];

const ativo = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** Barra de abas do celular (some no PC, onde fica a barra lateral). */
export function TabBar({ papel, nomeLoja, naoLidas, whatsappOk, sair }: {
  papel: Papel; nomeLoja: string; naoLidas: number; whatsappOk: boolean; sair: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  useEffect(() => setAberto(false), [pathname]);
  const itensMais = MAIS.filter((i) => !i.soDona || papel === 'dona');
  const maisAtivo = itensMais.some((i) => ativo(pathname, i.href));
  return (
    <>
      <nav className="tabbar" aria-label="Abas">
        {ABAS.map((a) => (
          <Link key={a.href} href={a.href} aria-current={ativo(pathname, a.href) ? 'page' : undefined}>
            <span className="tb-ic"><Icon name={a.icon} size="lg" />
              {a.href === '/mensagens' && naoLidas > 0 && <span className="tb-badge" aria-label={`${naoLidas} não lidas`}>{naoLidas}</span>}
              {a.href === '/mensagens' && !whatsappOk && <span className="tb-off" aria-label="WhatsApp desconectado" />}
            </span>
            <span className="tb-lb">{a.label}</span>
          </Link>
        ))}
        <button type="button" onClick={() => setAberto(true)} aria-current={maisAtivo ? 'page' : undefined} aria-haspopup="dialog">
          <span className="tb-ic"><Icon name="mais" size="lg" /></span>
          <span className="tb-lb">Mais</span>
        </button>
      </nav>
      <Sheet open={aberto} onClose={() => setAberto(false)} title="Mais">
        <div className="app-id mais-id">
          <span className="app-icon"><Icon name="paw" size="lg" /></span>
          <div><b>{nomeLoja}</b><span>{papel === 'dona' ? 'Administração' : 'Recepção'}</span></div>
        </div>
        <div className="glist">
          {itensMais.map((i) => (
            <Link key={i.href} className="row ind" href={i.href} aria-current={ativo(pathname, i.href) ? 'page' : undefined}>
              <span className={`tile t-${i.color}`} aria-hidden="true"><Icon name={i.icon} /></span>
              <span className="grow">{i.label}</span>
              <Icon name="chev" size="sm" />
            </Link>
          ))}
        </div>
        <form action={sair}><button type="submit" className="btn danger mais-sair">Sair</button></form>
      </Sheet>
    </>
  );
}
