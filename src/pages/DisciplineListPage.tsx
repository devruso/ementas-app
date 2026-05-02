import { useEffect, useMemo, useState } from 'react';

import { DisciplineCard } from '../components/DisciplineCard';
import { SearchBar } from '../components/SearchBar';
import { SelectField } from '../components/SelectField';
import { getComponents } from '../lib/api';
import type { Component, ListData, ListFilter } from '../types';

const initialFilter: ListFilter = {
  page: 0,
  limit: 12,
  sortBy: 'code',
  sortOrder: 'ASC',
};

export const DisciplineListPage = () => {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ListFilter>(initialFilter);
  const [components, setComponents] = useState<ListData<Component>>({
    results: [],
    total: 0,
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilter((current) => ({ ...current, page: 0, search: search || undefined }));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    getComponents(filter)
      .then(setComponents)
      .finally(() => setLoading(false));
  }, [filter]);

  const totalPages = useMemo(() => {
    if (components.meta?.totalPages !== undefined) {
      return components.meta.totalPages;
    }

    return Math.ceil(components.total / filter.limit);
  }, [components, filter.limit]);

  return (
    <div className="space-y-6 motion-fade">
      <section className="panel interactive-lift p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-2 inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
              Catálogo acadêmico
            </div>
            <h2 className="text-xl font-semibold text-ink sm:text-2xl">Disciplinas publicadas</h2>
          </div>
          <div className="rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-600">
            {components.total} resultado(s)
          </div>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
          <SearchBar
            value={search}
            placeholder="Codigo ou nome da disciplina"
            onChange={setSearch}
          />

          <SelectField
            label="Ordenar por"
            value={filter.sortBy}
            onChange={(event) =>
              setFilter((current) => ({ ...current, page: 0, sortBy: event.target.value }))
            }
          >
            <option value="code">Codigo</option>
            <option value="name">Nome</option>
            <option value="department">Departamento</option>
            <option value="updatedAt">Atualizacao</option>
          </SelectField>

          <SelectField
            label="Direcao"
            value={filter.sortOrder}
            onChange={(event) =>
              setFilter((current) => ({
                ...current,
                page: 0,
                sortOrder: event.target.value as 'ASC' | 'DESC',
              }))
            }
          >
            <option value="ASC">Crescente</option>
            <option value="DESC">Decrescente</option>
          </SelectField>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="panel col-span-full p-10 text-center text-sm text-muted">
            Carregando disciplinas...
          </div>
        ) : components.results.length > 0 ? (
          components.results.map((component) => (
            <DisciplineCard key={component.id} component={component} />
          ))
        ) : (
          <div className="panel col-span-full p-10 text-center text-sm text-muted">
            Nenhuma disciplina encontrada para os filtros atuais.
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border border-dashed border-primary-100 bg-white/80 px-5 py-4 text-sm text-ink/80 md:flex-row md:items-center md:justify-between">
        <div>
          <strong>{components.total}</strong> disciplina(s) encontrada(s).
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={filter.page <= 0}
            onClick={() => setFilter((current) => ({ ...current, page: current.page - 1 }))}
            className="rounded-full border border-line px-4 py-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          <span>
            Pagina {filter.page + 1} de {Math.max(totalPages, 1)}
          </span>
          <button
            type="button"
            disabled={filter.page + 1 >= totalPages}
            onClick={() => setFilter((current) => ({ ...current, page: current.page + 1 }))}
            className="rounded-full border border-line px-4 py-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Proxima
          </button>
        </div>
      </section>
    </div>
  );
};