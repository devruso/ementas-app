import { cn } from '../lib/utils';

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export const SelectField = ({ label, className, children, ...props }: SelectFieldProps) => {
  return (
    <label className="flex min-w-0 w-full flex-col gap-2 text-sm font-medium text-ink">
      <span>{label}</span>
      <select
        {...props}
        className={cn(
          'soft-ring h-14 w-full min-w-0 rounded-2xl border border-transparent bg-white px-4 text-sm text-ink shadow-panel',
          className
        )}
      >
        {children}
      </select>
    </label>
  );
};