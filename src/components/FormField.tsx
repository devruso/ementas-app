import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

import { cn } from '../lib/utils';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FormField = ({ label, error, className, ...props }: FormFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = props.type === 'password';
  const inputType = isPasswordField && showPassword ? 'text' : props.type;

  return (
    <label className="flex min-w-0 w-full flex-col gap-2 text-sm font-medium text-ink">
      <span>{label}</span>
      <div className="relative">
        <input
          {...props}
          type={inputType}
          className={cn(
            'soft-ring h-14 min-w-0 w-full rounded-2xl border border-transparent bg-background px-4 text-sm text-ink shadow-sm placeholder:text-muted',
            isPasswordField ? 'pr-12' : '',
            error ? 'border-danger/40 ring-4 ring-red-100' : '',
            className
          )}
        />
        {isPasswordField ? (
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted transition hover:bg-slate-100 hover:text-ink"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
};