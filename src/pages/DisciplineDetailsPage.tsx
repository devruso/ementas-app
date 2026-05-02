import { Download, Eye, FilePenLine, FileText, History, ScrollText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ApproveDraftDialog } from '../components/ApproveDraftDialog';
import { SectionCard } from '../components/SectionCard';
import { useAuth } from '../contexts/AuthContext';
import {
  approveComponentDraft,
  exportComponentDocx,
  exportComponentPdf,
  getComponentByCode,
  getComponentDrafts,
  getComponentLogs,
  getComponents,
} from '../lib/api';
import { formatDate, formatWorkload } from '../lib/format';
import { AppError } from '../lib/errors';
import type { Component } from '../types';

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
  const [showPublishedVersion, setShowPublishedVersion] = useState(false);
  const [component, setComponent] = useState<Component | null>(null);
  const [logs, setLogs] = useState<Component['logs']>([]);
  const [knownCodes, setKnownCodes] = useState<Set<string>>(new Set());

  const code = useMemo(() => params.componentCode?.toUpperCase() || '', [params.componentCode]);

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
      const logResponse = await getComponentLogs(currentComponent.id, {
        page: 0,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });

      setLogs(logResponse.results);
    } else {
      setLogs(currentComponent.logs || []);
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

    if (!agreementDate || !agreementNumber.trim()) {
      setDialogError('Informe a data e o numero da ATA.');
      return;
    }

    try {
      setPublishing(true);
      setDialogError('');
      await approveComponentDraft(component.draft.id, {
        agreementDate: new Date(agreementDate).toISOString(),
        agreementNumber,
      });
      setDialogOpen(false);
      setShowPublishedVersion(true);
      await loadComponent();
    } catch (err) {
      const appError = err as AppError;
      setDialogError(appError.message);
    } finally {
      setPublishing(false);
    }
  };

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
  const officialVersionCode = latestApproval?.versionCode
    || (latestApproval?.agreementDate && latestApproval?.agreementNumber
      ? `${new Date(latestApproval.agreementDate).toLocaleDateString('pt-BR').replace(/\//g, '')}${latestApproval.agreementNumber}`
      : null);
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
                    {showPublishedVersion ? 'Ver rascunho' : 'Ver versao publicada'}
                  </button>
                ) : null}
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
                Versao oficial: {officialVersionCode || 'Nao gerada'}
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
              Voltar para a lista
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
          <SectionCard title="Versao oficial publicada">
            <div className="space-y-3">
              <div><strong>Ementa oficial:</strong> {component.syllabus || 'Nao informada.'}</div>
              <div><strong>Conteudo programatico oficial:</strong> {component.program || 'Nao informado.'}</div>
              <div>
                <strong>Referencia de aprovacao:</strong>{' '}
                {latestApproval?.agreementNumber
                  ? `${formatDate(latestApproval.agreementDate)} - ATA ${latestApproval.agreementNumber}`
                  : 'Nao encontrada'}
              </div>
              <div><strong>Codigo de versao:</strong> {officialVersionCode || 'Nao gerado'}</div>
            </div>
          </SectionCard>

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

          <SectionCard title="Historico oficial">
            <div className="space-y-4">
              {(visibleLogs?.length ?? 0) > 0 ? (
                visibleLogs?.slice(0, 10).map((log) => (
                  <div key={log.id} className="rounded-2xl border border-line bg-slate-50 p-4">
                    <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-600">
                      <History className="h-3.5 w-3.5" />
                      {log.type}
                    </div>
                    <div className="text-sm text-ink">
                      {log.description || 'Alteracao registrada sem descricao adicional.'}
                    </div>
                    {log.versionCode ? (
                      <div className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-primary-600">
                        Versao oficial: {log.versionCode}
                      </div>
                    ) : null}
                    <div className="mt-2 text-xs text-muted">
                      {formatDate(log.createdAt)}
                      {log.user?.name ? ` · ${log.user.name}` : ''}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted">Nenhum log publico disponivel.</div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Escopo desta migracao">
            <div className="flex items-start gap-3">
              <ScrollText className="mt-1 h-4 w-4 shrink-0 text-secondary-700" />
              <p>
                Este slice já cobre consulta pública, autenticação, perfil, gestão de usuários, cadastro novo,
                importação documental e aprovação formal. O template IC045 segue único tanto no PDF quanto no .docx.
              </p>
            </div>
          </SectionCard>
        </div>
      </section>

      <ApproveDraftDialog
        open={dialogOpen}
        componentCode={component.code}
        agreementDate={agreementDate}
        agreementNumber={agreementNumber}
        submitting={publishing}
        error={dialogError}
        onChangeAgreementDate={setAgreementDate}
        onChangeAgreementNumber={setAgreementNumber}
        onClose={() => setDialogOpen(false)}
        onSubmit={handlePublish}
      />
    </div>
  );
};