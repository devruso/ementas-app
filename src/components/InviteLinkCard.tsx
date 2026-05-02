interface InviteLinkCardProps {
  inviteLink: string;
  onClose: () => void;
}

export const InviteLinkCard = ({ inviteLink, onClose }: InviteLinkCardProps) => {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink);
  };

  return (
    <div className="panel min-w-0 overflow-hidden p-5 sm:p-6">
      <div className="mb-3 inline-flex rounded-full bg-secondary-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-secondary-700">
        Convite gerado
      </div>
      <p className="mb-4 text-sm leading-7 text-muted">Envie este link para que o novo usuário conclua o cadastro.</p>
      <div className="min-w-0 rounded-2xl border border-line bg-background px-4 py-3 text-sm text-primary-600">
        <p className="break-all">{inviteLink}</p>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-2xl border border-line px-4 py-3 font-semibold text-ink transition hover:bg-slate-50"
        >
          Fechar
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center justify-center rounded-2xl bg-primary-500 px-4 py-3 font-semibold text-white transition hover:bg-primary-600"
        >
          Copiar link
        </button>
        <a
          href={inviteLink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-2xl border border-line px-4 py-3 font-semibold text-ink transition hover:bg-slate-50"
        >
          Abrir link
        </a>
      </div>
    </div>
  );
};