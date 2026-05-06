import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { SectionCard } from '../components/SectionCard';
import { getSharedComponentByToken } from '../lib/api';
import { AppError } from '../lib/errors';
import { formatWorkload } from '../lib/format';
import type { Component } from '../types';

const splitReferences = (bibliography?: string, referencesBasic?: string, referencesComplementary?: string) => {
  const basic = String(referencesBasic || '').trim();
  const complementary = String(referencesComplementary || '').trim();

  if (basic || complementary) {
    return { basic, complementary };
  }

  const raw = String(bibliography || '').trim();

  if (!raw) {
    return { basic: '', complementary: '' };
  }

  const basicMatch = raw.match(/(?:REFERENCIAS\s+BASICAS|REFERÊNCIAS\s+BÁSICAS|BASICAS|BÁSICAS)\s*:\s*([\s\S]*?)(?=(?:REFERENCIAS\s+COMPLEMENTARES|REFERÊNCIAS\s+COMPLEMENTARES|COMPLEMENTARES)\s*:|$)/i);
  const complementaryMatch = raw.match(/(?:REFERENCIAS\s+COMPLEMENTARES|REFERÊNCIAS\s+COMPLEMENTARES|COMPLEMENTARES)\s*:\s*([\s\S]*)$/i);

  if (basicMatch || complementaryMatch) {
    return {
      basic: (basicMatch?.[1] || '').trim(),
      complementary: (complementaryMatch?.[1] || '').trim(),
    };
  }

  return { basic: raw, complementary: '' };
};

export const SharedDisciplinePage = () => {
  const { shareToken } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [component, setComponent] = useState<Component | null>(null);

  useEffect(() => {
    if (!shareToken) {
      setError('Link público inválido.');
      setLoading(false);
      return;
    }

    setLoading(true);
    getSharedComponentByToken(shareToken)
      .then((data) => {
        setComponent(data);
        setError('');
      })
      .catch((err) => {
        const appError = err as AppError;
        setError(appError.message || 'Não foi possível carregar a disciplina compartilhada.');
      })
      .finally(() => setLoading(false));
  }, [shareToken]);

  if (loading) {
    return <div className="panel p-10 text-center text-sm text-muted">Carregando disciplina compartilhada...</div>;
  }

  if (!component) {
    return (
      <div className="panel p-10 text-center text-sm text-muted">
        {error || 'Disciplina não disponível para compartilhamento público.'}
      </div>
    );
  }

  const references = splitReferences(component.bibliography, component.referencesBasic, component.referencesComplementary);

  return (
    <div className="space-y-6 motion-fade">
      <section className="panel overflow-hidden">
        <div className="relative p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary-100/80 via-white/25 to-secondary-500/25" />
          <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-full bg-primary-300/20 blur-3xl" />
          <div className="relative">
            <div className="mb-3 inline-flex rounded-full border border-primary-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-700 shadow-sm">
              Compartilhamento temporário
            </div>
            <div className="max-w-4xl">
              <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl md:text-4xl">{component.code} - {component.name}</h2>
              <p className="mt-3 text-sm leading-7 text-muted sm:text-base">
                Versão oficial publicada para acesso público temporário, preservando leitura institucional, contexto acadêmico e integridade do conteúdo compartilhado.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <span className="rounded-full border border-line bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink/75 shadow-sm">
                Departamento: {component.department || 'Não informado'}
              </span>
              <span className="rounded-full border border-line bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink/75 shadow-sm">
                Semestre: {component.semester || 'Não informado'}
              </span>
              <span className="rounded-full border border-line bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink/75 shadow-sm">
                Modalidade: {component.modality || 'Não informada'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <SectionCard title="Ementa">{component.syllabus || 'Não informada.'}</SectionCard>
          <SectionCard title="Conteúdo programático">{component.program || 'Não informado.'}</SectionCard>
          <SectionCard title="Objetivos">{component.objective || 'Não informados.'}</SectionCard>
          <SectionCard title="Metodologia">{component.methodology || 'Não informada.'}</SectionCard>
          <SectionCard title="Referencias basicas">{references.basic || 'Não informadas.'}</SectionCard>
          <SectionCard title="Referencias complementares">{references.complementary || 'Não informadas.'}</SectionCard>
        </div>

        <div className="space-y-6">
          <section className="panel interactive-lift overflow-hidden">
            <div className="border-b border-line bg-slate-50/70 px-5 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-ink/70">
              Carga horária
            </div>
            <div className="grid grid-cols-1 gap-3 px-5 py-5 text-sm sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl border border-line bg-slate-50 p-4 shadow-sm">
                <div className="mb-2 font-semibold text-ink">Estudante</div>
                <div>Teoria: {formatWorkload(component.workload?.studentTheory)}</div>
                <div>Prática: {formatWorkload(component.workload?.studentPractice)}</div>
                <div>T/P: {formatWorkload(component.workload?.studentTheoryPractice)}</div>
                <div>PP: {formatWorkload(component.workload?.studentPracticeInternship)}</div>
                <div>Ext: {formatWorkload(component.workload?.studentExtension)}</div>
                <div>E: {formatWorkload(component.workload?.studentInternship)}</div>
              </div>
              <div className="rounded-2xl border border-line bg-slate-50 p-4 shadow-sm">
                <div className="mb-2 font-semibold text-ink">Professor</div>
                <div>Teoria: {formatWorkload(component.workload?.teacherTheory)}</div>
                <div>Prática: {formatWorkload(component.workload?.teacherPractice)}</div>
                <div>T/P: {formatWorkload(component.workload?.teacherTheoryPractice)}</div>
                <div>PP: {formatWorkload(component.workload?.teacherPracticeInternship)}</div>
                <div>Ext: {formatWorkload(component.workload?.teacherExtension)}</div>
                <div>E: {formatWorkload(component.workload?.teacherInternship)}</div>
              </div>
            </div>
          </section>

          <section className="panel interactive-lift p-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-700/80">
              Acesso institucional
            </div>
            <p className="text-sm leading-7 text-muted">
              Para editar disciplinas, acompanhar histórico e publicar versões oficiais, acesse com sua conta institucional.
            </p>
            <div className="mt-4">
              <Link
                to="/entrar"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:bg-slate-50"
              >
                Entrar no Ementas
              </Link>
            </div>
          </section>

          <section className="panel interactive-lift overflow-hidden">
            <div className="border-b border-line bg-slate-50/70 px-5 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-ink/70">
              Leitura oficial
            </div>
            <div className="space-y-3 px-5 py-5 text-sm leading-7 text-ink/78">
              <p>Este compartilhamento exibe a versão oficial publicada do componente curricular.</p>
              <p>O conteúdo exibido não concede permissão de edição, alteração de estado ou decisão acadêmica fora do fluxo institucional autenticado.</p>
            </div>
          </section>
        </div>
      </section>

      <div className="rounded-2xl border border-primary-100 bg-primary-50/70 px-4 py-3 text-sm text-primary-800 shadow-sm">
        Este link é temporário e pode ser revogado a qualquer momento pelo responsável da publicação.
      </div>
    </div>
  );
};
