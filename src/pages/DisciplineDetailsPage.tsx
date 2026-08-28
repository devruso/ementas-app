import { Check, Copy, Download, Eye, FilePenLine, FileText, Home, ScrollText, Share2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ApproveDraftDialog } from '../components/ApproveDraftDialog';
import { SectionCard } from '../components/SectionCard';
import { WorkloadOverview } from '../components/WorkloadOverview';
import { useAuth } from '../contexts/AuthContext';
import {
  approveComponentDraft,
  createPublicShare,
  exportComponentDocx,
  exportComponentPdf,
  getActivePublicShares,
  getComponentByCode,
  getComponentDrafts,
  getComponentLogs,
  getComponents,
  getDraftPublicationContext,
} from '../lib/api';
import { formatDate } from '../lib/format';
import { AppError } from '../lib/errors';
import { ApiErrorCode, isInvalidSessionError } from '../lib/apiErrorCatalog';
import type { Component, ComponentLog, PublicationContext } from '../types';

const prerequerimentCodeRegex = /\b[A-Z]{2,4}[0-9]{2,4}\b/g;

const componentComparableFields: Array<
  | 'name'
  | 'department'
  | 'semester'
  | 'academicLevel'
  | 'modality'
  | 'program'
  | 'objective'
  | 'syllabus'
  | 'methodology'
  | 'learningAssessment'
  | 'bibliography'
  | 'prerequeriments'
> = [
  'name',
  'department',
  'semester',
  'academicLevel',
  'modality',
  'program',
  'objective',
  'syllabus',
  'methodology',
  'learningAssessment',
  'bibliography',
  'prerequeriments',
];

const workloadComparableFields: Array<
  | 'studentTheory'
  | 'studentPractice'
  | 'studentTheoryPractice'
  | 'studentExtension'
  | 'studentInternship'
  | 'studentPracticeInternship'
  | 'teacherTheory'
  | 'teacherPractice'
  | 'teacherTheoryPractice'
  | 'teacherExtension'
  | 'teacherInternship'
  | 'teacherPracticeInternship'
  | 'moduleTheory'
  | 'modulePractice'
  | 'moduleTheoryPractice'
  | 'moduleExtension'
  | 'moduleInternship'
  | 'modulePracticeInternship'
> = [
  'studentTheory',
  'studentPractice',
  'studentTheoryPractice',
  'studentExtension',
  'studentInternship',
  'studentPracticeInternship',
  'teacherTheory',
  'teacherPractice',
  'teacherTheoryPractice',
  'teacherExtension',
  'teacherInternship',
  'teacherPracticeInternship',
  'moduleTheory',
  'modulePractice',
  'moduleTheoryPractice',
  'moduleExtension',
  'moduleInternship',
  'modulePracticeInternship',
];

const normalizeComparableText = (value?: string) => String(value || '').trim();

const sanitizeAcademicText = (value?: string) => {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return '';
  }

  if (/^\/?descri[cç][aã]o\s*:\s*n[aã]o\s+definido/i.test(normalized)) {
    return '';
  }

  if (/^ementa\s+n[aã]o\s+dispon[ií]vel\s+na\s+listagem\s+p[úu]blica\s+do\s+sigaa\.?$/i.test(normalized)) {
    return '';
  }

  if (/^conte[úu]do\s+program[aá]tico\s+n[aã]o\s+dispon[ií]vel\s+na\s+listagem\s+p[úu]blica\s+do\s+sigaa\.?$/i.test(normalized)) {
    return '';
  }

  if (/^institucional\s*:/i.test(normalized) && /quantidade\s+de\s+avalia[cç][õo]es/i.test(normalized)) {
    return '';
  }

  return normalized;
};

const splitReferences = (rawBibliography?: string, referencesBasic?: string, referencesComplementary?: string) => {
  const basicFromField = sanitizeAcademicText(referencesBasic);
  const complementaryFromField = sanitizeAcademicText(referencesComplementary);

  if (basicFromField || complementaryFromField) {
    return { basic: basicFromField, complementary: complementaryFromField };
  }

  const raw = sanitizeAcademicText(rawBibliography);

  if (!raw) {
    return { basic: '', complementary: '' };
  }

  const basicMatch = raw.match(/(?:REFERENCIAS\s+BASICAS|REFERÊNCIAS\s+BÁSICAS|BASICAS|BÁSICAS)\s*:\s*([\s\S]*?)(?=(?:REFERENCIAS\s+COMPLEMENTARES|REFERÊNCIAS\s+COMPLEMENTARES|COMPLEMENTARES)\s*:|$)/i);
  const complementaryMatch = raw.match(/(?:REFERENCIAS\s+COMPLEMENTARES|REFERÊNCIAS\s+COMPLEMENTARES|COMPLEMENTARES)\s*:\s*([\s\S]*)$/i);

  if (basicMatch || complementaryMatch) {
    return {
      basic: (basicMatch?.[1] || '').trim(),
      complementary: (complementaryMatch?.[1] || '').trim(),
    };
  }

  return { basic: raw, complementary: '' };
};

