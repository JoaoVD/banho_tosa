'use client';

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  id,
  name,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}) {
  return (
    <span className="switch">
      <input
        id={id}
        name={name}
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span />
    </span>
  );
}
