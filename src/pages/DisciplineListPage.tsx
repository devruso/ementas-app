import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

import { SearchBar } from '../components/SearchBar';
import { SelectField } from '../components/SelectField';
import { getComponents } from '../lib/api';
import { AppError } from '../lib/errors';
import type { Component, ListData, ListFilter } from '../types';

const initialFilter: ListFilter = {
  page: 0,
  limit: 12,
  sortBy: 'code',
  sortOrder: 'ASC',
};

const instituteDepartmentRegex = /(computa[cç][aã]o|pgcomp|dcc|dci)/i;

type DepartmentOption = {
  value: string;
  label: string;
  count: number;
  group: 'ic' | 'external';
};

export const DisciplineListPage = () => {
  const [search, setSearch] = useState('');
  const [academicLevelFilter, setAcademicLevelFilter] = useState<'all' | 'graduacao' | 'mestrado' | 'doutorado'>('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadingDepartmentDataset, setLoadingDepartmentDataset] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [filter, setFilter] = useState<ListFilter>(initialFilter);
  const [components, setComponents] = useState<ListData<Component>>({
    results: [],
    total: 0,
  });
  const [departmentDataset, setDepartmentDataset] = useState<Component[] | null>(null);

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
      department: departmentFilter === 'all' ? undefined : departmentFilter,
    })
      .then(setComponents)
      .catch((err) => {
        const appError = err as AppError;
        setErrorMessage(appError.message || 'Não foi possível carregar as disciplinas agora.');
      })
      .finally(() => setLoading(false));
  }, [filter, academicLevelFilter, departmentFilter]);

  useEffect(() => {
    if (departmentFilter === 'all') {
      setDepartmentDataset(null);
      setLoadingDepartmentDataset(false);
      return;
    }

    let active = true;
    const pageSize = 100;

    const loadDepartmentDataset = async () => {
      try {
        setLoadingDepartmentDataset(true);

        const dataset: Component[] = [];
        let currentPage = 0;
        let totalPages = 1;

        while (currentPage < totalPages) {
          const response = await getComponents({
            ...filter,
            page: currentPage,
            limit: pageSize,
            academicLevel: academicLevelFilter === 'all' ? undefined : academicLevelFilter,
            department: departmentFilter === 'all' ? undefined : departmentFilter,
          });

          dataset.push(...response.results);
          totalPages = response.meta?.totalPages ?? Math.max(1, Math.ceil(response.total / pageSize));
          currentPage += 1;
        }

        if (active) {
          setDepartmentDataset(dataset);
        }
      } catch (err) {
        if (active) {
          const appError = err as AppError;
          setErrorMessage(appError.message || 'Falha ao carregar os dados completos do departamento.');
          setDepartmentDataset([]);
        }
      } finally {
        if (active) {
          setLoadingDepartmentDataset(false);
        }
      }
    };

    loadDepartmentDataset();

    return () => {
      active = false;
    };
  }, [departmentFilter, academicLevelFilter, filter.search, filter.sortBy, filter.sortOrder]);

  const totalPagesFromServer = useMemo(() => {
    if (components.meta?.totalPages !== undefined) {
      return components.meta.totalPages;
    }

    return Math.max(1, Math.ceil(components.total / filter.limit));
  }, [components, filter.limit]);

  const departmentOptions = useMemo(() => {
    const values = new Map<string, number>();
    const source = departmentDataset && departmentDataset.length > 0
      ? departmentDataset
      : components.results;

    source.forEach((component) => {
      if (component.department?.trim()) {
        const normalizedDepartment = component.department.trim();
        values.set(normalizedDepartment, (values.get(normalizedDepartment) || 0) + 1);
      }
    });

    return Array.from(values.entries())
      .map(([value, count]) => ({
        value,
        count,
        group: instituteDepartmentRegex.test(value) ? 'ic' as const : 'external' as const,
        label: `${value} (${count})`,
      }))
      .sort((left, right) => {
        if (left.group !== right.group) {
          return left.group === 'ic' ? -1 : 1;
        }

        return left.value.localeCompare(right.value, 'pt-BR');
      });
  }, [components.results, departmentDataset]);

  const sourceResults = useMemo(() => {
    if (departmentFilter !== 'all') {
      return departmentDataset || [];
    }

    return components.results;
  }, [components.results, departmentDataset, departmentFilter]);

  const filteredResults = useMemo(() => {
    return sourceResults.filter((component) => {
      const matchesAcademicLevel = academicLevelFilter === 'all' || component.academicLevel === academicLevelFilter;
      const matchesDepartment = departmentFilter === 'all' || (component.department || '').trim() === departmentFilter;

      return matchesAcademicLevel && matchesDepartment;
    });
  }, [academicLevelFilter, sourceResults, departmentFilter]);

  const usingHybridDepartmentPagination = departmentFilter !== 'all';
  const displayResults = useMemo(() => {
    if (!usingHybridDepartmentPagination) {
      return filteredResults;
    }

    const start = filter.page * filter.limit;
    const end = start + filter.limit;

    return filteredResults.slice(start, end);
  }, [filter.limit, filter.page, filteredResults, usingHybridDepartmentPagination]);

  const effectiveTotal = usingHybridDepartmentPagination
    ? filteredResults.length
    : components.total;

  const effectiveTotalPages = usingHybridDepartmentPagination
    ? Math.max(1, Math.ceil(effectiveTotal / filter.limit))
    : totalPagesFromServer;

  const isLoadingGrid = loading || (usingHybridDepartmentPagination && loadingDepartmentDataset);

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
    <div className="space-y-6 motion-fade">
      <section className="panel interactive-lift p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-ink sm:text-2xl">Disciplinas publicadas</h2>
            <p className="mt-2 text-sm text-muted">Resultados exibidos em tabela. Clique nos títulos das colunas para ordenar.</p>
            {usingHybridDepartmentPagination ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                {loadingDepartmentDataset
                  ? 'Modo híbrido ativo: carregando dataset global por departamento...'
                  : `Modo híbrido ativo: paginação local na página ${filter.page + 1} sobre dataset global filtrado (${filteredResults.length} item(ns)).`}
              </div>
            ) : null}
          </div>
          <div className="rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-600">
            {effectiveTotal} resultado(s)
          </div>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.5fr)_300px]">
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
            <option value="all">Todas as unidades do catálogo</option>
            {departmentOptions.some((department) => department.group === 'ic') ? (
              <optgroup label="Instituto de Computação e programas relacionados">
                {departmentOptions
                  .filter((department) => department.group === 'ic')
                  .map((department) => (
                    <option key={department.value} value={department.value}>
                      {department.label}
                    </option>
                  ))}
              </optgroup>
            ) : null}
            {departmentOptions.some((department) => department.group === 'external') ? (
              <optgroup label="Outras unidades acadêmicas do currículo">
                {departmentOptions
                  .filter((department) => department.group === 'external')
                  .map((department) => (
                    <option key={department.value} value={department.value}>
                      {department.label}
                    </option>
                  ))}
              </optgroup>
            ) : null}
          </SelectField>
        </div>

        <div className="mt-2 grid gap-3 px-5 pb-5 md:grid-cols-1">
          <div className="rounded-2xl border border-line/70 bg-white px-3 py-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Nível acadêmico</div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'Todos' },
                { value: 'graduacao', label: 'Graduação' },
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
        ) : isLoadingGrid ? (
          <div className="p-10 text-center text-sm text-muted">
            Carregando disciplinas...
          </div>
        ) : displayResults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-slate-50/80 text-left text-xs uppercase tracking-[0.12em] text-muted">
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
                      Nome
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
                  <th className="px-4 py-3 font-semibold">Semestre</th>
                  <th className="px-4 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {displayResults.map((component) => (
                  <tr key={component.id} className="border-b border-line/70 align-top text-ink transition hover:bg-primary-50/35">
                    <td className="px-4 py-4 font-semibold text-primary-700">{component.code}</td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-ink">{component.name}</div>
                      <div className="mt-1 max-w-[56ch] text-xs text-muted">
                        {component.syllabus || component.program || 'Disciplina cadastrada sem resumo público disponível.'}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-ink/85">{component.department || 'Departamento não informado'}</td>
                    <td className="px-4 py-4 text-ink/85">{component.semester || 'Semestre não informado'}</td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        to={`/disciplinas/${component.code.toLowerCase()}`}
                        className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-3 py-1 font-semibold text-primary-700 transition hover:bg-primary-50"
                      >
                        <Eye className="h-4 w-4" />
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-muted">
            Nenhuma disciplina encontrada para os filtros atuais.
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border border-dashed border-primary-100 bg-white/80 px-5 py-4 text-sm text-ink/80 md:flex-row md:items-center md:justify-between">
        <div>
          <strong>{effectiveTotal}</strong> disciplina(s) encontrada(s).
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
            Pagina {filter.page + 1} de {Math.max(effectiveTotalPages, 1)}
          </span>
          <button
            type="button"
            disabled={filter.page + 1 >= effectiveTotalPages}
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