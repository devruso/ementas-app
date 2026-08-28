import { formatWorkload } from '../lib/format';
import type { WorkloadEntry } from '../types';

interface WorkloadOverviewProps {
  workload?: WorkloadEntry;
}

const workloadGroups = [
  {
    title: 'Estudante',
    fields: [
      ['Teoria', 'studentTheory'],
      ['Prática', 'studentPractice'],
      ['Teoria/Prática', 'studentTheoryPractice'],
      ['Extensão', 'studentExtension'],
      ['Estágio', 'studentInternship'],
      ['Prática/Estágio', 'studentPracticeInternship'],
    ],
  },
  {
    title: 'Professor',
    fields: [
      ['Teoria', 'teacherTheory'],
      ['Prática', 'teacherPractice'],
      ['Teoria/Prática', 'teacherTheoryPractice'],
      ['Extensão', 'teacherExtension'],
      ['Estágio', 'teacherInternship'],
      ['Prática/Estágio', 'teacherPracticeInternship'],
    ],
  },
  {
    title: 'Módulo',
    fields: [
      ['Teoria', 'moduleTheory'],
      ['Prática', 'modulePractice'],
      ['Teoria/Prática', 'moduleTheoryPractice'],
      ['Extensão', 'moduleExtension'],
      ['Estágio', 'moduleInternship'],
      ['Prática/Estágio', 'modulePracticeInternship'],
    ],
  },
] satisfies Array<{
  title: string;
  fields: Array<[string, keyof WorkloadEntry]>;
}>;

export const WorkloadOverview = ({ workload }: WorkloadOverviewProps) => (
  <section aria-labelledby="workload-overview-title">
    <h2 id="workload-overview-title" className="mb-4 text-lg font-semibold text-ink">
      Carga horária
    </h2>
    <div className="grid min-w-0 gap-6 xl:grid-cols-3">
      {workloadGroups.map((group) => (
        <div key={group.title} className="panel min-w-0 p-5 sm:p-6">
          <h3 className="mb-4 text-base font-semibold leading-tight text-ink xl:whitespace-nowrap">Carga horária {group.title}</h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            {group.fields.map(([label, field]) => (
              <div key={field} className="rounded-2xl border border-transparent bg-background px-4 py-3 shadow-sm">
                <dt className="text-xs font-medium text-muted">{label}</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{formatWorkload(workload?.[field])}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  </section>
);
