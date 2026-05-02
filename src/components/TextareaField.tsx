import { cn } from '../lib/utils';

interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const TextareaField = ({ label, error, className, ...props }: TextareaFieldProps) => {
  return (
    <label className="flex min-w-0 w-full flex-col gap-2 text-sm font-medium text-ink">
      <span>{label}</span>
      <textarea
        {...props}
        className={cn(
          'soft-ring min-h-[152px] min-w-0 rounded-2xl border border-transparent bg-background px-4 py-3 text-sm text-ink shadow-sm placeholder:text-muted',
          error ? 'border-danger/40 ring-4 ring-red-100' : '',
          className
        )}
      />
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
};