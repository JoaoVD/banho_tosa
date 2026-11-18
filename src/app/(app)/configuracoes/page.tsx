import Link from 'next/link';
import { requireDona } from '@/auth/current';
import { GroupList, PageHead, Tile } from '@/ui/bits';
import { Icon, type IconName } from '@/ui/icons';

type Item = { href: string; label: string; sub: string; icon: IconName; color: 'orange' | 'red' | 'blue' | 'green' | 'pink' | 'teal' | 'gray' };

const LOJA: Item[] = [
  { href: '/configuracoes/loja', label: 'Loja', sub: 'Nome e WhatsApp da dona', icon: 'paw', color: 'teal' },
  { href: '/configuracoes/horarios', label: 'Horário de funcionamento', sub: 'Dias e horas de atendimento', icon: 'clock', color: 'orange' },
  { href: '/configuracoes/profissionais', label: 'Profissionais', sub: 'Quem dá banho e quem tosa', icon: 'scis', color: 'blue' },
  { href: '/configuracoes/servicos', label: 'Serviços e preços', sub: 'Preço e duração por porte', icon: 'drop', color: 'pink' },
];
const AUTO: Item[] = [
  { href: '/configuracoes/envio', label: 'Lembretes, envio e caixa', sub: 'Horário dos lembretes, limites e fundo de troco', icon: 'bell', color: 'red' },
];
const CONTA: Item[] = [
  { href: '/configuracoes/usuarios', label: 'Usuários', sub: 'Quem acessa o sistema', icon: 'gear', color: 'gray' },
];

function Lista({ label, items }: { label: string; items: Item[] }) {
  return (
    <GroupList label={label}>
      {items.map((i) => (
        <Link key={i.href} href={i.href} className="row ind">
          <Tile icon={i.icon} color={i.color} />
          <span className="grow">{i.label}<br /><span className="cap">{i.sub}</span></span>
          <Icon name="chev" size="sm" />
        </Link>
      ))}
    </GroupList>
  );
}

export default async function Page() {
  await requireDona();
  return (
    <div className="view" style={{ maxWidth: 720 }}>
      <PageHead title="Configurações" />
      <Lista label="Loja" items={LOJA} />
      <Lista label="Automação" items={AUTO} />
      <Lista label="Acesso" items={CONTA} />
    </div>
  );
}
