import Link from 'next/link';
import { Icon } from '@/ui/icons';

export function Voltar({ href = '/configuracoes', label = 'Configurações' }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="btn tinted sm" style={{ alignSelf: 'flex-start' }}>
      <Icon name="left" size="sm" />{label}
    </Link>
  );
}
