import { ChevronDown } from 'lucide-react';

import { cn } from '../lib/utils';

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export const SelectField = ({ label, className, children, ...props }: SelectFieldProps) => {
  return (
    <label className="flex min-w-0 w-full flex-col gap-2 text-sm font-medium text-ink">
      <span>{label}</span>
      <div className="relative">
        <select
          {...props}
          className={cn(
            'soft-ring h-14 w-full min-w-0 appearance-none rounded-2xl border border-transparent bg-white px-4 pr-11 text-sm text-ink shadow-panel',
            className
          )}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-500/70" />
      </div>
    </label>
  );
};