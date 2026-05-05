import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { SectionCard } from '../components/SectionCard';
import { getSharedComponentByToken } from '../lib/api';
import { AppError } from '../lib/errors';
import { formatWorkload } from '../lib/format';
import type { Component } from '../types';

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

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="mb-3 inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
          Compartilhamento temporário
        </div>
        <h2 className="text-2xl font-semibold text-ink">{component.code} - {component.name}</h2>
        <p className="mt-2 text-sm text-muted">
          Versão oficial publicada para acesso público temporário.
        </p>
      </section>

      <SectionCard title="Ementa">{component.syllabus || 'Não informada.'}</SectionCard>
      <SectionCard title="Conteúdo programático">{component.program || 'Não informado.'}</SectionCard>
      <SectionCard title="Objetivos">{component.objective || 'Não informados.'}</SectionCard>
      <SectionCard title="Metodologia">{component.methodology || 'Não informada.'}</SectionCard>
      <SectionCard title="Bibliografia">{component.bibliography || 'Não informada.'}</SectionCard>

      <SectionCard title="Carga horária">
        <div>Estudante (Teoria): {formatWorkload(component.workload?.studentTheory)}</div>
        <div>Estudante (Prática): {formatWorkload(component.workload?.studentPractice)}</div>
        <div>Professor (Teoria): {formatWorkload(component.workload?.teacherTheory)}</div>
        <div>Professor (Prática): {formatWorkload(component.workload?.teacherPractice)}</div>
      </SectionCard>

      <div className="flex justify-end">
        <Link
          to="/entrar"
          className="inline-flex items-center justify-center rounded-2xl border border-line px-5 py-3 text-sm font-semibold text-ink transition hover:bg-slate-50"
        >
          Entrar no BDCP
        </Link>
      </div>
    </div>
  );
};
