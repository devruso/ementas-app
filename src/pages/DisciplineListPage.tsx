import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Eye, MoreHorizontal } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import { SearchBar } from '../components/SearchBar';
import { SelectField } from '../components/SelectField';
import { getComponents } from '../lib/api';
import { AppError } from '../lib/errors';
import type { Component, ListData, ListFilter } from '../types';

const initialFilter: ListFilter = {
  page: 0,
  limit: 20,
  sortBy: 'name',
  sortOrder: 'ASC',
};

const pageSizeOptions = [20, 50, 100] as const;
const DEPARTMENT_ALL = '__all__';
const DEPARTMENT_DCC = '__dcc__';
const DEPARTMENT_DCI = '__dci__';

const parseDepartmentFilter = (value: string | null) => {
  if (!value || value === DEPARTMENT_ALL) {
    return DEPARTMENT_ALL;
  }

  if (value === DEPARTMENT_DCC || value === DEPARTMENT_DCI) {
    return value;
  }

  const normalizedValue = String(value || '').trim().toLowerCase();

  if (normalizedValue.includes('interdisciplinar') || normalizedValue.includes('dci')) {
    return DEPARTMENT_DCI;
  }

  if (normalizedValue.includes('computacao') || normalizedValue.includes('dcc')) {
    return DEPARTMENT_DCC;
  }

  return DEPARTMENT_ALL;
};

const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseSortBy = (value: string | null): NonNullable<ListFilter['sortBy']> => {
  if (value === 'name' || value === 'department' || value === 'code') {
    return value;
  }

  return 'name';
};

const parseSortOrder = (value: string | null): NonNullable<ListFilter['sortOrder']> => {
  return value === 'DESC' ? 'DESC' : 'ASC';
};

const parseAcademicLevel = (value: string | null): 'all' | 'graduacao' | 'mestrado' | 'doutorado' => {
  if (value === 'graduacao' || value === 'mestrado' || value === 'doutorado') {
    return value;
  }

  return 'all';
};

const parsePageSize = (value: string | null): number => {
  const parsed = Number(value);

  if (Number.isInteger(parsed) && pageSizeOptions.includes(parsed as typeof pageSizeOptions[number])) {
    return parsed;
  }

  return initialFilter.limit;
};

const formatAcademicLevelLabel = (value?: Component['academicLevel']) => {
  if (value === 'graduacao') {
    return 'Graduacao';
  }

  if (value === 'mestrado') {
    return 'Mestrado';
  }

  if (value === 'doutorado') {
    return 'Doutorado';
  }

  return 'Nao informado';
};

type PaginationToken = number | 'ellipsis';

