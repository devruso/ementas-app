import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ApproveDraftDialog } from '../components/ApproveDraftDialog';
import { DisciplineEditorForm } from '../components/DisciplineEditorForm';
import { getTodayIsoDate, suggestNextAgreementNumber } from '../lib/approval';
import { approveComponentDraft, getComponentDraftByCode, getComponentDrafts, getComponents, updateComponentDraft } from '../lib/api';
import { DisciplineFormValues, getDisciplineFormInitialValues, toDraftPayload } from '../lib/componentDraft';
import { AppError } from '../lib/errors';
import type { ComponentDraft, ComponentLog } from '../types';

export const DisciplineEditPage = () => {
  const navigate = useNavigate();
  const { componentCode } = useParams();
  const [draft, setDraft] = useState<ComponentDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [agreementDate, setAgreementDate] = useState('');
  const [agreementNumber, setAgreementNumber] = useState('');
  const [approvalSignature, setApprovalSignature] = useState('');
  const [availablePrerequisites, setAvailablePrerequisites] = useState<Array<{ code: string; name: string }>>([]);
  const [approvalLogs, setApprovalLogs] = useState<ComponentLog[]>([]);
  const [liveValues, setLiveValues] = useState<DisciplineFormValues | null>(null);
  const [lastSavedPayload, setLastSavedPayload] = useState('');
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const code = useMemo(() => componentCode?.toUpperCase() || '', [componentCode]);
  const initialFormValues = useMemo(
    () => getDisciplineFormInitialValues(draft || undefined),
    [draft]
  );

  const loadDraft = async () => {
    if (!code) {
      navigate('/disciplinas', { replace: true });
      return;
    }

    const [currentDraft, componentsResult, draftsResult] = await Promise.all([
      getComponentDraftByCode(code),
      getComponents({ page: 0, limit: 300, sortBy: 'code', sortOrder: 'ASC' }),
      getComponentDrafts({ page: 0, limit: 300, sortBy: 'code', sortOrder: 'ASC' }),
    ]);

    const mapped = new Map<string, { code: string; name: string }>();
    componentsResult.results.forEach((component) => {
      mapped.set(component.code, {
        code: component.code,
        name: component.name,
      });
    });

    draftsResult.results.forEach((draftItem) => {
      if (draftItem.code?.trim()) {
        mapped.set(draftItem.code, {
          code: draftItem.code,
          name: draftItem.name || 'Rascunho sem nome',
        });
      }
    });

    setDraft(currentDraft);
    setLastSavedPayload(JSON.stringify(toDraftPayload(getDisciplineFormInitialValues(currentDraft))));
    setAvailablePrerequisites(Array.from(mapped.values()));

    const currentComponent = componentsResult.results.find((item) => item.code.toUpperCase() === code);
    const normalizedApprovalLogs = (currentComponent?.logs || []).filter((log) => log.type === 'approval');
    setApprovalLogs(normalizedApprovalLogs);

    if (!agreementDate) {
      setAgreementDate(getTodayIsoDate());
    }

    if (!agreementNumber) {
      setAgreementNumber(suggestNextAgreementNumber(normalizedApprovalLogs, agreementDate || getTodayIsoDate()));
    }
  };

  useEffect(() => {
    setLoading(true);
    loadDraft()
      .catch((err) => {
        const appError = err as AppError;
        setError(appError.message);
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
        const updatedDraft = await updateComponentDraft(draft.id, nextPayload);
        setDraft(updatedDraft);
        setLastSavedPayload(serializedPayload);
        setAutosaveStatus('saved');
      } catch (err) {
        const appError = err as AppError;
        setError(appError.message);
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
      setError('');
      const updatedDraft = await updateComponentDraft(draft.id, toDraftPayload(values));
      setDraft(updatedDraft);
      navigate(`/disciplinas/${updatedDraft.code.toLowerCase()}`);
    } catch (err) {
      const appError = err as AppError;
      setError(appError.message);
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
      setError('');
      const updatedDraft = await updateComponentDraft(draft.id, toDraftPayload(values));
      setDraft(updatedDraft);
      if (!agreementDate) {
        setAgreementDate(getTodayIsoDate());
      }
      if (!agreementNumber) {
        setAgreementNumber(suggestNextAgreementNumber(approvalLogs, agreementDate || getTodayIsoDate()));
      }
      setDialogOpen(true);
    } catch (err) {
      const appError = err as AppError;
      setError(appError.message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!draft?.id) {
      return;
    }

    if (!agreementDate || !agreementNumber.trim() || !approvalSignature.trim()) {
      setDialogError('Informe data, numero da ATA e assinatura de aprovação.');
      return;
    }

    try {
      setSaving(true);
      setDialogError('');
      await approveComponentDraft(draft.id, {
        agreementDate: new Date(agreementDate).toISOString(),
        agreementNumber,
        signature: approvalSignature,
      });

      setDialogOpen(false);
      navigate(`/disciplinas/${draft.code.toLowerCase()}`);
    } catch (err) {
      const appError = err as AppError;
      setDialogError(appError.message);
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
      <section className="panel p-6 sm:p-8">
        <div className="mb-3 inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
          Gestao de disciplina
        </div>
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Editar disciplina</h1>
        <p className="mt-2 text-sm leading-7 text-muted">Atualize o rascunho com leitura confortável e publique com aprovação formal quando o conteúdo estiver consolidado.</p>
        <p className="mt-3 text-xs font-medium text-muted">
          {autosaveStatus === 'saving' && 'Salvando automaticamente...'}
          {autosaveStatus === 'saved' && 'Rascunho sincronizado automaticamente.'}
          {autosaveStatus === 'error' && 'Falha no autosave. Tente salvar manualmente.'}
        </p>
      </section>

      <DisciplineEditorForm
        initialValues={initialFormValues}
        saving={saving}
        error={error}
        availablePrerequisites={availablePrerequisites}
        onCancel={() => navigate(`/disciplinas/${draft.code.toLowerCase()}`)}
        onSave={handleSave}
        onSaveAndPublish={handleSaveAndPublish}
        onValuesChange={setLiveValues}
      />

      <ApproveDraftDialog
        open={dialogOpen}
        componentCode={draft.code}
        agreementDate={agreementDate}
        agreementNumber={agreementNumber}
        signature={approvalSignature}
        submitting={saving}
        error={dialogError}
        onChangeAgreementDate={setAgreementDate}
        onChangeAgreementNumber={setAgreementNumber}
        onChangeSignature={setApprovalSignature}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleApprove}
      />
    </div>
  );
};