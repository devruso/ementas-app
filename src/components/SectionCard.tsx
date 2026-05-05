import type { ReactNode } from 'react';

export const SectionCard = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-line bg-slate-50/70 px-5 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-ink/70">
        {title}
      </div>
      <div className="px-5 py-5 text-justify text-sm leading-7 text-ink/90">{children}</div>
    </section>
  );
};