import { ArrowUpRight, Building2, CalendarRange } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { Component } from '../types';

export const DisciplineCard = ({ component }: { component: Component }) => {
  return (
    <Link
      to={`/disciplinas/${component.code.toLowerCase()}`}
      className="group panel flex h-full flex-col justify-between p-5 transition hover:-translate-y-0.5 hover:border-primary-100"
    >
      <div>
        <div className="mb-3 inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary-600">
          {component.code}
        </div>
        <h2 className="text-lg font-semibold text-ink transition group-hover:text-primary-600">
          {component.name}
        </h2>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">
          {component.syllabus || component.program || 'Disciplina cadastrada sem resumo publico disponivel.'}
        </p>
      </div>

      <div className="mt-5 space-y-2 text-sm text-ink/80">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-secondary-700" />
          <span>{component.department || 'Departamento nao informado'}</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-secondary-700" />
          <span>{component.semester || 'Semestre nao informado'}</span>
        </div>
        <div className="pt-2 text-primary-600">
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            Abrir disciplina
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
};