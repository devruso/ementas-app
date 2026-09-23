import { ArrowLeft, Check, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicationFieldIds } from '../lib/pendingFields';

import type { PublicationApproval, PublicationContext } from '../types';
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
  onSubmit: (approval: PublicationApproval) => void;
}

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
  const [agreementDate, setAgreementDate] = useState('');
  const [agreementNumber, setAgreementNumber] = useState('');

  useEffect(() => {
    if (open) {
      setStep(1);
    }
  }, [open]);

  useEffect(() => {
    if (!context) return;
    setAgreementDate(context.agreementDate.slice(0, 10));
    setAgreementNumber(String(Number(context.agreementNumber.match(/(\d+)$/)?.[1] || '')));
  }, [context]);

  if (!open) {
    return null;
  }

  const numericAgreementNumber = Number(agreementNumber);
  const canContinue = Boolean(context && agreementDate) && Number.isInteger(numericAgreementNumber) && numericAgreementNumber > 0 && !loadingContext;
  const canPublish = canContinue && Boolean(password) && !submitting;

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-slate-950/55 p-3 sm:items-center sm:justify-center sm:p-6">
      <div className="panel max-h-[90dvh] w-full max-w-lg overflow-y-auto p-5 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="publish-dialog-title">
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
                <dl className="grid gap-4 border-y border-line py-4 text-sm sm:grid-cols-2">
                  <dt className="text-muted">Docente responsável</dt>
                  <dd className="text-right font-semibold text-ink">{context.approverName}</dd>
                  <div>
                    <FormField label="Data da aprovação" type="date" value={agreementDate} onChange={(event) => setAgreementDate(event.target.value)} />
                  </div>
                  <div>
                    <FormField label="Número da ATA" type="number" min={1} step={1} value={agreementNumber} onChange={(event) => setAgreementNumber(event.target.value)} />
                    <p className="mt-2 text-xs text-muted">{context.agreementNumber}</p>
                  </div>
                  <dt className="text-muted">Assinatura no DOCX</dt>
                  <dd className="text-right font-semibold text-ink">
                    {context.hasVisualSignature ? 'Imagem configurada' : 'Linha nominal, sem imagem'}
                  </dd>
                </dl>
                <p className="text-xs leading-5 text-muted">
                  A data já vem preenchida e pode ser alterada. O número informado será registrado no formato <strong>ATA-ANO-NÚMERO</strong>. A imagem da assinatura é opcional nesta etapa.
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

        {error?.code?.startsWith('PUBLICATION_') && (Array.isArray(error.details?.fields) || error.code.includes('REFERENCE')) ? (
          <Link
            className="my-4 inline-flex font-semibold text-primary-700 underline"
            to={`/disciplinas/${componentCode.toLowerCase()}/editar?campo=${publicationFieldIds[String((error.details?.fields as unknown[])?.[0])] || 'referencesBasic'}`}
            onClick={onClose}
          >Visualizar campos pendentes</Link>
        ) : null}
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
            onClick={step === 1 ? () => setStep(2) : () => onSubmit({ password, agreementDate, agreementNumber: numericAgreementNumber })}
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
