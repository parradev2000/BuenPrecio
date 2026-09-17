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

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="empty">
      {message}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

export function Pagination({
  page,
  pages,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="pagination">
      <span className="pagination-info">
        {from}–{to} de {total}
      </span>
      <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Anterior
      </button>
      <span className="pagination-current">
        Página {page} de {pages}
      </span>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Siguiente
      </button>
    </div>
  );
}