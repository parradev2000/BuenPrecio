import type { ReactNode } from 'react';
import {
  Alert as AntAlert,
  Empty,
  Input,
  Pagination as AntPagination,
  Spin,
  type InputProps,
} from 'antd';

type FieldProps = {
  label: string;
  error?: string | null;
} & InputProps;

export function Field({ label, error, ...rest }: FieldProps) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>
      <Input status={error ? 'error' : undefined} {...rest} />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Alert({ kind, children }: { kind: 'error' | 'success' | 'info'; children: ReactNode }) {
  return <AntAlert className="mb-3" type={kind} message={children} showIcon />;
}

export function Loading() {
  return (
    <div className="flex justify-center py-10">
      <Spin />
    </div>
  );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="py-8">
      <Empty description={message}>{action}</Empty>
    </div>
  );
}

export function Pagination({
  page,
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
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-slate-500">
        {from}–{to} de {total}
      </span>
      <AntPagination
        current={page}
        pageSize={pageSize}
        total={total}
        showSizeChanger={false}
        onChange={onChange}
      />
    </div>
  );
}
