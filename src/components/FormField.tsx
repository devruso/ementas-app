import { cn } from '../lib/utils';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FormField = ({ label, error, className, ...props }: FormFieldProps) => {
  return (
    <label className="flex w-full flex-col gap-2 text-sm font-medium text-ink">
      <span>{label}</span>
      <input
        {...props}
        className={cn(
          'soft-ring h-14 rounded-2xl border border-transparent bg-background px-4 text-sm text-ink shadow-sm placeholder:text-muted',
          error ? 'border-danger/40 ring-4 ring-red-100' : '',
          className
        )}
      />
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
};