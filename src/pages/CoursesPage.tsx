import { useEffect, useMemo, useRef, useState } from 'react';

import { FormField } from '../components/FormField';
import { SearchBar } from '../components/SearchBar';
import { createCourse, deleteCourse, getCourses, updateCourse } from '../lib/api';
import { AppError } from '../lib/errors';
import type { Course, ListData, ListFilter } from '../types';

const initialFilter: ListFilter = {
  page: 0,
  limit: 10,
  sortBy: 'name',
  sortOrder: 'ASC',
};

export const CoursesPage = () => {
  const formSectionRef = useRef<HTMLElement | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ListFilter>(initialFilter);
  const [courses, setCourses] = useState<ListData<Course>>({ results: [], total: 0 });
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [editingCourseId, setEditingCourseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingCourseId, setDeletingCourseId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilter((current) => ({ ...current, page: 0, search: search || undefined }));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const totalPages = useMemo(() => {
    if (courses.meta?.totalPages !== undefined) {
      return Math.max(courses.meta.totalPages, 1);
    }

    return Math.max(Math.ceil(courses.total / filter.limit), 1);
  }, [courses, filter.limit]);

  const resetForm = () => {
    setName('');
    setCode('');
    setEditingCourseId('');
  };

  const loadCourses = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getCourses({
        page: filter.page,
        limit: filter.limit,
        search: filter.search,
        sortBy: filter.sortBy,
        sortOrder: filter.sortOrder,
      });
      setCourses(response);
    } catch (err) {
      const appError = err as AppError;
      setError(appError.message || 'Não foi possível carregar os cursos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [filter.page, filter.limit, filter.search, filter.sortBy, filter.sortOrder]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setSuccess('');
      setError('Informe o nome do curso.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (editingCourseId) {
        await updateCourse(editingCourseId, {
          name: name.trim(),
          code: code.trim() || undefined,
        });
        setSuccess('Curso atualizado com sucesso.');
      } else {
        await createCourse(name.trim(), code.trim() || undefined);
        setSuccess('Curso criado com sucesso.');
      }

      resetForm();
      await loadCourses();
    } catch (err) {
      const appError = err as AppError;
      setError(appError.message || 'Não foi possível salvar o curso.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourseId(course.id);
    setName(course.name);
    setCode(course.code || '');
    setError('');
    setSuccess('');

    formSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const handleDelete = async (course: Course) => {
    const confirmed = window.confirm(`Deseja remover o curso ${course.name}? As disciplinas serão preservadas e ficarão sem curso até serem reatribuídas.`);

    if (!confirmed) {
      return;
    }

    try {
      setDeletingCourseId(course.id);
      setError('');
      setSuccess('');
      await deleteCourse(course.id);
      setSuccess('Curso removido com sucesso.');
      await loadCourses();
    } catch (err) {
      const appError = err as AppError;
      setError(appError.message || 'Não foi possível remover o curso.');
    } finally {
      setDeletingCourseId('');
    }
  };

  return (
    <div className="space-y-6 motion-fade">
      <section ref={formSectionRef} className="panel interactive-lift p-5 sm:p-6">
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Cursos</h1>
        <p className="mt-2 text-sm leading-7 text-muted">
          Cadastro completo dos cursos associados às disciplinas.
        </p>

        {editingCourseId ? (
          <div className="mt-4 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
            Modo edição ativo. Atualize os dados do curso e clique em Salvar alterações.
          </div>
        ) : null}

        <form className="mt-5 grid gap-4 md:grid-cols-3" onSubmit={handleSubmit}>
          <FormField
            label="Nome do curso"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Bacharelado em Ciência da Computação"
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
              {saving ? 'Salvando...' : editingCourseId ? 'Salvar alterações' : 'Criar curso'}
            </button>
            {editingCourseId ? (
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
          <SearchBar value={search} placeholder="Buscar curso por nome ou código" onChange={setSearch} />
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
          <div className="px-5 pb-6 text-sm text-muted">Carregando cursos...</div>
        ) : courses.results.length === 0 ? (
          <div className="px-5 pb-6 text-sm text-muted">Nenhum curso encontrado.</div>
        ) : (
          <div className="overflow-x-auto px-5 pb-5">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-slate-50/80 text-left text-xs uppercase tracking-[0.12em] text-muted">
                  <th className="px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">Código</th>
                  <th className="px-4 py-3 font-semibold">Componentes</th>
                  <th className="px-4 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {courses.results.map((course) => (
                  <tr key={course.id} className="border-b border-line/70 text-ink">
                    <td className="px-4 py-4 font-medium">{course.name}</td>
                    <td className="px-4 py-4">{course.code || '-'}</td>
                    <td className="px-4 py-4">
                      {course.componentCount ?? 0}
                      {course.componentDraftCount ? ` / ${course.componentDraftCount} rascunho(s)` : ''}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(course)}
                          className="rounded-full border border-primary-200 bg-white px-3 py-1 font-semibold text-primary-700 transition hover:bg-primary-50"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(course)}
                          disabled={deletingCourseId === course.id}
                          className="rounded-full border border-danger/20 bg-white px-3 py-1 font-semibold text-danger transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingCourseId === course.id ? 'Removendo...' : 'Remover'}
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
          <strong>{courses.total}</strong> curso(s) encontrado(s).
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
