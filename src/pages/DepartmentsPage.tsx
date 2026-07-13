import { useEffect, useMemo, useRef, useState } from 'react';

import { FormField } from '../components/FormField';
import { SearchBar } from '../components/SearchBar';
import {
  createDepartment,
  deleteDepartment,
  getDepartments,
  updateDepartment,
} from '../lib/api';
import { AppError } from '../lib/errors';
import type { Department, ListData, ListFilter } from '../types';

const initialFilter: ListFilter = {
  page: 0,
  limit: 10,
  sortBy: 'name',
  sortOrder: 'ASC',
};

export const DepartmentsPage = () => {
  const formSectionRef = useRef<HTMLElement | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ListFilter>(initialFilter);
  const [departments, setDepartments] = useState<ListData<Department>>({ results: [], total: 0 });
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [editingDepartmentId, setEditingDepartmentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingDepartmentId, setDeletingDepartmentId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilter((current) => ({ ...current, page: 0, search: search || undefined }));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const totalPages = useMemo(() => {
    if (departments.meta?.totalPages !== undefined) {
      return Math.max(departments.meta.totalPages, 1);
    }

    return Math.max(Math.ceil(departments.total / filter.limit), 1);
  }, [departments, filter.limit]);

  const resetForm = () => {
    setName('');
    setCode('');
    setEditingDepartmentId('');
  };

  const loadDepartments = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getDepartments({
        page: filter.page,
        limit: filter.limit,
        search: filter.search,
        sortBy: filter.sortBy,
        sortOrder: filter.sortOrder,
      });
      setDepartments(response);
    } catch (err) {
      const appError = err as AppError;
      setError(appError.message || 'Nao foi possivel carregar os departamentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, [filter.page, filter.limit, filter.search, filter.sortBy, filter.sortOrder]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setSuccess('');
      setError('Informe o nome do departamento.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (editingDepartmentId) {
        await updateDepartment(editingDepartmentId, {
          name: name.trim(),
          code: code.trim() || undefined,
        });
        setSuccess('Departamento atualizado com sucesso.');
      } else {
        await createDepartment(name.trim(), code.trim() || undefined);
        setSuccess('Departamento criado com sucesso.');
      }

      resetForm();
      await loadDepartments();
    } catch (err) {
      const appError = err as AppError;
      setError(appError.message || 'Nao foi possivel salvar o departamento.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (department: Department) => {
    setEditingDepartmentId(department.id);
    setName(department.name);
    setCode(department.code || '');
    setError('');
    setSuccess('');

    formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDelete = async (department: Department) => {
    const confirmed = window.confirm(`Deseja remover o departamento ${department.name}?`);

    if (!confirmed) {
      return;
    }

    try {
      setDeletingDepartmentId(department.id);
      setError('');
      setSuccess('');
      await deleteDepartment(department.id);
      setSuccess('Departamento removido com sucesso.');
      await loadDepartments();
    } catch (err) {
      const appError = err as AppError;
      setError(appError.message || 'Nao foi possivel remover o departamento.');
    } finally {
      setDeletingDepartmentId('');
    }
  };

  return (
    <div className="space-y-6 motion-fade">
      <section ref={formSectionRef} className="panel interactive-lift p-5 sm:p-6">
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Departamentos</h1>
        <p className="mt-2 text-sm leading-7 text-muted">
          CRUD de departamentos para perfil administrativo.
        </p>

        {editingDepartmentId ? (
          <div className="mt-4 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
            Modo edição ativo. Atualize os campos e clique em Salvar alterações.
          </div>
        ) : null}

        <form className="mt-5 grid gap-4 md:grid-cols-3" onSubmit={handleSubmit}>
          <FormField
            label="Nome do departamento"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Departamento de Ciência da Computação"
            className="md:col-span-2"
          />
          <FormField
            label="Código (opcional)"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="DCC"
          />

          <div className="flex flex-wrap items-center gap-3 md:col-span-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-2xl bg-primary-500 px-5 py-3 font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Salvando...' : editingDepartmentId ? 'Salvar alterações' : 'Criar departamento'}
            </button>
            {editingDepartmentId ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center justify-center rounded-2xl border border-line bg-white px-5 py-3 font-semibold text-ink transition hover:bg-slate-50"
              >
                Cancelar edição
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="panel interactive-lift overflow-hidden">
        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
          <SearchBar value={search} placeholder="Buscar departamento por nome" onChange={setSearch} />
          <label className="flex min-w-0 w-full flex-col gap-2 text-sm font-medium text-ink">
            <span>Ordenar por</span>
            <select
              value={filter.sortBy}
              onChange={(event) => setFilter((current) => ({ ...current, page: 0, sortBy: event.target.value }))}
              className="soft-ring h-14 rounded-2xl border border-transparent bg-white px-4 text-sm text-ink shadow-panel"
            >
              <option value="name">Nome</option>
              <option value="code">Código</option>
              <option value="updatedAt">Atualização</option>
            </select>
          </label>
          <label className="flex min-w-0 w-full flex-col gap-2 text-sm font-medium text-ink">
            <span>Direção</span>
            <select
              value={filter.sortOrder}
              onChange={(event) =>
                setFilter((current) => ({
                  ...current,
                  page: 0,
                  sortOrder: event.target.value as 'ASC' | 'DESC',
                }))
              }
              className="soft-ring h-14 rounded-2xl border border-transparent bg-white px-4 text-sm text-ink shadow-panel"
            >
              <option value="ASC">Crescente</option>
              <option value="DESC">Decrescente</option>
            </select>
          </label>
        </div>

        {error ? <div className="mx-5 mb-4 rounded-2xl border border-danger/20 bg-red-50 px-4 py-3 text-sm text-danger">{error}</div> : null}
        {success ? <div className="mx-5 mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

        {loading ? (
          <div className="px-5 pb-6 text-sm text-muted">Carregando departamentos...</div>
        ) : departments.results.length === 0 ? (
          <div className="px-5 pb-6 text-sm text-muted">Nenhum departamento encontrado.</div>
        ) : (
          <div className="overflow-x-auto px-5 pb-5">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-slate-50/80 text-left text-xs uppercase tracking-[0.12em] text-muted">
                  <th className="px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">Código</th>
                  <th className="px-4 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {departments.results.map((department) => (
                  <tr key={department.id} className="border-b border-line/70 text-ink">
                    <td className="px-4 py-4 font-medium">{department.name}</td>
                    <td className="px-4 py-4">{department.code || '-'}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(department)}
                          className="rounded-full border border-primary-200 bg-white px-3 py-1 font-semibold text-primary-700 transition hover:bg-primary-50"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(department)}
                          disabled={deletingDepartmentId === department.id}
                          className="rounded-full border border-danger/20 bg-white px-3 py-1 font-semibold text-danger transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingDepartmentId === department.id ? 'Removendo...' : 'Remover'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border border-dashed border-primary-100 bg-white/80 px-5 py-4 text-sm text-ink/80 md:flex-row md:items-center md:justify-between">
        <div>
          <strong>{departments.total}</strong> departamento(s) encontrado(s).
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
            Pagina {filter.page + 1} de {totalPages}
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
