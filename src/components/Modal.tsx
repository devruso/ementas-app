import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}

export const Modal = ({ open, title, description, children, onClose }: ModalProps) => {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="panel max-h-[90dvh] w-full max-w-2xl overflow-y-auto p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-xl font-semibold text-ink sm:text-2xl">{title}</h2>
            {description ? <p id={descriptionId} className="mt-2 text-sm leading-6 text-muted">{description}</p> : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="soft-ring rounded-full p-2 text-muted transition hover:bg-slate-100 hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
};
