import { Check, Copy, ExternalLink, Link2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface InviteLinkCardProps {
  inviteLink: string;
  feedback?: string;
  error?: string;
  onClear: () => void;
}

export const InviteLinkCard = ({ inviteLink, feedback, error, onClear }: InviteLinkCardProps) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    setCopied(false);
    setCopyError(false);
  }, [inviteLink]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  };

  return (
    <aside
      aria-label="Resultado do convite"
      className="flex min-h-[292px] min-w-0 flex-col rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50/80 via-white to-white p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-sm">
          <Link2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">Compartilhamento</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">Link de convite</h2>
        </div>
      </div>

      {inviteLink ? (
        <div className="mt-5 flex flex-1 flex-col motion-rise">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Convite pronto
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            Compartilhe este endereço para que o novo usuário conclua o cadastro.
          </p>

          <div className="mt-4 flex min-w-0 items-center gap-2 rounded-2xl border border-primary-100 bg-white p-2 pl-3 shadow-sm">
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-primary-700" title={inviteLink}>
              {inviteLink}
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500 text-white transition hover:bg-primary-600"
              aria-label={copied ? 'Link copiado' : 'Copiar link do convite'}
            >
              {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>

          {feedback ? <p className="mt-3 text-sm leading-6 text-emerald-700" role="status">{feedback}</p> : null}
          {error ? <p className="mt-3 text-sm leading-6 text-danger" role="alert">{error}</p> : null}
          {copyError ? (
            <p className="mt-3 text-sm leading-6 text-danger" role="alert">
              Não foi possível copiar automaticamente. Selecione o endereço e copie manualmente.
            </p>
          ) : null}

          <div className="mt-auto flex flex-wrap gap-2 pt-5">
            <a
              href={inviteLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary-200 bg-white px-3 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-50"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Abrir
            </a>
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted transition hover:bg-slate-100 hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Limpar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center py-7">
          <p className="text-base font-semibold text-ink">Nenhum convite gerado</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
            O link aparecerá neste espaço após a geração manual ou o envio por e-mail, sem alterar o restante da página.
          </p>
          {error ? <p className="mt-4 text-sm leading-6 text-danger" role="alert">{error}</p> : null}
        </div>
      )}
    </aside>
  );
};
