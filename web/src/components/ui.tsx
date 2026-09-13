import type { InputHTMLAttributes, ReactNode } from 'react';

type FieldProps = {
  label: string;
  error?: string | null;
} & InputHTMLAttributes<HTMLInputElement>;

export function Field({ label, error, ...rest }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input className={`field-input${error ? ' field-input-error' : ''}`} {...rest} />
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export function Alert({ kind, children }: { kind: 'error' | 'success' | 'info'; children: ReactNode }) {
  return <div className={`alert alert-${kind}`}>{children}</div>;
}

export function Loading() {
  return <div className="loading">Cargando…</div>;
}

export function EmptyState({ message }: { message: string }) {
  return <p className="empty">{message}</p>;
}