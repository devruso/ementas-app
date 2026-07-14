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

const normalizeText = (value?: string) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

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

const formatSemesterLabel = (value?: string) => {
  const normalized = normalizeText(value);
  return normalized || 'Semestre nao informado';
};

const formatDepartmentDisplay = (value?: string) => {
  const normalized = normalizeText(value);

  if (!normalized) {
    return {
      eyebrow: 'Departamento',
      value: 'Nao informado',
    };
  }

  if (/^programa sigaa$/i.test(normalized)) {
    return {
      eyebrow: 'Origem',
      value: 'SIGAA publico',
    };
  }

  return {
    eyebrow: 'Departamento',
    value: normalized,
  };
};

const formatSummary = (component: Component) => {
  const rawSummary = normalizeText(component.syllabus || component.program);

  if (!rawSummary) {
    return 'Resumo academico indisponivel na fonte publica.';
  }

  const cleanedSummary = rawSummary
    .replace(/^\/?\s*descri[cç][aã]o\s*:\s*/i, '')
    .replace(/^ementa\s*:\s*/i, '')
    .replace(/^conte[uú]do program[aá]tico\s*:\s*/i, '')
    .trim();

  if (
    !cleanedSummary ||
    /nao informado pela fonte/i.test(cleanedSummary) ||
    /nao disponivel/i.test(cleanedSummary)
  ) {
    return 'Resumo academico indisponivel na fonte publica.';
  }

  return cleanedSummary;
};

const levelAccentClassMap: Record<string, string> = {
  graduacao: 'from-emerald-400 via-teal-500 to-cyan-500',
  mestrado: 'from-sky-400 via-blue-500 to-indigo-500',
  doutorado: 'from-amber-400 via-orange-500 to-red-400',
  default: 'from-slate-300 via-slate-400 to-slate-500',
};

const getLevelAccentClass = (value?: Component['academicLevel']) => {
  if (value && levelAccentClassMap[value]) {
    return levelAccentClassMap[value];
  }

  return levelAccentClassMap.default;
};

type PaginationToken = number | 'ellipsis';

type SortOption = {
  key: NonNullable<ListFilter['sortBy']>;
  label: string;
};

