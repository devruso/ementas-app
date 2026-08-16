import { AlertCircle } from 'lucide-react';

import type { AppError } from '../lib/errors';

interface ErrorNoticeProps {
  error?: AppError | null;
  compact?: boolean;
}

export const ErrorNotice = ({ error, compact = false }: ErrorNoticeProps) => {
  if (!error) {
    return null;
  }

  const missingFields = Array.isArray(error.details?.fields)
    ? error.details.fields.filter((field): field is string => typeof field === 'string')
    : [];

  return (
    <div className="border border-danger/20 bg-red-50 px-4 py-3 text-sm text-danger" role="alert">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <div className="font-semibold">{error.message}</div>
          {!compact && error.reason ? <div className="mt-1 text-xs leading-5 text-red-800">Motivo: {error.reason}</div> : null}
          {missingFields.length > 0 ? <div className="mt-1 text-xs leading-5 text-red-800">Campos: {missingFields.join(', ')}.</div> : null}
          {!compact && error.recovery ? <div className="mt-1 text-xs leading-5 text-red-800">Como resolver: {error.recovery}</div> : null}
          {error.code ? <div className="mt-2 text-[11px] font-medium text-red-700/80">Código: {error.code}</div> : null}
        </div>
      </div>
    </div>
  );
};
