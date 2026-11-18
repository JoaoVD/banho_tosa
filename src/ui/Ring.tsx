export function Ring({ percent, text, label, tone = 'tint' }: { percent: number; text: string; label: string; tone?: 'tint' | 'orange' }) {
  const p = Math.max(0, Math.min(100, percent));
  const style = { '--p': p, '--c': tone === 'orange' ? 'var(--orange-fill)' : 'var(--tint)' } as React.CSSProperties;
  return (
    <div className="ring" style={style} role="img" aria-label={label}>
      <span className="num" aria-hidden="true">{text}</span>
    </div>
  );
}
