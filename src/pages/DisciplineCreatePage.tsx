import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DisciplineEditorForm } from '../components/DisciplineEditorForm';
import { DocumentImportCard } from '../components/DocumentImportCard';
import { createComponentDraft } from '../lib/api';
import { DisciplineFormValues, getDisciplineFormInitialValues, toDraftPayload } from '../lib/componentDraft';
import { AppError } from '../lib/errors';

export const DisciplineCreatePage = () => {
  const navigate = useNavigate();
  const [initialValues, setInitialValues] = useState(getDisciplineFormInitialValues());
  const [saving, setSaving] = useState(false);
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

  return (
    <div className="space-y-6">
      <section className="panel p-6 sm:p-8">
        <div className="mb-3 inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
          Cadastro completo
        </div>
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Adicionar disciplina</h1>
        <p className="mt-2 text-sm leading-7 text-muted">Crie um novo rascunho do componente curricular e, se quiser, pré-preencha os campos com importação documental.</p>
      </section>

      <DocumentImportCard onApplyPreview={setInitialValues} />

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