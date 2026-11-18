'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './icons';
import { titleFor } from './Sidebar';

export function Toolbar({ whatsappOk }: { whatsappOk: boolean }) {
  const pathname = usePathname();
  return (
    <header className="toolbar">
      <span className="crumb" data-testid="toolbar-title">{titleFor(pathname)}</span>
      <form className="search" role="search" action="/pets">
        <Icon name="search" size="sm" />
        <label htmlFor="busca-global" className="sr-only">Buscar pet, tutor ou telefone</label>
        <input id="busca-global" name="q" placeholder="Buscar" autoComplete="off" />
      </form>
      <Link className={`wa ${whatsappOk ? '' : 'off'}`} href="/mensagens">
        <i aria-hidden="true" />
        {whatsappOk ? 'WhatsApp' : 'WhatsApp desconectado'}
      </Link>
      <Link className="ibtn" href="/agenda?novo=1" aria-label="Novo agendamento">
        <Icon name="plus" size="lg" />
      </Link>
    </header>
  );
}
