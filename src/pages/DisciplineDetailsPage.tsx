import { Download, Eye, FilePenLine, FileText, ScrollText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ApproveDraftDialog } from '../components/ApproveDraftDialog';
import { SectionCard } from '../components/SectionCard';
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
  revokeAllPublicShares,
  revokePublicShare,
} from '../lib/api';
import { getTodayIsoDate, suggestNextAgreementNumber } from '../lib/approval';
import { formatDate, formatWorkload } from '../lib/format';
import { AppError } from '../lib/errors';
import type { Component, ComponentLog, PublicShare } from '../types';

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

const normalizePublishErrorText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const toFriendlyPublishError = (rawMessage?: string) => {
  const fallback = 'Não foi possível publicar a disciplina agora. Revise os dados e tente novamente.';

  if (!rawMessage?.trim()) {
    return fallback;
  }

  const normalized = normalizePublishErrorText(rawMessage);

  if (normalized.includes('referencias basicas nao web devem conter ano')) {
    return 'Publicação oficial bloqueada: inclua ano nas referências básicas não web (ex.: SILVA, J. Título. Salvador: Editora X, 2020). Você pode salvar como rascunho e publicar após ajustar.';
  }

  if (normalized.includes('referencias complementares nao web devem conter ano')) {
    return 'Publicação oficial bloqueada: inclua ano nas referências complementares não web (ex.: SOUZA, M. Título. São Paulo: Editora Y, 2021). Você pode salvar como rascunho e publicar após ajustar.';
  }

  return rawMessage;
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
  const [dialogError, setDialogError] = useState('');
  const [agreementDate, setAgreementDate] = useState('');
  const [agreementNumber, setAgreementNumber] = useState('');
  const [approvalSignature, setApprovalSignature] = useState('');
  const [showPublishedVersion, setShowPublishedVersion] = useState(false);
  const [creatingShare, setCreatingShare] = useState(false);
  const [loadingActiveShares, setLoadingActiveShares] = useState(false);
  const [revokingShareId, setRevokingShareId] = useState('');
  const [revokingAllShares, setRevokingAllShares] = useState(false);
  const [shareCreatorFilter, setShareCreatorFilter] = useState('all');
  const [shareExpirationFilter, setShareExpirationFilter] = useState<'all' | '24h' | '72h' | '168h'>('all');
  const [publicShareLink, setPublicShareLink] = useState('');
  const [publicShareExpiresAt, setPublicShareExpiresAt] = useState('');
  const [activeSharesPage, setActiveSharesPage] = useState(0);
  const [activeSharesLimit] = useState(5);
  const [activeSharesSortBy, setActiveSharesSortBy] = useState<'createdAt' | 'expiresAt' | 'createdBy'>('createdAt');
  const [activeSharesSortOrder, setActiveSharesSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [activeSharesTotalPages, setActiveSharesTotalPages] = useState(1);
  const [activePublicShares, setActivePublicShares] = useState<PublicShare[]>([]);
  const [component, setComponent] = useState<Component | null>(null);
  const [logs, setLogs] = useState<Component['logs']>([]);
  const [knownCodes, setKnownCodes] = useState<Set<string>>(new Set());

  const code = useMemo(() => params.componentCode?.toUpperCase() || '', [params.componentCode]);

  const loadActiveShares = async (componentId: string) => {
    const sharesResponse = await getActivePublicShares(componentId, {
      page: activeSharesPage,
      limit: activeSharesLimit,
      sortBy: activeSharesSortBy,
      sortOrder: activeSharesSortOrder,
      creatorId: shareCreatorFilter === 'all' ? undefined : shareCreatorFilter,
      expirationRange: shareExpirationFilter,
    });

    setActivePublicShares(sharesResponse.results);
    setActiveSharesTotalPages(Math.max(sharesResponse.meta?.totalPages || 1, 1));
  };

  const loadComponent = async () => {
    setErrorMessage('');

    const [currentComponent, componentsResponse, draftsResponse] = await Promise.all([
      getComponentByCode(code),
      getComponents({ page: 0, limit: 300, sortBy: 'code', sortOrder: 'ASC' }),
      auth.isAuthenticated
        ? getComponentDrafts({ page: 0, limit: 300, sortBy: 'code', sortOrder: 'ASC' })
        : Promise.resolve({ results: [], total: 0 }),
    ]);

    const catalog = new Set<string>();
    componentsResponse.results.forEach((item) => catalog.add(item.code.toUpperCase()));
    draftsResponse.results.forEach((item) => {
      if (item.code?.trim()) {
        catalog.add(item.code.toUpperCase());
      }
    });

    setKnownCodes(catalog);
    setComponent(currentComponent);

    if (auth.isAuthenticated && currentComponent.id) {
      setLoadingActiveShares(true);

      try {
        const logResponse = await getComponentLogs(currentComponent.id, {
          page: 0,
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        });

        setLogs(logResponse.results);
        await loadActiveShares(currentComponent.id);
      } finally {
        setLoadingActiveShares(false);
      }
    } else {
      setLogs(currentComponent.logs || []);
      setActivePublicShares([]);
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
  }, [
    code,
    navigate,
    auth.isAuthenticated,
    activeSharesPage,
    activeSharesLimit,
    activeSharesSortBy,
    activeSharesSortOrder,
    shareCreatorFilter,
    shareExpirationFilter,
  ]);

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

    if (!agreementDate || !agreementNumber.trim()) {
      setDialogError('Informe a data e o numero da ATA.');
      return;
    }

    if (!approvalSignature.trim()) {
      setDialogError('Informe sua assinatura para validar a publicação oficial.');
      return;
    }

    try {
      setPublishing(true);
      setDialogError('');
      await approveComponentDraft(component.draft.id, {
        agreementDate: new Date(agreementDate).toISOString(),
        agreementNumber,
        signature: approvalSignature,
      });
      setDialogOpen(false);
      setApprovalSignature('');
      setShowPublishedVersion(true);
      await loadComponent();
    } catch (err) {
      const appError = err as AppError;
      setDialogError(toFriendlyPublishError(appError.message));
    } finally {
      setPublishing(false);
    }
  };

  const handleOpenApprovalDialog = () => {
    const approvalLogs = [...(logs || component?.logs || [])];

    if (!agreementDate) {
      setAgreementDate(getTodayIsoDate());
    }

    if (!agreementNumber.trim()) {
      setAgreementNumber(suggestNextAgreementNumber(approvalLogs, agreementDate || getTodayIsoDate()));
    }

    setDialogError('');
    setDialogOpen(true);
  };

  const handleCreatePublicShare = async () => {
    if (!component?.id) {
      return;
    }

    const informedHours = window.prompt('Informe por quantas horas o link ficará ativo (1 a 168):', '24');

    if (!informedHours) {
      return;
    }

    const expiresInHours = Number(informedHours);

    if (!Number.isFinite(expiresInHours) || expiresInHours < 1) {
      setErrorMessage('Informe uma duração válida para o compartilhamento.');
      return;
    }

    try {
      setCreatingShare(true);
      const share = await createPublicShare(component.id, expiresInHours);
      const absoluteLink = `${window.location.origin}${share.publicLink}`;
      setPublicShareLink(absoluteLink);
      setPublicShareExpiresAt(formatDate(share.expiresAt));
      setActiveSharesPage(0);
      await loadActiveShares(component.id);

      try {
        await navigator.clipboard.writeText(absoluteLink);
      } catch {
        // Clipboard can be unavailable in insecure contexts; keep showing the generated link.
      }
    } catch (err) {
      const appError = err as AppError;
      setErrorMessage(appError.message || 'Não foi possível criar o link público temporário.');
    } finally {
      setCreatingShare(false);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    if (!component?.id) {
      return;
    }

    try {
      setRevokingShareId(shareId);
      setErrorMessage('');
      await revokePublicShare(shareId);
      await loadActiveShares(component.id);
    } catch (err) {
      const appError = err as AppError;
      setErrorMessage(appError.message || 'Não foi possível revogar o link público.');
    } finally {
      setRevokingShareId('');
    }
  };

  const handleRevokeAllShares = async () => {
    if (!component?.id) {
      return;
    }

    const confirmed = window.confirm('Deseja revogar todos os links públicos ativos desta disciplina?');

    if (!confirmed) {
      return;
    }

    try {
      setRevokingAllShares(true);
      setErrorMessage('');
      await revokeAllPublicShares(component.id);
      setActivePublicShares([]);
      setActiveSharesTotalPages(1);
      setPublicShareLink('');
      setPublicShareExpiresAt('');
    } catch (err) {
      const appError = err as AppError;
      setErrorMessage(appError.message || 'Não foi possível revogar os links públicos.');
    } finally {
      setRevokingAllShares(false);
    }
  };

  const shareCreatorOptions = useMemo(() => {
    const known = new Set<string>();

    return activePublicShares
      .filter((share) => share.createdByUser?.id && share.createdByUser?.name)
      .filter((share) => {
        const creatorId = String(share.createdByUser?.id);

        if (known.has(creatorId)) {
          return false;
        }

        known.add(creatorId);
        return true;
      })
      .map((share) => ({
        id: String(share.createdByUser?.id),
        name: String(share.createdByUser?.name),
      }));
  }, [activePublicShares]);

  const filteredActivePublicShares = useMemo(() => activePublicShares, [activePublicShares]);

  if (loading) {
    return <div className="panel p-10 text-center text-sm text-muted">Carregando disciplina...</div>;
  }

  if (!component) {
    return (
      <div className="panel p-10 text-center text-sm text-muted">
        {errorMessage || 'Disciplina nao encontrada.'}
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
  const activeComponent = showingDraft && component.draft ? component.draft : component;
  const displaySyllabus = sanitizeAcademicText(activeComponent.syllabus);
  const displayProgram = sanitizeAcademicText(activeComponent.program);
  const displayObjective = sanitizeAcademicText(activeComponent.objective);
  const displayMethodology = sanitizeAcademicText(activeComponent.methodology);
  const displayLearningAssessment = sanitizeAcademicText(activeComponent.learningAssessment);
  const displayBibliography = sanitizeAcademicText(activeComponent.bibliography);
  const references = splitReferences(displayBibliography, activeComponent.referencesBasic, activeComponent.referencesComplementary);
  const visibleLogs = auth.isAuthenticated ? logs || [] : component.logs || [];
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
    <div className="space-y-6">
      <section className="panel overflow-hidden">
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <div className="mb-3 inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
              {activeComponent.code}
            </div>
            <h1 className="text-2xl font-semibold leading-tight text-ink sm:text-3xl">{activeComponent.name}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">
              {displaySyllabus || displayProgram || 'Disciplina sem resumo público informado.'}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-line bg-slate-50 px-4 py-2 text-sm">
                Departamento: {activeComponent.department || 'Nao informado'}
              </span>
              <span className="rounded-full border border-line bg-slate-50 px-4 py-2 text-sm">
                Semestre: {activeComponent.semester || 'Nao informado'}
              </span>
              <span className="rounded-full border border-line bg-slate-50 px-4 py-2 text-sm">
                Modalidade: {formatModalityLabel(activeComponent.modality)}
              </span>
            </div>

            {auth.isAuthenticated ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-3xl border border-white/55 bg-white/72 p-4 shadow-sm backdrop-blur-md">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-700/80">Ações rápidas</div>
                      <div className="mt-1 text-sm text-ink/70">Edite, publique e alterne entre rascunho salvo e versão oficial.</div>
                    </div>
                    {hasDraftVersion ? (
                      <div className="rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                        Mostrando agora: {showingDraft ? 'rascunho salvo' : 'publicacao oficial'}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      to={`/disciplinas/${component.code.toLowerCase()}/editar`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:bg-slate-50"
                    >
                      <FilePenLine className="h-4 w-4 text-primary-600" />
                      Editar disciplina
                    </Link>

                    {component.draft?.id ? (
                      <button
                        type="button"
                        onClick={handleOpenApprovalDialog}
                        className="inline-flex items-center gap-2 rounded-2xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-primary-600"
                      >
                        <ScrollText className="h-4 w-4" />
                        Publicar
                      </button>
                    ) : null}

                    {hasDraftVersion ? (
                      <button
                        type="button"
                        onClick={() => setShowPublishedVersion((current) => !current)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:bg-slate-50"
                      >
                        <Eye className="h-4 w-4 text-secondary-700" />
                        {showPublishedVersion ? 'Ver rascunho salvo' : 'Ver versao publicada'}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-3xl border border-dashed border-primary-200/80 bg-primary-50/70 p-4 shadow-sm">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-700/80">Compartilhamento</div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCreatePublicShare}
                      disabled={creatingShare}
                      className="inline-flex items-center gap-2 rounded-2xl border border-primary-200 bg-white px-4 py-3 text-sm font-semibold text-primary-700 transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creatingShare ? 'Gerando link público...' : 'Compartilhar público temporário'}
                    </button>
                    <p className="text-sm text-ink/68">Crie um link temporário auditável para consulta pública controlada.</p>
                  </div>
                </div>
              </div>
            ) : null}

            {publicShareLink ? (
              <div className="mt-4 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
                <p>Link público gerado e copiado para a área de transferência.</p>
                <p>Expira em: {publicShareExpiresAt || 'Data não informada'}</p>
                <p className="break-all">{publicShareLink}</p>
              </div>
            ) : null}

            {auth.isAuthenticated ? (
              <div className="mt-4 rounded-2xl border border-line bg-white px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-ink">Links públicos ativos</h3>
                  <button
                    type="button"
                    onClick={handleRevokeAllShares}
                    disabled={revokingAllShares || activePublicShares.length === 0}
                    className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-danger transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {revokingAllShares ? 'Revogando...' : 'Revogar todos'}
                  </button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/60">
                    Ordenar por
                    <select
                      aria-label="Ordenar links por"
                      value={activeSharesSortBy}
                      onChange={(event) => {
                        setActiveSharesPage(0);
                        setActiveSharesSortBy(event.target.value as 'createdAt' | 'expiresAt' | 'createdBy');
                      }}
                      className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-normal text-ink"
                    >
                      <option value="createdAt">Data de criação</option>
                      <option value="expiresAt">Data de expiração</option>
                      <option value="createdBy">Criador</option>
                    </select>
                  </label>

                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/60">
                    Direção
                    <select
                      aria-label="Direção da ordenação de links"
                      value={activeSharesSortOrder}
                      onChange={(event) => {
                        setActiveSharesPage(0);
                        setActiveSharesSortOrder(event.target.value as 'ASC' | 'DESC');
                      }}
                      className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-normal text-ink"
                    >
                      <option value="DESC">Decrescente</option>
                      <option value="ASC">Crescente</option>
                    </select>
                  </label>

                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/60">
                    Filtrar por criador
                    <select
                      aria-label="Filtrar links por criador"
                      value={shareCreatorFilter}
                      onChange={(event) => {
                        setActiveSharesPage(0);
                        setShareCreatorFilter(event.target.value);
                      }}
                      className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-normal text-ink"
                    >
                      <option value="all">Todos os criadores</option>
                      {shareCreatorOptions.map((creator) => (
                        <option key={creator.id} value={creator.id}>{creator.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/60">
                    Filtrar por expiração
                    <select
                      aria-label="Filtrar links por expiração"
                      value={shareExpirationFilter}
                      onChange={(event) => {
                        setActiveSharesPage(0);
                        setShareExpirationFilter(event.target.value as 'all' | '24h' | '72h' | '168h');
                      }}
                      className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-normal text-ink"
                    >
                      <option value="all">Qualquer prazo</option>
                      <option value="24h">Expira em até 24h</option>
                      <option value="72h">Expira em até 72h</option>
                      <option value="168h">Expira em até 7 dias</option>
                    </select>
                  </label>
                </div>

                {loadingActiveShares ? (
                  <p className="mt-3 text-sm text-muted">Carregando links ativos...</p>
                ) : filteredActivePublicShares.length === 0 ? (
                  <p className="mt-3 text-sm text-muted">Nenhum link público ativo para esta disciplina.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {filteredActivePublicShares.map((share) => {
                      const link = `${window.location.origin}${share.publicLink}`;

                      return (
                        <div key={share.id} className="rounded-xl border border-line bg-slate-50 px-3 py-3 text-xs sm:text-sm">
                          <p className="break-all text-primary-700">{link}</p>
                          <p className="mt-1 text-muted">Expira em: {formatDate(share.expiresAt)}</p>
                          <p className="mt-1 text-muted">
                            Criado por: {share.createdByUser?.name || 'Usuário não identificado'}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleRevokeShare(share.id)}
                              disabled={revokingShareId === share.id}
                              className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {revokingShareId === share.id ? 'Revogando...' : 'Revogar link'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between text-xs text-ink/70">
                  <span>Página {activeSharesPage + 1} de {activeSharesTotalPages}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveSharesPage((current) => Math.max(0, current - 1))}
                      disabled={activeSharesPage === 0 || loadingActiveShares}
                      className="rounded-lg border border-line px-2 py-1 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSharesPage((current) => Math.min(activeSharesTotalPages - 1, current + 1))}
                      disabled={activeSharesPage + 1 >= activeSharesTotalPages || loadingActiveShares}
                      className="rounded-lg border border-line px-2 py-1 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-white/45 bg-white/14 p-5 text-ink shadow-panel backdrop-blur-xl">
            <div className="rounded-3xl border border-white/40 bg-white/42 p-4 shadow-sm">
              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-700/80">
                Exportacao oficial
              </div>
              <div className="text-sm text-ink/68">
                Gere PDF ou DOCX com o conteúdo oficial publicado e com os metadados formais de aprovação quando eles existirem no histórico.
              </div>
            </div>

            <div className="mt-4 space-y-3 rounded-3xl border border-white/35 bg-white/36 p-4 text-sm text-ink/75">
              <div className="flex items-start justify-between gap-3">
                <span className="text-ink/60">Ultima aprovacao</span>
                <strong className="text-right text-ink">{latestApproval?.agreementDate ? formatDate(latestApproval.agreementDate) : 'Nao informada'}</strong>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-ink/60">Ata ou referencia</span>
                <strong className="text-right text-ink">{latestApproval?.agreementNumber || 'Nao informada'}</strong>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-ink/60">Publicado por</span>
                <strong className="text-right text-ink">{latestApproval?.user?.name || 'Nao informado'}</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary-500 px-4 py-3 font-semibold text-secondary-700 transition hover:-translate-y-0.5 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Exportando PDF oficial...' : 'Exportar PDF oficial'}
            </button>

            <button
              type="button"
              onClick={handleExportDoc}
              disabled={exportingDoc}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-primary-200 bg-white/45 px-4 py-3 font-semibold text-primary-700 transition hover:-translate-y-0.5 hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileText className="h-4 w-4" />
              {exportingDoc ? 'Exportando DOCX...' : 'Exportar DOCX'}
            </button>

            <Link
              to="/disciplinas"
              className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-white/45 bg-white/20 px-4 py-3 text-sm text-ink/80 transition hover:bg-white/45"
            >
              Voltar para inicio
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <SectionCard title="Ementa">{displaySyllabus || 'Não informada.'}</SectionCard>
          <SectionCard title="Objetivos">{displayObjective || 'Não informados.'}</SectionCard>
          <SectionCard title="Conteúdo programático">{displayProgram || 'Não informado.'}</SectionCard>
          <SectionCard title="Metodologia">{displayMethodology || 'Não informada.'}</SectionCard>
          <SectionCard title="Avaliacao da aprendizagem">
            {displayLearningAssessment || 'Não informada.'}
          </SectionCard>
          <SectionCard title="Referencias basicas">{references.basic || 'Não informadas.'}</SectionCard>
          <SectionCard title="Referencias complementares">{references.complementary || 'Não informadas.'}</SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Visao geral">
            <div className="space-y-3">
              <div>
                <strong>Pre-requisitos:</strong>
                {isNotApplicable ? (
                  <span className="ml-2 inline-flex rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    Nao se aplica
                  </span>
                ) : prerequerimentStatus.length > 0 ? (
                  <span className="ml-2 inline-flex flex-wrap gap-2 align-middle">
                    {prerequerimentStatus.map((item) => (
                      <span
                        key={item.code}
                        className={
                          item.status === 'existing'
                            ? 'inline-flex rounded-full border border-primary-200 bg-primary-100 px-2.5 py-1 text-xs font-semibold text-primary-600'
                            : 'inline-flex rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700'
                        }
                      >
                        {item.code} {item.status === 'existing' ? '(existente)' : '(pendente)'}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="ml-2">{activeComponent.prerequeriments || 'Nao informado'}</span>
                )}
              </div>
              <div><strong>Departamento:</strong> {activeComponent.department || 'Nao informado'}</div>
              <div><strong>Semestre:</strong> {activeComponent.semester || 'Nao informado'}</div>
            </div>
          </SectionCard>

          <SectionCard title="Carga horaria">
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-2xl border border-line bg-slate-50 p-4">
                <div className="mb-2 font-semibold">Estudante</div>
                <div>Teoria: {formatWorkload(activeComponent.workload?.studentTheory)}</div>
                <div>Pratica: {formatWorkload(activeComponent.workload?.studentPractice)}</div>
                <div>T/P: {formatWorkload(activeComponent.workload?.studentTheoryPractice)}</div>
                <div>PP: {formatWorkload(activeComponent.workload?.studentPracticeInternship)}</div>
                <div>Ext: {formatWorkload(activeComponent.workload?.studentExtension)}</div>
                <div>E: {formatWorkload(activeComponent.workload?.studentInternship)}</div>
              </div>
              <div className="rounded-2xl border border-line bg-slate-50 p-4">
                <div className="mb-2 font-semibold">Docente</div>
                <div>Teoria: {formatWorkload(activeComponent.workload?.teacherTheory)}</div>
                <div>Pratica: {formatWorkload(activeComponent.workload?.teacherPractice)}</div>
                <div>T/P: {formatWorkload(activeComponent.workload?.teacherTheoryPractice)}</div>
                <div>PP: {formatWorkload(activeComponent.workload?.teacherPracticeInternship)}</div>
                <div>Ext: {formatWorkload(activeComponent.workload?.teacherExtension)}</div>
                <div>E: {formatWorkload(activeComponent.workload?.teacherInternship)}</div>
              </div>
              <div className="rounded-2xl border border-line bg-slate-50 p-4 sm:col-span-2">
                <div className="mb-2 font-semibold">Modulo</div>
                <div>Teoria: {formatWorkload(activeComponent.workload?.moduleTheory)}</div>
                <div>Pratica: {formatWorkload(activeComponent.workload?.modulePractice)}</div>
                <div>T/P: {formatWorkload(activeComponent.workload?.moduleTheoryPractice)}</div>
                <div>PP: {formatWorkload(activeComponent.workload?.modulePracticeInternship)}</div>
                <div>Ext: {formatWorkload(activeComponent.workload?.moduleExtension)}</div>
                <div>E: {formatWorkload(activeComponent.workload?.moduleInternship)}</div>
              </div>
            </div>
          </SectionCard>

          {(visibleLogs?.length ?? 0) > 0 ? (
            <SectionCard title="Ultimas publicacoes">
              <div className="space-y-4">
                {visibleLogs
                  ?.filter((log) => log.type === 'approval')
                  .slice(0, 5)
                  .map((log) => (
                    <div key={log.id} className="rounded-2xl border border-line bg-slate-50 p-4 text-sm">
                      <div><strong>Data:</strong> {formatDate(log.agreementDate || log.createdAt)}</div>
                      <div><strong>Ata:</strong> {log.agreementNumber || 'Nao informada'}</div>
                      <div><strong>Publicado por:</strong> {log.user?.name || 'Nao informado'}</div>
                    </div>
                  ))}
              </div>
            </SectionCard>
          ) : null}
        </div>
      </section>

      <ApproveDraftDialog
        open={dialogOpen}
        componentCode={component.code}
        agreementDate={agreementDate}
        agreementNumber={agreementNumber}
        signature={approvalSignature}
        hasSignatureConfigured={auth.user?.hasSignatureConfigured}
        hasSignatureFileConfigured={auth.user?.hasSignatureFileConfigured}
        submitting={publishing}
        error={dialogError}
        onChangeAgreementDate={setAgreementDate}
        onChangeAgreementNumber={setAgreementNumber}
        onChangeSignature={setApprovalSignature}
        onClose={() => setDialogOpen(false)}
        onSubmit={handlePublish}
      />
    </div>
  );
};
