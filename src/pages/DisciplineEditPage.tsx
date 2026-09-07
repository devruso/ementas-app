import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { focusDisciplineField } from '../lib/pendingFields';

import { ApproveDraftDialog } from '../components/ApproveDraftDialog';
import { DisciplineEditorForm } from '../components/DisciplineEditorForm';
import { ErrorNotice } from '../components/ErrorNotice';
import { approveComponentDraft, getComponentDraftByCode, getComponentMetadata, getDraftPublicationContext, updateComponentDraft } from '../lib/api';
import { ApiErrorCode } from '../lib/apiErrorCatalog';
import { DisciplineFormValues, getDisciplineFormInitialValues, toDraftPayload } from '../lib/componentDraft';
import { AppError } from '../lib/errors';
import type { ComponentDraft, ComponentMetadata, PublicationContext } from '../types';

export const DisciplineEditPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { componentCode } = useParams();
  const [draft, setDraft] = useState<ComponentDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState<AppError | null>(null);
  const [publicationContext, setPublicationContext] = useState<PublicationContext | null>(null);
  const [loadingPublicationContext, setLoadingPublicationContext] = useState(false);
  const [approvalPassword, setApprovalPassword] = useState('');
  const [liveValues, setLiveValues] = useState<DisciplineFormValues | null>(null);
  const [lastSavedPayload, setLastSavedPayload] = useState('');
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [componentMetadata, setComponentMetadata] = useState<ComponentMetadata | null>(null);
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const saveDraft = (id: string, payload: Partial<ComponentDraft>) => {
    const operation = saveQueue.current.then(() => updateComponentDraft(id, payload));
    saveQueue.current = operation.catch(() => undefined);
    return operation;
  };

  const code = useMemo(() => componentCode?.toUpperCase() || '', [componentCode]);
  useEffect(() => {
    if (!loading && !dialogOpen && searchParams.get('campo')) focusDisciplineField(searchParams.get('campo')!);
  }, [loading, dialogOpen, searchParams]);
  const initialFormValues = useMemo(
    () => getDisciplineFormInitialValues(draft || undefined, {
      modality: componentMetadata?.defaults.modality,
      academicLevel: componentMetadata?.defaults.academicLevel,
    }),
    [componentMetadata, draft]
  );

  const loadDraft = async () => {
    if (!code) {
      navigate('/disciplinas', { replace: true });
      return;
    }

    const [currentDraft, metadata] = await Promise.all([
      getComponentDraftByCode(code),
      getComponentMetadata().catch(() => null),
    ]);

    setDraft(currentDraft);
    setLastSavedPayload(JSON.stringify(toDraftPayload(getDisciplineFormInitialValues(currentDraft, {
      modality: metadata?.defaults.modality,
      academicLevel: metadata?.defaults.academicLevel,
    }))));
    setComponentMetadata(metadata);

  };

  useEffect(() => {
    setLoading(true);
    loadDraft()
      .catch((err) => {
        const appError = err as AppError;
        setError(appError);
      })
      .finally(() => setLoading(false));
  }, [code]);

  useEffect(() => {
    if (!draft?.id || !liveValues || saving || dialogOpen) {
      return;
    }

    const nextPayload = toDraftPayload(liveValues);
    const serializedPayload = JSON.stringify(nextPayload);

    if (!serializedPayload || serializedPayload === lastSavedPayload) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setAutosaveStatus('saving');
        await saveDraft(draft.id, nextPayload);
        setLastSavedPayload(serializedPayload);
        setAutosaveStatus('saved');
      } catch (err) {
        const appError = err as AppError;
        setError(appError);
        setAutosaveStatus('error');
      }
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [dialogOpen, draft?.id, lastSavedPayload, liveValues, saving]);

  const handleSave = async (values: DisciplineFormValues) => {
    if (!draft?.id) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const updatedDraft = await saveDraft(draft.id, toDraftPayload(values));
      setDraft(updatedDraft);
      navigate(`/disciplinas/${updatedDraft.code.toLowerCase()}`);
    } catch (err) {
      const appError = err as AppError;
      setError(appError);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndPublish = async (values: DisciplineFormValues) => {
    if (!draft?.id) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const updatedDraft = await saveDraft(draft.id, toDraftPayload(values));
      setDraft(updatedDraft);
      setDialogError(null);
      setPublicationContext(null);
      setApprovalPassword('');
      setDialogOpen(true);
      setLoadingPublicationContext(true);

      try {
        setPublicationContext(await getDraftPublicationContext(updatedDraft.id));
      } catch (contextError) {
        setDialogError(contextError as AppError);
      } finally {
        setLoadingPublicationContext(false);
      }
    } catch (err) {
      const appError = err as AppError;
      setError(appError);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!draft?.id) {
      return;
    }

    if (!approvalPassword) {
      setDialogError(new AppError('Informe sua senha para confirmar a publicação.', 400, {
        code: ApiErrorCode.PUBLICATION_PASSWORD_REQUIRED,
        reason: 'A publicação oficial exige uma segunda confirmação de identidade.',
        recovery: 'Digite a mesma senha usada para entrar no sistema.',
      }));
      return;
    }

    try {
      setSaving(true);
      setDialogError(null);
      await approveComponentDraft(draft.id, {
        password: approvalPassword,
      });

      setDialogOpen(false);
      navigate(`/disciplinas/${draft.code.toLowerCase()}`);
    } catch (err) {
      const appError = err as AppError;
      setDialogError(appError);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="panel p-10 text-center text-sm text-muted">Carregando rascunho da disciplina...</div>;
  }

  if (!draft) {
    return <div className="panel p-10 text-center text-sm text-muted">Rascunho nao encontrado.</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Editar disciplina</h1>
      <p role="status" className="text-xs font-medium text-muted">
          {autosaveStatus === 'saving' && 'Salvando automaticamente...'}
          {autosaveStatus === 'saved' && 'Rascunho sincronizado automaticamente.'}
          {autosaveStatus === 'error' && 'Falha no autosave. Tente salvar manualmente.'}
        </p>


      <ErrorNotice error={error} />

      <DisciplineEditorForm
        initialValues={initialFormValues}
        saving={saving}
        error={error?.message || ''}
        modalityOptions={componentMetadata?.modalities}
        academicLevelOptions={componentMetadata?.academicLevels}
        courseOptions={componentMetadata?.courses}
        onCancel={() => navigate(`/disciplinas/${draft.code.toLowerCase()}`)}
        onSave={handleSave}
        onSaveAndPublish={handleSaveAndPublish}
        onValuesChange={setLiveValues}
      />

      <ApproveDraftDialog
        open={dialogOpen}
        componentCode={draft.code}
        context={publicationContext}
        password={approvalPassword}
        loadingContext={loadingPublicationContext}
        submitting={saving}
        error={dialogError}
        onChangePassword={setApprovalPassword}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleApprove}
      />
    </div>
  );
};
