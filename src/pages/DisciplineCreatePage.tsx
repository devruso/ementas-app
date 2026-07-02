import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DisciplineEditorForm } from '../components/DisciplineEditorForm';
import { DocumentImportCard } from '../components/DocumentImportCard';
import {
  createComponentDraft,
  getComponentDrafts,
  getComponents,
  importComponentsFromSiac,
  importComponentsFromSigaaPublic,
} from '../lib/api';
import { DisciplineFormValues, getDisciplineFormInitialValues, toDraftPayload } from '../lib/componentDraft';
import { AppError } from '../lib/errors';
import type { Component, ImportComponentsSummary } from '../types';

export const DisciplineCreatePage = () => {
  const navigate = useNavigate();
  const [initialValues, setInitialValues] = useState(getDisciplineFormInitialValues());
  const [saving, setSaving] = useState(false);
  const [importingSiac, setImportingSiac] = useState(false);
  const [importingSigaa, setImportingSigaa] = useState(false);
  const [courseCode, setCourseCode] = useState('');
  const [semester, setSemester] = useState('');
  const [sigaaSourceType, setSigaaSourceType] = useState<'department' | 'program'>('department');
  const [sigaaSourceId, setSigaaSourceId] = useState('');
  const [sigaaAcademicLevel, setSigaaAcademicLevel] = useState<'graduacao' | 'mestrado' | 'doutorado' | 'all'>('all');
  const [sigaaSourceIdsByLevel, setSigaaSourceIdsByLevel] = useState<{
    graduacao: string;
    mestrado: string;
    doutorado: string;
  }>({ graduacao: '', mestrado: '', doutorado: '' });
  const [siacMessage, setSiacMessage] = useState('');
  const [siacSummary, setSiacSummary] = useState<ImportComponentsSummary | null>(null);
  const [sigaaSummary, setSigaaSummary] = useState<ImportComponentsSummary | null>(null);
  const [error, setError] = useState('');
  const [availablePrerequisites, setAvailablePrerequisites] = useState<Array<{ code: string; name: string }>>([]);

  useEffect(() => {
    Promise.allSettled([
      getComponents({ page: 0, limit: 300, sortBy: 'code', sortOrder: 'ASC' }),
      getComponentDrafts({ page: 0, limit: 300, sortBy: 'code', sortOrder: 'ASC' }),
    ])
      .then((results) => {
        const mapped = new Map<string, { code: string; name: string }>();

        if (results[0].status === 'fulfilled') {
          results[0].value.results.forEach((component: Component) => {
            mapped.set(component.code, { code: component.code, name: component.name });
          });
        }

        if (results[1].status === 'fulfilled') {
          results[1].value.results.forEach((draft) => {
            if (draft.code?.trim()) {
              mapped.set(draft.code, { code: draft.code, name: draft.name || 'Rascunho sem nome' });
            }
          });
        }

        setAvailablePrerequisites(Array.from(mapped.values()));
      })
      .catch(() => {
        setAvailablePrerequisites([]);
      });
  }, []);

  const handleCreate = async (values: DisciplineFormValues) => {
    try {
      setSaving(true);
      setError('');
      const draft = await createComponentDraft(toDraftPayload(values));
      navigate(`/disciplinas/${draft.code.toLowerCase()}/editar`, { replace: true });
    } catch (err) {
      const appError = err as AppError;
      setError(appError.message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleImportSiac = async () => {
    try {
      setImportingSiac(true);
      setSiacMessage('');
      setSiacSummary(null);
      setSigaaSummary(null);
      setError('');

      const summary = await importComponentsFromSiac(Number(courseCode), Number(semester));
      setSiacSummary(summary);
      setSiacMessage('Importação do SIAC concluída com sucesso. Recarregue a listagem para visualizar as disciplinas inseridas.');
    } catch (err) {
      const appError = err as AppError;
      setError(appError.message);
    } finally {
      setImportingSiac(false);
    }
  };

  const handleImportSigaa = async () => {
    try {
      setImportingSigaa(true);
      setSiacMessage('');
      setSiacSummary(null);
      setSigaaSummary(null);
      setError('');

      const summary = await importComponentsFromSigaaPublic(
        sigaaSourceType,
        sigaaSourceId.trim(),
        sigaaAcademicLevel,
        sigaaAcademicLevel === 'all'
          ? {
              graduacao: sigaaSourceIdsByLevel.graduacao.trim(),
              mestrado: sigaaSourceIdsByLevel.mestrado.trim(),
              doutorado: sigaaSourceIdsByLevel.doutorado.trim(),
            }
          : undefined
      );
      setSigaaSummary(summary);
    } catch (err) {
      const appError = err as AppError;
      setError(appError.message);
    } finally {
      setImportingSigaa(false);
    }
  };

  const renderImportSummary = (summary: ImportComponentsSummary, title: string) => {
    const categories = Object.entries(summary.failureCategories || {});

    return (
      <div className="mt-4 rounded-3xl border border-primary-100 bg-primary-50/70 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-primary-700">{title}</h3>
        <div className="mt-3 grid gap-2 text-sm text-ink sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white px-3 py-2"><strong>{summary.requested}</strong> solicitadas</div>
          <div className="rounded-2xl bg-white px-3 py-2"><strong>{summary.created}</strong> criadas</div>
          <div className="rounded-2xl bg-white px-3 py-2"><strong>{summary.skippedExisting}</strong> ja existentes</div>
          <div className="rounded-2xl bg-white px-3 py-2"><strong>{summary.failed}</strong> falhas</div>
        </div>

        {categories.length > 0 ? (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <strong>Categorias de falha:</strong>{' '}
            {categories.map(([name, count]) => `${name} (${count})`).join(', ')}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6 motion-fade">
      <section className="panel interactive-lift p-5 sm:p-8">
        <div className="mb-3 inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
          Cadastro completo
        </div>
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Adicionar disciplina</h1>
        <p className="mt-2 text-sm leading-7 text-muted">Crie um novo rascunho do componente curricular e, se quiser, pré-preencha os campos com importação documental.</p>
      </section>

      <DocumentImportCard onApplyPreview={setInitialValues} />

      <section className="panel interactive-lift min-w-0 p-5 sm:p-6">
        <div className="mb-4 inline-flex rounded-full bg-secondary-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-secondary-700">
          Importação SIAC
        </div>
        <h2 className="text-xl font-semibold text-ink">Importar disciplinas por curso e semestre</h2>
        <p className="mt-2 text-sm leading-7 text-muted">
          Fluxo legado mantido no novo frontend para acelerar carga inicial de disciplinas.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex w-full flex-col gap-2 text-sm font-medium text-ink">
            <span>Código do curso</span>
            <input
              value={courseCode}
              onChange={(event) => setCourseCode(event.target.value)}
              placeholder="Ex: 112140"
              className="soft-ring h-14 rounded-2xl border border-transparent bg-background px-4 text-sm text-ink shadow-sm"
            />
          </label>
          <label className="flex w-full flex-col gap-2 text-sm font-medium text-ink">
            <span>Semestre vigente</span>
            <input
              value={semester}
              onChange={(event) => setSemester(event.target.value)}
              placeholder="Ex: 20261"
              className="soft-ring h-14 rounded-2xl border border-transparent bg-background px-4 text-sm text-ink shadow-sm"
            />
          </label>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={handleImportSiac}
            disabled={importingSiac || !courseCode.trim() || !semester.trim()}
            className="inline-flex items-center justify-center rounded-2xl bg-secondary-500 px-5 py-3 font-semibold text-secondary-700 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {importingSiac ? 'Importando...' : 'Importar do SIAC'}
          </button>
        </div>

        {siacMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {siacMessage}
          </div>
        ) : null}

        {siacSummary ? renderImportSummary(siacSummary, 'Resumo da importacao SIAC') : null}
      </section>

      <section className="panel interactive-lift min-w-0 p-5 sm:p-6">
        <div className="mb-4 inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">
          Importação SIGAA público
        </div>
        <h2 className="text-xl font-semibold text-ink">Importar por departamento ou programa</h2>
        <p className="mt-2 text-sm leading-7 text-muted">
          Utilize o ID da fonte SIGAA e o nível acadêmico para buscar e importar em lote com telemetria de falhas.
        </p>
        <p className="mt-1 text-xs text-muted">
          Em produção, caso os IDs estejam configurados no ambiente do backend, você pode importar mesmo deixando os campos de ID em branco.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="flex w-full flex-col gap-2 text-sm font-medium text-ink">
            <span>Tipo de fonte</span>
            <select
              value={sigaaSourceType}
              onChange={(event) => setSigaaSourceType(event.target.value as 'department' | 'program')}
              className="soft-ring h-14 rounded-2xl border border-transparent bg-background px-4 text-sm text-ink shadow-sm"
            >
              <option value="department">Departamento</option>
              <option value="program">Programa</option>
            </select>
          </label>

          <label className="flex w-full flex-col gap-2 text-sm font-medium text-ink">
            <span>ID da fonte</span>
            <input
              value={sigaaSourceId}
              onChange={(event) => setSigaaSourceId(event.target.value)}
              placeholder="Ex: 1114"
              className="soft-ring h-14 rounded-2xl border border-transparent bg-background px-4 text-sm text-ink shadow-sm"
            />
          </label>

          <label className="flex w-full flex-col gap-2 text-sm font-medium text-ink">
            <span>Nível acadêmico</span>
            <select
              value={sigaaAcademicLevel}
              onChange={(event) => setSigaaAcademicLevel(event.target.value as 'graduacao' | 'mestrado' | 'doutorado' | 'all')}
              className="soft-ring h-14 rounded-2xl border border-transparent bg-background px-4 text-sm text-ink shadow-sm"
            >
              <option value="all">Todos (graduação, mestrado e doutorado)</option>
              <option value="graduacao">Graduação</option>
              <option value="mestrado">Mestrado</option>
              <option value="doutorado">Doutorado</option>
            </select>
          </label>
        </div>

        {sigaaAcademicLevel === 'all' ? (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="flex w-full flex-col gap-2 text-sm font-medium text-ink">
              <span>ID fonte para Graduação</span>
              <input
                value={sigaaSourceIdsByLevel.graduacao}
                onChange={(event) => setSigaaSourceIdsByLevel((current) => ({ ...current, graduacao: event.target.value }))}
                placeholder="Ex: 1114"
                className="soft-ring h-14 rounded-2xl border border-transparent bg-background px-4 text-sm text-ink shadow-sm"
              />
            </label>

            <label className="flex w-full flex-col gap-2 text-sm font-medium text-ink">
              <span>ID fonte para Mestrado</span>
              <input
                value={sigaaSourceIdsByLevel.mestrado}
                onChange={(event) => setSigaaSourceIdsByLevel((current) => ({ ...current, mestrado: event.target.value }))}
                placeholder="Ex: 1820"
                className="soft-ring h-14 rounded-2xl border border-transparent bg-background px-4 text-sm text-ink shadow-sm"
              />
            </label>

            <label className="flex w-full flex-col gap-2 text-sm font-medium text-ink">
              <span>ID fonte para Doutorado</span>
              <input
                value={sigaaSourceIdsByLevel.doutorado}
                onChange={(event) => setSigaaSourceIdsByLevel((current) => ({ ...current, doutorado: event.target.value }))}
                placeholder="Ex: 1821"
                className="soft-ring h-14 rounded-2xl border border-transparent bg-background px-4 text-sm text-ink shadow-sm"
              />
            </label>
          </div>
        ) : null}

        <div className="mt-4">
          <button
            type="button"
            onClick={handleImportSigaa}
            disabled={importingSigaa}
            className="inline-flex items-center justify-center rounded-2xl bg-primary-500 px-5 py-3 font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {importingSigaa ? 'Importando...' : 'Importar do SIGAA público'}
          </button>
        </div>

        {sigaaSummary ? renderImportSummary(sigaaSummary, 'Resumo da importacao SIGAA público') : null}
      </section>

      <DisciplineEditorForm
        initialValues={initialValues}
        saving={saving}
        error={error}
        availablePrerequisites={availablePrerequisites}
        onCancel={() => navigate('/disciplinas')}
        onSave={handleCreate}
        onSaveAndPublish={handleCreate}
        showPublishAction={false}
      />
    </div>
  );
};