const sortOptions: SortOption[] = [
  { key: 'name', label: 'Disciplina' },
  { key: 'code', label: 'Codigo' },
  { key: 'department', label: 'Departamento' },
];

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

  const effectiveTotalPages = useMemo(() => {
    if (components.meta?.totalPages !== undefined) {
      return Math.max(components.meta.totalPages, 1);
    }

    return Math.max(1, Math.ceil(components.total / filter.limit));
  }, [components, filter.limit]);

  const effectiveTotal = components.total;
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

  const renderSkeletonList = () => (
    <div className="space-y-3 p-3 sm:p-4">
      {Array.from({ length: Math.min(6, filter.limit) }, (_, index) => (
        <div
          key={`row-skeleton-${index}`}
          className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.35)]"
        >
          <div className="animate-pulse p-4 md:p-5">
            <div className="grid gap-4 md:grid-cols-[110px_minmax(0,2.2fr)_170px_130px_150px_132px] md:items-center">
              <div className="h-10 w-24 rounded-full bg-slate-200" />
              <div>
                <div className="h-4 w-10/12 rounded bg-slate-200" />
                <div className="mt-3 h-3 w-8/12 rounded bg-slate-100" />
              </div>
              <div className="h-10 w-full rounded-2xl bg-slate-100" />
              <div className="h-8 w-24 rounded-full bg-slate-100" />
              <div className="h-10 w-full rounded-2xl bg-slate-100" />
              <div className="h-11 w-full rounded-2xl bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderDisciplineRow = (component: Component) => {
    const department = formatDepartmentDisplay(component.department);
    const summary = formatSummary(component);
    const academicLevelLabel = formatAcademicLevelLabel(component.academicLevel);
    const semesterLabel = formatSemesterLabel(component.semester);
    const levelAccentClass = getLevelAccentClass(component.academicLevel);

    return (
      <article
        key={component.id}
        className="group relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,1)_0%,rgba(248,251,255,0.98)_58%,rgba(242,246,251,0.96)_100%)] shadow-[0_18px_44px_-34px_rgba(15,23,42,0.42)] transition duration-300 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-[0_24px_56px_-34px_rgba(37,99,235,0.28)]"
      >
        <div className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${levelAccentClass}`} />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

        <div className="grid gap-4 p-4 pl-5 md:grid-cols-[110px_minmax(0,2.2fr)_170px_130px_150px_132px] md:items-center md:gap-5 md:p-5 md:pl-6">
          <div className="flex items-center gap-3 md:block">
            <span className="inline-flex rounded-full border border-primary-200 bg-white/90 px-4 py-2 text-sm font-semibold tracking-[0.08em] text-primary-700 shadow-sm">
              {component.code}
            </span>
          </div>

          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-600/70">
              Disciplina
            </div>
            <h3 className="mt-1 text-base font-semibold leading-6 text-slate-900 md:text-[1.05rem]">
              {component.name}
            </h3>
            <p className="mt-2 max-w-[50ch] line-clamp-2 text-sm leading-6 text-slate-500">
              {summary}
            </p>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {department.eyebrow}
            </div>
            <div className="mt-1 text-sm font-medium leading-5 text-slate-700">
              {department.value}
            </div>
          </div>

          <div className="flex items-center md:justify-center">
            <span className="inline-flex rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
              {academicLevelLabel}
            </span>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Semestre
            </div>
            <div className="mt-1 text-sm font-medium leading-5 text-slate-700">
              {semesterLabel}
            </div>
          </div>

          <div className="md:flex md:justify-end">
            <Link
              to={`/disciplinas/${component.code.toLowerCase()}`}
              className="inline-flex h-11 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 md:w-[132px]"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-hover:bg-primary-100 group-hover:text-primary-700">
                <Eye className="h-4 w-4" />
              </span>
              <span className="truncate">Abrir</span>
            </Link>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 motion-fade">
      <section className="panel overflow-hidden">
        <div className="border-b border-line/70 bg-[linear-gradient(180deg,rgba(248,251,255,0.95),rgba(255,255,255,0.92))] p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary-600/70">
                Catalogo publico
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Disciplinas publicadas</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                Busca, filtros e listagem com leitura mais limpa. Menos ruído visual, menos texto bruto e mais foco no que importa.
              </p>
            </div>

            <label className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-sm sm:text-sm">
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
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 outline-none transition focus:border-primary-300"
              >
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_300px]">
            <SearchBar
              value={search}
              label="Buscar por codigo ou nome"
              placeholder="Ex.: IC0009 ou topicos em computacao"
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
              <option value={DEPARTMENT_DCC}>Ciencia da Computacao</option>
              <option value={DEPARTMENT_DCI}>Computacao Interdisciplinar</option>
            </SelectField>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
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
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                  academicLevelFilter === item.value
                    ? 'border-primary-300 bg-primary-500 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-primary-200 hover:text-primary-700',
                ].join(' ')}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {errorMessage ? (
          <div className="border-t border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : (
          <>
            <div className="border-t border-line/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.88))] px-3 py-3 sm:px-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    {effectiveTotal} disciplina(s) encontradas
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Pagina {filter.page + 1} de {effectiveTotalPages} · Mostrando {pageStart} - {pageEnd}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Ordenar por
                  </span>
                  {sortOptions.map((option) => {
                    const isActive = filter.sortBy === option.key;

                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => toggleSort(option.key)}
                        className={[
                          'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                          isActive
                            ? 'border-primary-300 bg-primary-50 text-primary-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-primary-200 hover:text-primary-700',
                        ].join(' ')}
                      >
                        {option.label}
                        <SortIcon sortBy={option.key} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {loading ? (
              renderSkeletonList()
            ) : displayResults.length > 0 ? (
              <div className="space-y-3 p-3 sm:p-4">
                {displayResults.map(renderDisciplineRow)}
              </div>
            ) : (
              <div className="p-10 text-center text-sm text-slate-500">
                Nenhuma disciplina encontrada para os filtros atuais.
              </div>
            )}
          </>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-3xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.9))] px-4 py-4 text-sm text-slate-700 shadow-panel md:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <strong>{effectiveTotal}</strong> disciplina(s) encontrada(s).
          </div>
          <div className="text-xs text-slate-500 sm:text-sm">
            Mostrando {pageStart} - {pageEnd} de {effectiveTotal}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={filter.page <= 0}
            onClick={() => setFilter((current) => ({ ...current, page: current.page - 1 }))}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-slate-400"
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
                      : 'border-slate-200 bg-white text-slate-700 hover:border-primary-200 hover:bg-primary-50',
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
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Proxima
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
