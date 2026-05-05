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
import { formatDate, formatWorkload } from '../lib/format';
import { AppError } from '../lib/errors';
import type { Component, PublicShare } from '../types';

const prerequerimentCodeRegex = /\b[A-Z]{2,4}[0-9]{2,4}\b/g;

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
      setDialogError(appError.message);
    } finally {
      setPublishing(false);
    }
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

  const latestApproval = (logs || component.logs || []).find((log) => log.type === 'approval');
  const showingDraft = auth.isAuthenticated && !showPublishedVersion && !!component.draft;
  const activeComponent = showingDraft && component.draft ? component.draft : component;
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
            <h2 className="text-3xl font-semibold text-ink">{activeComponent.name}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
              {activeComponent.syllabus || activeComponent.program || 'Disciplina sem resumo publico informado.'}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-line bg-slate-50 px-4 py-2 text-sm">
                Departamento: {activeComponent.department || 'Nao informado'}
              </span>
              <span className="rounded-full border border-line bg-slate-50 px-4 py-2 text-sm">
                Semestre: {activeComponent.semester || 'Nao informado'}
              </span>
              <span className="rounded-full border border-line bg-slate-50 px-4 py-2 text-sm">
                Modalidade: {activeComponent.modality || 'Nao informado'}
              </span>
            </div>

            {auth.isAuthenticated ? (
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to={`/disciplinas/${component.code.toLowerCase()}/editar`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-line px-4 py-3 text-sm font-semibold text-ink transition hover:bg-slate-50"
                >
                  <FilePenLine className="h-4 w-4 text-primary-600" />
                  Editar disciplina
                </Link>

                {component.draft?.id ? (
                  <button
                    type="button"
                    onClick={() => setDialogOpen(true)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-600"
                  >
                    <ScrollText className="h-4 w-4" />
                    Publicar
                  </button>
                ) : null}

                {component.draft?.id ? (
                  <button
                    type="button"
                    onClick={() => setShowPublishedVersion((current) => !current)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-slate-50"
                  >
                    <Eye className="h-4 w-4 text-secondary-700" />
                    {showPublishedVersion ? 'Ver rascunho salvo' : 'Ver versao publicada'}
                  </button>
                ) : null}

                {component.draft?.id ? (
                  <div className="inline-flex items-center rounded-2xl border border-line bg-slate-50 px-4 py-3 text-sm text-ink/80">
                    Mostrando agora: {showingDraft ? 'rascunho salvo' : 'publicacao oficial'}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleCreatePublicShare}
                  disabled={creatingShare}
                  className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingShare ? 'Gerando link público...' : 'Compartilhar público temporário'}
                </button>
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

          <div className="rounded-3xl bg-ink p-5 text-white">
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
              Exportacao oficial
            </div>
            <div className="space-y-3 text-sm text-white/80">
              <div>
                Ultima aprovacao: {latestApproval ? formatDate(latestApproval.agreementDate) : 'Nao encontrada'}
              </div>
              <div>
                Ata ou referencia: {latestApproval?.agreementNumber || 'Nao informada'}
              </div>
              <div>
                Publicado por: {latestApproval?.user?.name || 'Nao informado'}
              </div>
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary-500 px-4 py-3 font-semibold text-secondary-700 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Exportando PDF oficial...' : 'Exportar PDF oficial'}
            </button>

            <button
              type="button"
              onClick={handleExportDoc}
              disabled={exportingDoc}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 px-4 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileText className="h-4 w-4" />
              {exportingDoc ? 'Exportando DOCX...' : 'Exportar DOCX'}
            </button>

            {showingDraft ? (
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                Visualizando rascunho autenticado. Alterne para a versao publicada quando quiser conferir o conteudo oficial.
              </div>
            ) : null}

            <Link
              to="/disciplinas"
              className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-white/20 px-4 py-3 text-sm text-white/86 transition hover:bg-white/10"
            >
              Voltar para inicio
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <SectionCard title="Ementa">{activeComponent.syllabus || 'Nao informada.'}</SectionCard>
          <SectionCard title="Objetivos">{activeComponent.objective || 'Nao informados.'}</SectionCard>
          <SectionCard title="Conteudo programatico">{activeComponent.program || 'Nao informado.'}</SectionCard>
          <SectionCard title="Metodologia">{activeComponent.methodology || 'Nao informada.'}</SectionCard>
          <SectionCard title="Avaliacao da aprendizagem">
            {activeComponent.learningAssessment || 'Nao informada.'}
          </SectionCard>
          <SectionCard title="Bibliografia">{activeComponent.bibliography || 'Nao informada.'}</SectionCard>
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
              </div>
              <div className="rounded-2xl border border-line bg-slate-50 p-4">
                <div className="mb-2 font-semibold">Docente</div>
                <div>Teoria: {formatWorkload(activeComponent.workload?.teacherTheory)}</div>
                <div>Pratica: {formatWorkload(activeComponent.workload?.teacherPractice)}</div>
                <div>T/P: {formatWorkload(activeComponent.workload?.teacherTheoryPractice)}</div>
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