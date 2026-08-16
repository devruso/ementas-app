import { ArrowLeft, Check, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { PublicationContext } from '../types';
import type { AppError } from '../lib/errors';
import { ErrorNotice } from './ErrorNotice';
import { FormActions } from './FormActions';
import { FormField } from './FormField';

interface ApproveDraftDialogProps {
  open: boolean;
  componentCode: string;
  context?: PublicationContext | null;
  password: string;
  loadingContext: boolean;
  submitting: boolean;
  error?: AppError | null;
  onChangePassword: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

const formatAgreementDate = (value?: string) => {
  if (!value) {
    return 'Aguardando geração';
  }

  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value));
};

export const ApproveDraftDialog = ({
  open,
  componentCode,
  context,
  password,
  loadingContext,
  submitting,
  error,
  onChangePassword,
  onClose,
  onSubmit,
}: ApproveDraftDialogProps) => {
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (open) {
      setStep(1);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const canContinue = Boolean(context) && !loadingContext;
  const canPublish = canContinue && Boolean(password) && !submitting;

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-slate-950/55 p-3 sm:items-center sm:justify-center sm:p-6">
      <div className="panel w-full max-w-lg p-5 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="publish-dialog-title">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase text-primary-700">Etapa {step} de 2</div>
            <h2 id="publish-dialog-title" className="mt-1 text-xl font-semibold text-ink">
              Publicar {componentCode}
            </h2>
          </div>
          <div className="text-sm font-medium text-muted">{step === 1 ? 'Revisão' : 'Confirmação'}</div>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            {loadingContext ? (
              <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Gerando os dados da publicação...
              </div>
            ) : context ? (
              <>
                <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-x-4 gap-y-3 border-y border-line py-4 text-sm">
                  <dt className="text-muted">Docente responsável</dt>
                  <dd className="text-right font-semibold text-ink">{context.approverName}</dd>
                  <dt className="text-muted">Data da aprovação</dt>
                  <dd className="text-right font-semibold text-ink">{formatAgreementDate(context.agreementDate)}</dd>
                  <dt className="text-muted">Número da ATA</dt>
                  <dd className="text-right font-semibold text-ink">{context.agreementNumber}</dd>
                  <dt className="text-muted">Assinatura no DOCX</dt>
                  <dd className="text-right font-semibold text-ink">
                    {context.hasVisualSignature ? 'Imagem configurada' : 'Linha nominal, sem imagem'}
                  </dd>
                </dl>
                <p className="text-xs leading-5 text-muted">
                  A ATA segue a sequência anual global <strong>ATA-ANO-NÚMERO</strong>. A imagem da assinatura é opcional nesta etapa.
                  {!context.hasVisualSignature ? (
                    <Link to="/perfil" className="ml-1 font-semibold text-primary-700 underline">Adicionar no perfil</Link>
                  ) : null}
                </p>
              </>
            ) : null}

            <ErrorNotice error={error} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-y border-line py-4 text-sm leading-6 text-ink">
              Confirme a publicação oficial de <strong>{componentCode}</strong> como <strong>{context?.approverName}</strong>.
              O rascunho será preservado caso a confirmação falhe.
            </div>
            <FormField
              autoFocus
              autoComplete="current-password"
              label="Senha de login"
              type="password"
              value={password}
              onChange={(event) => onChangePassword(event.target.value)}
            />
            <ErrorNotice error={error} />
          </div>
        )}

        <FormActions>
          {step === 1 ? (
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex items-center justify-center border border-line px-5 py-3 font-semibold text-ink transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 border border-line px-5 py-3 font-semibold text-ink transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          )}
          <button
            type="button"
            onClick={step === 1 ? () => setStep(2) : onSubmit}
            disabled={step === 1 ? !canContinue : !canPublish}
            className="inline-flex items-center justify-center gap-2 bg-primary-500 px-5 py-3 font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {step === 1 ? 'Continuar' : (submitting ? 'Publicando...' : 'Confirmar publicação')}
          </button>
        </FormActions>
      </div>
    </div>
  );
};
