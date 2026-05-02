import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DisciplineEditorForm } from '../components/DisciplineEditorForm';
import { DocumentImportCard } from '../components/DocumentImportCard';
import { createComponentDraft, importComponentsFromSiac } from '../lib/api';
import { DisciplineFormValues, getDisciplineFormInitialValues, toDraftPayload } from '../lib/componentDraft';
import { AppError } from '../lib/errors';

export const DisciplineCreatePage = () => {
  const navigate = useNavigate();
  const [initialValues, setInitialValues] = useState(getDisciplineFormInitialValues());
  const [saving, setSaving] = useState(false);
  const [importingSiac, setImportingSiac] = useState(false);
  const [courseCode, setCourseCode] = useState('');
  const [semester, setSemester] = useState('');
  const [siacMessage, setSiacMessage] = useState('');
  const [error, setError] = useState('');

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
      setError('');

      await importComponentsFromSiac(Number(courseCode), Number(semester));
      setSiacMessage('Importação do SIAC concluída com sucesso. Recarregue a listagem para visualizar as disciplinas inseridas.');
    } catch (err) {
      const appError = err as AppError;
      setError(appError.message);
    } finally {
      setImportingSiac(false);
    }
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
      </section>

      <DisciplineEditorForm
        initialValues={initialValues}
        saving={saving}
        error={error}
        onCancel={() => navigate('/disciplinas')}
        onSave={handleCreate}
        onSaveAndPublish={handleCreate}
        showPublishAction={false}
      />
    </div>
  );
};