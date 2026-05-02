import type { ReactNode } from 'react';

export const FormActions = ({ children }: { children: ReactNode }) => {
  return <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">{children}</div>;
};