const formatModalityLabel = (value?: string) => {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return 'Não informada';
  }

  if (/^[A-Z0-9_\-\s]+$/.test(normalized)) {
    return normalized
      .toLowerCase()
      .replace(/[_\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  return normalized;
};

const academicLevelLabels: Record<NonNullable<Component['academicLevel']>, string> = {
  graduacao: 'Graduação',
  mestrado: 'Mestrado',
  doutorado: 'Doutorado',
};

const hasMeaningfulDraftDifference = (component: Component) => {
  if (!component.draft) {
    return false;
  }

  const textFieldsChanged = componentComparableFields.some(
    (field) => normalizeComparableText(component[field]) !== normalizeComparableText(component.draft?.[field])
  );

  if (textFieldsChanged) {
    return true;
  }

  return workloadComparableFields.some(
    (field) => Number(component.workload?.[field] ?? 0) !== Number(component.draft?.workload?.[field] ?? 0)
  );
};

export const DisciplineDetailsPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportingDoc, setExportingDoc] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState<AppError | null>(null);
  const [publicationContext, setPublicationContext] = useState<PublicationContext | null>(null);
  const [loadingPublicationContext, setLoadingPublicationContext] = useState(false);
  const [approvalPassword, setApprovalPassword] = useState('');
  const [showPublishedVersion, setShowPublishedVersion] = useState(false);
  const [creatingShare, setCreatingShare] = useState(false);
  const [publicShareLink, setPublicShareLink] = useState('');
  const [publicShareExpiresAt, setPublicShareExpiresAt] = useState('');
  const [publicShareCopied, setPublicShareCopied] = useState(false);
  const [component, setComponent] = useState<Component | null>(null);
  const [logs, setLogs] = useState<Component['logs']>([]);
  const [knownCodes, setKnownCodes] = useState<Set<string>>(new Set());

  const code = useMemo(() => params.componentCode?.toUpperCase() || '', [params.componentCode]);

  const loadLatestActiveShare = async (componentId: string) => {
    const sharesResponse = await getActivePublicShares(componentId, {
      page: 0,
      limit: 1,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    });

    const latestShare = sharesResponse.results[0];
    setPublicShareLink(latestShare ? `${window.location.origin}${latestShare.publicLink}` : '');
    setPublicShareExpiresAt(latestShare ? formatDate(latestShare.expiresAt) : '');
    setPublicShareCopied(false);
  };

  const loadComponent = async () => {
    setErrorMessage('');

    const [currentComponent, componentsResponse] = await Promise.all([
      getComponentByCode(code),
      getComponents({ page: 0, limit: 300, sortBy: 'code', sortOrder: 'ASC' }),
    ]);
    let draftsResponse: { results: Array<{ code?: string }> } = { results: [] };

    const catalog = new Set<string>();
    componentsResponse.results.forEach((item) => catalog.add(item.code.toUpperCase()));

    if (auth.isAuthenticated) {
      try {
        draftsResponse = await getComponentDrafts({ page: 0, limit: 300, sortBy: 'code', sortOrder: 'ASC' });
        draftsResponse.results.forEach((item) => {
          if (item.code?.trim()) {
            catalog.add(item.code.toUpperCase());
          }
        });
      } catch (error) {
        if (isInvalidSessionError(error)) {
          auth.logout();
        } else {
          throw error;
        }
      }
    }

    setKnownCodes(catalog);
    setComponent(currentComponent);

    if (auth.isAuthenticated && currentComponent.id) {
      try {
        const [logResponse] = await Promise.all([
          getComponentLogs(currentComponent.id, {
            page: 0,
            limit: 10,
            sortBy: 'createdAt',
            sortOrder: 'DESC',
          }),
          loadLatestActiveShare(currentComponent.id),
        ]);

        setLogs(logResponse.results);
      } catch (error) {
        if (isInvalidSessionError(error)) {
          auth.logout();
          setLogs(currentComponent.logs || []);
          setPublicShareLink('');
          setPublicShareExpiresAt('');
        } else {
          throw error;
        }
      }
    } else {
      setLogs(currentComponent.logs || []);
      setPublicShareLink('');
      setPublicShareExpiresAt('');
    }
  };

  useEffect(() => {
    if (!code) {
      navigate('/disciplinas', { replace: true });
      return;
    }

    setLoading(true);
    loadComponent()
      .catch((err) => {
        const appError = err as AppError;
        setComponent(null);
        setErrorMessage(appError.message || 'Falha ao carregar disciplina.');
      })
      .finally(() => setLoading(false));
  }, [code, navigate, auth.isAuthenticated]);

  const handleExport = async () => {
    if (!component?.id) {
      return;
    }

    setExporting(true);

    try {
      const blob = await exportComponentPdf(component.id);
      const fileUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = fileUrl;
      anchor.download = `${component.code}-${component.name}.pdf`;
      anchor.click();
      URL.revokeObjectURL(fileUrl);
    } finally {
      setExporting(false);
    }
  };

  const handleExportDoc = async () => {
    if (!component?.id) {
      return;
    }

    setExportingDoc(true);

    try {
      const blob = await exportComponentDocx(component.id);
      const fileUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = fileUrl;
      anchor.download = `${component.code}-${component.name}.docx`;
      anchor.click();
      URL.revokeObjectURL(fileUrl);
    } finally {
      setExportingDoc(false);
    }
  };

  const handlePublish = async () => {
    if (!component?.draft?.id) {
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
      setPublishing(true);
      setDialogError(null);
      await approveComponentDraft(component.draft.id, {
        password: approvalPassword,
      });
      setDialogOpen(false);
      setApprovalPassword('');
      setShowPublishedVersion(true);
      await loadComponent();
    } catch (err) {
      const appError = err as AppError;
      setDialogError(appError);
    } finally {
      setPublishing(false);
    }
  };

  const handleOpenApprovalDialog = async () => {
    if (!component?.draft?.id) {
      return;
    }

    setDialogError(null);
    setPublicationContext(null);
    setApprovalPassword('');
    setDialogOpen(true);
    setLoadingPublicationContext(true);

    try {
      setPublicationContext(await getDraftPublicationContext(component.draft.id));
    } catch (err) {
      setDialogError(err as AppError);
    } finally {
      setLoadingPublicationContext(false);
    }
  };

  const handleCreatePublicShare = async () => {
    if (!component?.id) {
      return;
    }

    try {
      setCreatingShare(true);
      setErrorMessage('');
      const share = await createPublicShare(component.id, 24);
      const absoluteLink = `${window.location.origin}${share.publicLink}`;
      setPublicShareLink(absoluteLink);
      setPublicShareExpiresAt(formatDate(share.expiresAt));
      setPublicShareCopied(false);
    } catch (err) {
      const appError = err as AppError;
      setErrorMessage(appError.message || 'Não foi possível criar o link público temporário.');
    } finally {
      setCreatingShare(false);
    }
  };

  const handleCopyPublicShare = async () => {
    if (!publicShareLink) {
      return;
    }

    try {
      setErrorMessage('');
      await navigator.clipboard.writeText(publicShareLink);
      setPublicShareCopied(true);
    } catch {
      setErrorMessage('Não foi possível copiar o link. Selecione o endereço e copie manualmente.');
    }
  };

  if (loading) {
    return <div className="panel p-10 text-center text-sm text-muted">Carregando disciplina...</div>;
  }

  if (!component) {
    return (
      <div className="panel p-10 text-center text-sm text-muted">
        {errorMessage || 'Disciplina não encontrada.'}
      </div>
    );
  }

  const approvalHistory = [
    ...(component.logs || []),
    ...(logs || []),
  ].filter((log, index, list) => list.findIndex((item) => item.id === log.id) === index);

  const latestApproval = [...approvalHistory]
    .filter((log) => log.type === 'approval')
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
  const hasDraftVersion = auth.isAuthenticated && hasMeaningfulDraftDifference(component);
  const showingDraft = hasDraftVersion && !showPublishedVersion;
  const activeComponent = showingDraft && component.draft
    ? {
        ...component,
        ...component.draft,
        workload: component.draft.workload || component.workload,
      }
    : component;
  const displaySyllabus = sanitizeAcademicText(activeComponent.syllabus);
  const displayProgram = sanitizeAcademicText(activeComponent.program);
  const displayObjective = sanitizeAcademicText(activeComponent.objective);
  const displayMethodology = sanitizeAcademicText(activeComponent.methodology);
  const displayLearningAssessment = sanitizeAcademicText(activeComponent.learningAssessment);
  const displayBibliography = sanitizeAcademicText(activeComponent.bibliography);
  const references = splitReferences(displayBibliography, activeComponent.referencesBasic, activeComponent.referencesComplementary);
  const visibleApprovalLogs = (auth.isAuthenticated ? logs || [] : component.logs || [])
    .filter((log) => log.type === 'approval');
  const normalizedPrerequeriments = activeComponent.prerequeriments?.trim().toUpperCase() || '';
  const isNotApplicable = ['NAO_SE_APLICA', 'N/A', 'NÃO SE APLICA', 'NAO SE APLICA'].includes(normalizedPrerequeriments);
  const prerequerimentCodes = Array.from(
    new Set(activeComponent.prerequeriments?.toUpperCase().match(prerequerimentCodeRegex) ?? [])
  );
  const prerequerimentStatus = prerequerimentCodes.map((codeItem) => ({
    code: codeItem,
    status: knownCodes.has(codeItem) ? 'existing' : 'pending',
  }));

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <main className="min-w-0 space-y-6">
        <section className="panel overflow-hidden p-6">
          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-start">
            <div className="min-w-0">
            <div className="mb-3 inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
              {activeComponent.code}
            </div>
            <h1 className="text-2xl font-semibold leading-tight text-ink sm:text-3xl">{activeComponent.name}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">
              {displaySyllabus || displayProgram || 'Disciplina sem resumo público informado.'}
            </p>
            </div>

            <dl className="min-w-0 space-y-3 rounded-lg border border-line bg-slate-50 p-4 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase text-muted">Curso</dt>
                <dd className="mt-1 break-words font-medium text-ink">{activeComponent.department || 'Não informado'}</dd>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs font-semibold uppercase text-muted">Semestre</dt>
                  <dd className="mt-1 font-medium text-ink">{activeComponent.semester || 'Não informado'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-muted">Nível</dt>
                  <dd className="mt-1 font-medium text-ink">
                    {activeComponent.academicLevel ? academicLevelLabels[activeComponent.academicLevel] : 'Não informado'}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-muted">Modalidade</dt>
                <dd className="mt-1 font-medium text-ink">{formatModalityLabel(activeComponent.modality)}</dd>
              </div>
              <div className="border-t border-line pt-3">
              <dt className="text-xs font-semibold uppercase text-muted">Pré-requisitos</dt>
              <dd className="mt-2 text-ink/80">
              {isNotApplicable ? (
                <span className="inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                  Não se aplica
                </span>
              ) : prerequerimentStatus.length > 0 ? (
                <span className="inline-flex flex-wrap gap-2 align-middle">
                  {prerequerimentStatus.map((item) => (
                    <span
                      key={item.code}
                      className={item.status === 'existing'
                        ? 'inline-flex rounded-full border border-primary-200 bg-primary-100 px-2.5 py-1 text-xs font-semibold text-primary-600'
                        : 'inline-flex rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700'}
                    >
                      {item.code} {item.status === 'existing' ? '(existente)' : '(pendente)'}
                    </span>
                  ))}
                </span>
              ) : (
                <span>{activeComponent.prerequeriments || 'Não informado'}</span>
              )}
              </dd>
              </div>
            </dl>
          </div>
        </section>

        <SectionCard title="Ementa">{displaySyllabus || 'Não informada.'}</SectionCard>
        <SectionCard title="Objetivos">{displayObjective || 'Não informados.'}</SectionCard>
        <SectionCard title="Conteúdo programático">{displayProgram || 'Não informado.'}</SectionCard>
        <SectionCard title="Metodologia">{displayMethodology || 'Não informada.'}</SectionCard>
        <SectionCard title="Avaliação da aprendizagem">
          {displayLearningAssessment || 'Não informada.'}
        </SectionCard>
        <SectionCard title="Referências básicas">{references.basic || 'Não informadas.'}</SectionCard>
        <SectionCard title="Referências complementares">{references.complementary || 'Não informadas.'}</SectionCard>

        <WorkloadOverview workload={activeComponent.workload} />

        {visibleApprovalLogs.length > 0 ? (
          <SectionCard title="Últimas publicações">
            <div className="space-y-4">
              {visibleApprovalLogs
                .slice(0, 5)
                .map((log) => (
                  <div key={log.id} className="rounded-2xl border border-line bg-slate-50 p-4 text-sm">
                    <div><strong>Data:</strong> {formatDate(log.agreementDate || log.createdAt)}</div>
                    <div><strong>Ata:</strong> {log.agreementNumber || 'Não informada'}</div>
                    <div><strong>Publicado por:</strong> {log.user?.name || 'Não informado'}</div>
                  </div>
                ))}
            </div>
          </SectionCard>
        ) : null}
      </main>

      <aside className="space-y-4 xl:sticky xl:top-6">
        <section className="panel p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-700/80">Menu de ações</h2>
            {hasDraftVersion ? (
              <span className="rounded-full border border-primary-100 bg-primary-50 px-2 py-1 text-[10px] font-semibold text-primary-700">
                {showingDraft ? 'Rascunho' : 'Publicada'}
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            {auth.isAuthenticated ? (
              <>
                <Link
                  to={`/disciplinas/${component.code.toLowerCase()}/editar`}
                  className="inline-flex w-full items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-slate-50"
                >
                  <FilePenLine className="h-4 w-4 text-primary-600" />
                  Editar disciplina
                </Link>

                {component.draft?.id ? (
                  <button
                    type="button"
                    onClick={handleOpenApprovalDialog}
                    className="inline-flex w-full items-center gap-2 rounded-xl bg-primary-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600"
                  >
                    <ScrollText className="h-4 w-4" />
                    Publicar
                  </button>
                ) : null}

                {hasDraftVersion ? (
                  <button
                    type="button"
                    onClick={() => setShowPublishedVersion((current) => !current)}
                    className="inline-flex w-full items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-slate-50"
                  >
                    <Eye className="h-4 w-4 text-secondary-700" />
                    {showPublishedVersion ? 'Ver rascunho salvo' : 'Ver versão publicada'}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleCreatePublicShare}
                  disabled={creatingShare}
                  className="inline-flex w-full items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2.5 text-sm font-semibold text-primary-700 transition hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Share2 className="h-4 w-4" />
                  {creatingShare ? 'Gerando link...' : 'Gerar link público'}
                </button>

                {publicShareLink ? (
                  <div className="rounded-lg border border-primary-200 bg-primary-50 p-3">
                    <label htmlFor="public-share-link" className="text-xs font-semibold text-primary-800">
                      Link público ativo
                    </label>
                    <div className="mt-2 flex min-w-0 items-center gap-2">
                      <input
                        id="public-share-link"
                        value={publicShareLink}
                        readOnly
                        onFocus={(event) => event.currentTarget.select()}
                        className="h-10 min-w-0 flex-1 rounded-lg border border-primary-200 bg-white px-3 text-xs text-primary-800"
                      />
                      <button
                        type="button"
                        onClick={handleCopyPublicShare}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary-200 bg-white text-primary-700 transition hover:bg-primary-100"
                        aria-label="Copiar link público"
                        title="Copiar link público"
                      >
                        {publicShareCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-primary-700">
                      {publicShareCopied ? 'Link copiado.' : `Disponível até ${publicShareExpiresAt}.`}
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}

            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex w-full items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4 text-secondary-700" />
              {exporting ? 'Exportando PDF...' : 'Exportar PDF oficial'}
            </button>

            <button
              type="button"
              onClick={handleExportDoc}
              disabled={exportingDoc}
              className="inline-flex w-full items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileText className="h-4 w-4 text-primary-600" />
              {exportingDoc ? 'Exportando DOCX...' : 'Exportar DOCX'}
            </button>

            <Link
              to="/disciplinas"
              className="inline-flex w-full items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink/80 transition hover:bg-slate-50"
            >
              <Home className="h-4 w-4 text-muted" />
              Voltar para o início
            </Link>
          </div>
        </section>

        <section className="panel p-4 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-700/80">Publicação oficial</h2>
          <dl className="mt-3 space-y-2 text-xs text-ink/75">
            <div className="flex justify-between gap-3">
              <dt>Última aprovação</dt>
              <dd className="text-right font-semibold text-ink">{latestApproval?.agreementDate ? formatDate(latestApproval.agreementDate) : 'Não informada'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Ata ou referência</dt>
              <dd className="text-right font-semibold text-ink">{latestApproval?.agreementNumber || 'Não informada'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Publicado por</dt>
              <dd className="text-right font-semibold text-ink">{latestApproval?.user?.name || 'Não informado'}</dd>
            </div>
          </dl>
        </section>

      </aside>

      <ApproveDraftDialog
        open={dialogOpen}
        componentCode={component.code}
        context={publicationContext}
        password={approvalPassword}
        loadingContext={loadingPublicationContext}
        submitting={publishing}
        error={dialogError}
        onChangePassword={setApprovalPassword}
        onClose={() => setDialogOpen(false)}
        onSubmit={handlePublish}
      />
    </div>
  );
};
