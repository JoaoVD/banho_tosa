import type { ReactNode } from 'react';
import { Icon, type IconName } from './icons';

export function Chip({ tone, children, icon }: { tone?: 'tint' | 'orange' | 'green' | 'red'; icon?: IconName; children: ReactNode }) {
  return (
    <span className={`chip ${tone ?? ''}`}>
      {icon && <Icon name={icon} size="sm" />}
      {children}
    </span>
  );
}

export function EmptyState({ icon, text, action }: { icon?: IconName; text: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      {icon && <Icon name={icon} size="lg" />}
      <span>{text}</span>
      {action}
    </div>
  );
}

export function GroupList({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div>
      {label && <p className="glabel">{label}</p>}
      <div className="glist">{children}</div>
    </div>
  );
}

export function Tile({ icon, color, size }: { icon: IconName; color: 'orange' | 'red' | 'blue' | 'green' | 'pink' | 'teal' | 'gray'; size?: number }) {
  const style = size ? { width: size, height: size, borderRadius: size * 0.27 } : undefined;
  return (
    <span className={`tile t-${color}`} style={style} aria-hidden="true">
      <Icon name={icon} size={size && size > 30 ? 'lg' : undefined} />
    </span>
  );
}

export function Widget({ title, tile, value, sub, href }: { title: string; tile: ReactNode; value: ReactNode; sub: ReactNode; href?: string }) {
  const inner = (
    <>
      <div className="w-top">{tile}{title}</div>
      <div className="w-num num">{value}</div>
      <div className="w-sub">{sub}</div>
    </>
  );
  return href ? <a className="widget" href={href}>{inner}</a> : <div className="widget">{inner}</div>;
}

export function PageHead({ eyebrow, title, actions }: { eyebrow?: string; title: string; actions?: ReactNode }) {
  return (
    <div className="head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="large">{title}</h1>
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}
