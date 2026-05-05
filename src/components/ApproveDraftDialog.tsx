import { FormActions } from './FormActions';
import { FormField } from './FormField';

interface ApproveDraftDialogProps {
  open: boolean;
  componentCode: string;
  agreementDate: string;
  agreementNumber: string;
  signature: string;
  submitting: boolean;
  error?: string;
  onChangeAgreementDate: (value: string) => void;
  onChangeAgreementNumber: (value: string) => void;
  onChangeSignature: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export const ApproveDraftDialog = ({
  open,
  componentCode,
  agreementDate,
  agreementNumber,
  signature,
  submitting,
  error,
  onChangeAgreementDate,
  onChangeAgreementNumber,
  onChangeSignature,
  onClose,
  onSubmit,
}: ApproveDraftDialogProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-slate-950/55 p-3 sm:items-center sm:justify-center sm:p-6">
      <div className="panel w-full max-w-lg p-5 sm:p-6">
        <div className="mb-6">
          <div className="mb-2 inline-flex rounded-full bg-secondary-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-secondary-700">
            Publicacao oficial
          </div>
          <h2 className="text-2xl font-semibold text-ink">Publicar {componentCode}</h2>
          <p className="mt-2 text-sm leading-7 text-muted">Informe os dados formais da aprovacao antes de publicar a disciplina.</p>
        </div>

        <div className="space-y-4">
          <FormField
            label="Data da ATA"
            type="date"
            value={agreementDate}
            onChange={(event) => onChangeAgreementDate(event.target.value)}
          />
          <FormField
            label="Numero da ATA"
            value={agreementNumber}
            onChange={(event) => onChangeAgreementNumber(event.target.value)}
          />
          <FormField
            label="Assinatura de aprovação"
            type="password"
            value={signature}
            onChange={(event) => onChangeSignature(event.target.value)}
          />
          {error ? <div className="rounded-2xl border border-danger/20 bg-red-50 px-4 py-3 text-sm text-danger">{error}</div> : null}
        </div>

        <FormActions>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-2xl border border-line px-5 py-3 font-semibold text-ink transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-2xl bg-primary-500 px-5 py-3 font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Publicando...' : 'Publicar'}
          </button>
        </FormActions>
      </div>
    </div>
  );
};