export const DisciplineListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSearch = searchParams.get('q') || '';
  const initialAcademicLevel = parseAcademicLevel(searchParams.get('level'));
  const initialDepartment = parseDepartmentFilter(searchParams.get('department'));
  const initialLimit = parsePageSize(searchParams.get('limit'));
  const initialPage = Math.max(0, parsePositiveInt(searchParams.get('page'), 1) - 1);
  const initialSortBy = parseSortBy(searchParams.get('sortBy'));
  const initialSortOrder = parseSortOrder(searchParams.get('sortOrder'));

  const [search, setSearch] = useState(initialSearch);
  const [academicLevelFilter, setAcademicLevelFilter] = useState<'all' | 'graduacao' | 'mestrado' | 'doutorado'>(initialAcademicLevel);
  const [departmentFilter, setDepartmentFilter] = useState(initialDepartment);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [filter, setFilter] = useState<ListFilter>({
    ...initialFilter,
    page: initialPage,
    limit: initialLimit,
    sortBy: initialSortBy,
    sortOrder: initialSortOrder,
    search: initialSearch || undefined,
  });
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
    setErrorMessage('');
    getComponents({
      ...filter,
      academicLevel: academicLevelFilter === 'all' ? undefined : academicLevelFilter,
      department: departmentFilter === DEPARTMENT_ALL ? undefined : departmentFilter,
    })
      .then(setComponents)
      .catch((err) => {
        const appError = err as AppError;
        setErrorMessage(appError.message || 'Nao foi possivel carregar as disciplinas agora.');
      })
      .finally(() => setLoading(false));
  }, [filter, academicLevelFilter, departmentFilter]);

  const totalPagesFromServer = useMemo(() => {
    if (components.meta?.totalPages !== undefined) {
      return Math.max(components.meta.totalPages, 1);
    }

    return Math.max(1, Math.ceil(components.total / filter.limit));
  }, [components, filter.limit]);

  const effectiveTotal = components.total;
  const effectiveTotalPages = totalPagesFromServer;
  const displayResults = components.results;

  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (search) {
      nextParams.set('q', search);
    }

    if (academicLevelFilter !== 'all') {
      nextParams.set('level', academicLevelFilter);
    }

    if (departmentFilter !== DEPARTMENT_ALL) {
      nextParams.set('department', departmentFilter);
    }

    if (filter.page > 0) {
      nextParams.set('page', String(filter.page + 1));
    }

    if (filter.limit !== initialFilter.limit) {
      nextParams.set('limit', String(filter.limit));
    }

    if (filter.sortBy && filter.sortBy !== initialFilter.sortBy) {
      nextParams.set('sortBy', filter.sortBy);
    }

    if (filter.sortOrder && filter.sortOrder !== initialFilter.sortOrder) {
      nextParams.set('sortOrder', filter.sortOrder);
    }

    if (searchParams.toString() !== nextParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    academicLevelFilter,
    departmentFilter,
    filter.limit,
    filter.page,
    filter.sortBy,
    filter.sortOrder,
    search,
    searchParams,
    setSearchParams,
  ]);

  useEffect(() => {
    setFilter((current) => {
      const maxPage = Math.max(0, effectiveTotalPages - 1);

      if (current.page <= maxPage) {
        return current;
      }

      return {
        ...current,
        page: maxPage,
      };
    });
  }, [effectiveTotalPages]);

  const paginationTokens = useMemo<PaginationToken[]>(() => {
    const totalPages = Math.max(1, effectiveTotalPages);
    const currentPage = Math.min(filter.page, totalPages - 1);

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index);
    }

    const visiblePages = new Set<number>([0, totalPages - 1, currentPage]);

    if (currentPage - 1 > 0) {
      visiblePages.add(currentPage - 1);
    }

    if (currentPage + 1 < totalPages - 1) {
      visiblePages.add(currentPage + 1);
    }

    if (currentPage <= 1) {
      visiblePages.add(1);
      visiblePages.add(2);
    }

    if (currentPage >= totalPages - 2) {
      visiblePages.add(totalPages - 2);
      visiblePages.add(totalPages - 3);
    }

    const orderedPages = Array.from(visiblePages)
      .filter((page) => page >= 0 && page < totalPages)
      .sort((left, right) => left - right);

    const tokens: PaginationToken[] = [];
    orderedPages.forEach((page, index) => {
      if (index > 0 && page - orderedPages[index - 1] > 1) {
        tokens.push('ellipsis');
      }

      tokens.push(page);
    });

    return tokens;
  }, [effectiveTotalPages, filter.page]);

  const pageStart = effectiveTotal === 0 ? 0 : (filter.page * filter.limit) + 1;
  const pageEnd = Math.min(effectiveTotal, (filter.page + 1) * filter.limit);

  const toggleSort = (sortBy: NonNullable<ListFilter['sortBy']>) => {
    setFilter((current) => {
      if (current.sortBy === sortBy) {
        return {
          ...current,
          page: 0,
          sortOrder: current.sortOrder === 'ASC' ? 'DESC' : 'ASC',
        };
      }

      return {
        ...current,
        page: 0,
        sortBy,
        sortOrder: 'ASC',
      };
    });
  };

  const SortIcon = ({ sortBy }: { sortBy: NonNullable<ListFilter['sortBy']> }) => {
    if (filter.sortBy !== sortBy) {
      return <ArrowUpDown className="h-4 w-4 text-muted" />;
    }

    return filter.sortOrder === 'ASC'
      ? <ArrowUp className="h-4 w-4 text-primary-700" />
      : <ArrowDown className="h-4 w-4 text-primary-700" />;
  };

  return (
    <div className="space-y-4 sm:space-y-6 motion-fade">
      <section className="panel interactive-lift p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-ink">Disciplinas publicadas</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">
              Catalogo publico com busca, filtros e paginacao real. A visualizacao agora mostra os resultados completos sem scroll preso dentro da tabela.
            </p>
          </div>

          <label className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-xs text-ink/80 sm:text-sm">
            Itens por pagina
            <select
              aria-label="Itens por página"
              value={filter.limit}
              onChange={(event) => {
                const nextLimit = Number(event.target.value);

                if (!Number.isNaN(nextLimit)) {
                  setFilter((current) => ({
                    ...current,
                    page: 0,
                    limit: nextLimit,
                  }));
                }
              }}
              className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-ink outline-none transition focus:border-primary-300"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 p-1 pt-4 sm:gap-4 sm:p-5 lg:grid-cols-[minmax(0,1.5fr)_300px]">
          <SearchBar
            value={search}
            label="Buscar por código ou nome"
            placeholder="Ex.: IC0009 ou tópicos em computação"
            onChange={setSearch}
          />

          <SelectField
            label="Departamento"
            value={departmentFilter}
            onChange={(event) => {
              setFilter((current) => ({ ...current, page: 0 }));
              setDepartmentFilter(event.target.value);
            }}
          >
            <option value={DEPARTMENT_ALL}>Todos os departamentos</option>
            <option value={DEPARTMENT_DCC}>Ciência da Computação</option>
            <option value={DEPARTMENT_DCI}>Computação Interdisciplinar</option>
          </SelectField>
        </div>

        <div className="mt-2 grid gap-3 px-1 pb-1 sm:px-5 sm:pb-5">
          <div className="rounded-2xl border border-line/70 bg-white px-3 py-3 sm:px-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Nível acadêmico</div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'Todos' },
                { value: 'graduacao', label: 'Graduacao' },
                { value: 'mestrado', label: 'Mestrado' },
                { value: 'doutorado', label: 'Doutorado' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setFilter((current) => ({ ...current, page: 0 }));
                    setAcademicLevelFilter(item.value as 'all' | 'graduacao' | 'mestrado' | 'doutorado');
                  }}
                  className={[
                    'rounded-full border px-3 py-1 text-xs font-semibold transition',
                    academicLevelFilter === item.value
                      ? 'border-primary-300 bg-primary-500 text-white'
                      : 'border-line bg-white text-ink hover:border-primary-200',
                  ].join(' ')}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        {errorMessage ? (
          <div className="border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : loading ? (
          <div className="p-3 sm:p-5">
            <div className="overflow-hidden rounded-2xl border border-line/70 bg-white">
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[980px] w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line/80 bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-muted">
                      {['Código', 'Disciplina', 'Departamento', 'Nível', 'Semestre', 'Ações'].map((label) => (
                        <th key={label} className="px-4 py-3 font-semibold">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.min(8, filter.limit) }, (_, index) => (
                      <tr key={`skeleton-${index}`} className="animate-pulse border-b border-line/70 align-top">
                        <td className="px-4 py-4"><div className="h-6 w-20 rounded-full bg-slate-200" /></td>
                        <td className="px-4 py-4">
                          <div className="h-4 w-11/12 rounded bg-slate-200" />
                          <div className="mt-2 h-3 w-9/12 rounded bg-slate-100" />
                        </td>
                        <td className="px-4 py-4"><div className="h-4 w-10/12 rounded bg-slate-200" /></td>
                        <td className="px-4 py-4"><div className="h-4 w-20 rounded bg-slate-200" /></td>
                        <td className="px-4 py-4"><div className="h-4 w-28 rounded bg-slate-200" /></td>
                        <td className="px-4 py-4"><div className="ml-auto h-9 w-36 rounded-full bg-slate-200" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-line/70 md:hidden">
                {Array.from({ length: Math.min(6, filter.limit) }, (_, index) => (
                  <div key={`mobile-skeleton-${index}`} className="animate-pulse p-4">
                    <div className="h-5 w-20 rounded-full bg-slate-200" />
                    <div className="mt-3 h-4 w-10/12 rounded bg-slate-200" />
                    <div className="mt-2 h-3 w-8/12 rounded bg-slate-100" />
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="h-9 rounded-xl bg-slate-100" />
                      <div className="h-9 rounded-xl bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : displayResults.length > 0 ? (
          <div className="p-3 sm:p-5">
            <div className="overflow-hidden rounded-2xl border border-line/70 bg-white">
              <div className="border-b border-line/70 bg-slate-50 px-4 py-3 text-sm text-ink/75">
                {effectiveTotal} disciplina(s) encontradas. Pagina {filter.page + 1} de {effectiveTotalPages}.
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[980px] w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line/80 bg-white text-left text-xs uppercase tracking-[0.12em] text-muted">
                      <th className="px-4 py-3 font-semibold">
                        <button
                          type="button"
                          onClick={() => toggleSort('code')}
                          className="inline-flex items-center gap-2 font-semibold text-muted transition hover:text-primary-700"
                        >
                          Código
                          <SortIcon sortBy="code" />
                        </button>
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        <button
                          type="button"
                          onClick={() => toggleSort('name')}
                          className="inline-flex items-center gap-2 font-semibold text-muted transition hover:text-primary-700"
                        >
                          Disciplina
                          <SortIcon sortBy="name" />
                        </button>
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        <button
                          type="button"
                          onClick={() => toggleSort('department')}
                          className="inline-flex items-center gap-2 font-semibold text-muted transition hover:text-primary-700"
                        >
                          Departamento
                          <SortIcon sortBy="department" />
                        </button>
                      </th>
                      <th className="px-4 py-3 font-semibold">Nível</th>
                      <th className="px-4 py-3 font-semibold">Semestre</th>
                      <th className="px-4 py-3 text-right font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayResults.map((component) => (
                      <tr key={component.id} className="border-b border-line/70 align-top text-ink transition hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <span className="rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                            {component.code}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-ink">{component.name}</div>
                          <div className="mt-1 max-w-[56ch] line-clamp-2 text-xs leading-6 text-muted">
                            {component.syllabus || component.program || 'Disciplina cadastrada sem resumo público disponível.'}
                          </div>
                        </td>
                        <td className="max-w-[30ch] px-4 py-4 text-sm text-ink/90">
                          {component.department || 'Não informado'}
                        </td>
                        <td className="px-4 py-4 text-sm text-ink/85">
                          <span className="rounded-full border border-line bg-slate-50 px-3 py-1 text-xs font-semibold text-ink/80">
                            {formatAcademicLevelLabel(component.academicLevel)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-ink/85">
                          {component.semester || 'Semestre não informado'}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Link
                            to={`/disciplinas/${component.code.toLowerCase()}`}
                            className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-4 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-50"
                          >
                            <Eye className="h-4 w-4" />
                            Abrir disciplina
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-line/70 md:hidden">
                {displayResults.map((component) => (
                  <Link
                    key={component.id}
                    to={`/disciplinas/${component.code.toLowerCase()}`}
                    className="block p-4 transition hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="inline-flex rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                          {component.code}
                        </div>
                        <h3 className="mt-3 text-base font-semibold leading-6 text-ink">{component.name}</h3>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
                          {component.syllabus || component.program || 'Disciplina cadastrada sem resumo público disponível.'}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-ink/80">
                        {formatAcademicLevelLabel(component.academicLevel)}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-ink/75">
                      <div><strong>Departamento:</strong> {component.department || 'Não informado'}</div>
                      <div><strong>Semestre:</strong> {component.semester || 'Semestre não informado'}</div>
                    </div>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-700">
                      <Eye className="h-4 w-4" />
                      Abrir disciplina
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-muted">
            Nenhuma disciplina encontrada para os filtros atuais.
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-3xl border border-dashed border-primary-100 bg-white/80 px-4 py-4 text-sm text-ink/80 md:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <strong>{effectiveTotal}</strong> disciplina(s) encontrada(s).
          </div>
          <div className="text-xs text-muted sm:text-sm">
            Mostrando {pageStart} - {pageEnd} de {effectiveTotal}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={filter.page <= 0}
            onClick={() => setFilter((current) => ({ ...current, page: current.page - 1 }))}
            className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          <div className="flex flex-wrap items-center gap-1">
            {paginationTokens.map((token, index) => {
              if (token === 'ellipsis') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-muted"
                    aria-hidden="true"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </span>
                );
              }

              const isActive = token === filter.page;
              return (
                <button
                  key={token}
                  type="button"
                  onClick={() => setFilter((current) => ({ ...current, page: token }))}
                  aria-label={`Ir para página ${token + 1}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-sm font-semibold transition',
                    isActive
                      ? 'border-primary-300 bg-primary-500 text-white shadow-sm'
                      : 'border-line bg-white text-ink hover:border-primary-200 hover:bg-primary-50',
                  ].join(' ')}
                >
                  {token + 1}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={filter.page + 1 >= effectiveTotalPages}
            onClick={() => setFilter((current) => ({ ...current, page: current.page + 1 }))}
            className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
