import { useState } from 'react';

import { previewDraftImport } from '../lib/api';
import { getDisciplineFormInitialValues } from '../lib/componentDraft';
import { AppError } from '../lib/errors';
import type { ImportDraftPreviewResponse } from '../types';

interface DocumentImportCardProps {
  onApplyPreview: (values: ReturnType<typeof getDisciplineFormInitialValues>) => void;
}

export const DocumentImportCard = ({ onApplyPreview }: DocumentImportCardProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ImportDraftPreviewResponse | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await previewDraftImport(file);
      setPreview(response);
    } catch (err) {
      const appError = err as AppError;
      setError(appError.message);
      setPreview(null);
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const handleApplyPreview = () => {
    if (!preview) {
      return;
    }

    onApplyPreview(
      getDisciplineFormInitialValues({
        id: '',
        code: preview.suggestedDraft.code,
        name: preview.suggestedDraft.name,
        department: preview.suggestedDraft.department,
        semester: preview.suggestedDraft.semester,
        modality: preview.suggestedDraft.modality,
        program: preview.suggestedDraft.program,
        objective: preview.suggestedDraft.objective,
        syllabus: preview.suggestedDraft.syllabus,
        methodology: preview.suggestedDraft.methodology,
        learningAssessment: preview.suggestedDraft.learningAssessment,
        bibliography: preview.suggestedDraft.bibliography,
        referencesBasic: preview.suggestedDraft.referencesBasic,
        referencesComplementary: preview.suggestedDraft.referencesComplementary,
        prerequeriments: preview.suggestedDraft.prerequeriments,
        workload: preview.suggestedDraft.workload,
      })
    );
  };

  return (
    <section className="panel interactive-lift min-w-0 p-5 sm:p-6">
      <div className="mb-4 inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
        Importação documental
      </div>
      <h2 className="text-xl font-semibold text-ink">Pré-preencher a disciplina por PDF ou DOCX</h2>
      <p className="mt-2 text-sm leading-7 text-muted">
        Envie um plano de ensino em PDF ou DOCX. O backend sugere os campos para revisão humana antes do salvamento.
      </p>

      <div className="mt-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
        <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-line px-4 py-3 font-semibold text-ink transition hover:bg-slate-50">
          <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileChange} />
          {loading ? 'Processando documento...' : 'Selecionar PDF ou DOCX'}
        </label>
        {preview ? (
          <button
            type="button"
            onClick={handleApplyPreview}
            className="inline-flex items-center justify-center rounded-2xl bg-primary-500 px-4 py-3 font-semibold text-white transition hover:bg-primary-600"
          >
            Aplicar prévia ao formulário
          </button>
        ) : null}
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-danger/20 bg-red-50 px-4 py-3 text-sm text-danger">{error}</div> : null}

      {preview ? (
        <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-3xl border border-line bg-background p-4">
            <div className="mb-3 text-sm font-semibold text-ink">Campos reconhecidos</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-3 text-sm"><strong>Código:</strong> {preview.suggestedDraft.code || 'Nao identificado'}</div>
              <div className="rounded-2xl bg-white p-3 text-sm"><strong>Nome:</strong> {preview.suggestedDraft.name || 'Nao identificado'}</div>
              <div className="rounded-2xl bg-white p-3 text-sm"><strong>Departamento:</strong> {preview.suggestedDraft.department || 'Nao identificado'}</div>
              <div className="rounded-2xl bg-white p-3 text-sm"><strong>Semestre:</strong> {preview.suggestedDraft.semester || 'Nao identificado'}</div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-3xl border border-line bg-background p-4 text-sm">
              <div className="mb-2 font-semibold text-ink">Avisos</div>
              <ul className="space-y-2 break-words text-muted">
                {preview.warnings.length > 0 ? preview.warnings.map((warning) => <li key={warning}>• {warning}</li>) : <li>• Nenhum aviso crítico.</li>}
              </ul>
            </div>
            <div className="rounded-3xl border border-line bg-background p-4 text-sm">
              <div className="mb-2 font-semibold text-ink">Seções não reconhecidas</div>
              <ul className="space-y-2 break-words text-muted">
                {preview.unrecognizedSections.length > 0 ? preview.unrecognizedSections.map((section) => <li key={section}>• {section}</li>) : <li>• Todas as seções esperadas foram encontradas.</li>}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};