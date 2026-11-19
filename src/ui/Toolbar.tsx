'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons';
import { titleFor } from './Sidebar';

export function Toolbar({ whatsappOk }: { whatsappOk: boolean }) {
  const pathname = usePathname();
  // Celular: a busca fica atrás de um botão e abre em largura total.
  const [buscando, setBuscando] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  useEffect(() => setBuscando(false), [pathname]);
  useEffect(() => { if (buscando) campo.current?.focus(); }, [buscando]);
  return (
    <header className={`toolbar${buscando ? ' buscando' : ''}`}>
      <span className="crumb" data-testid="toolbar-title">{titleFor(pathname)}</span>
      <form className="search" role="search" action="/pets" onSubmit={() => setBuscando(false)}>
        <Icon name="search" size="sm" />
        <label htmlFor="busca-global" className="sr-only">Buscar pet, tutor ou telefone</label>
        <input id="busca-global" ref={campo} name="q" placeholder="Buscar" autoComplete="off" onBlur={(e) => { if (!e.currentTarget.value) setBuscando(false); }} />
      </form>
      <button type="button" className="ibtn tb-buscar" aria-label="Buscar" aria-expanded={buscando} onClick={() => setBuscando((b) => !b)}>
        <Icon name={buscando ? 'x' : 'search'} size="lg" />
      </button>
      <Link className={`wa ${whatsappOk ? '' : 'off'}`} href="/mensagens">
        <i aria-hidden="true" />
        {whatsappOk ? 'WhatsApp' : 'WhatsApp desconectado'}
      </Link>
      <Link className="ibtn tb-novo" href="/agenda?novo=1" aria-label="Novo agendamento">
        <Icon name="plus" size="lg" />
      </Link>
    </header>
  );
}
