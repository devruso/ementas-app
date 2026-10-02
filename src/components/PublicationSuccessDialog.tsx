import { CheckCircle2 } from 'lucide-react';

import { Modal } from './Modal';

interface PublicationSuccessDialogProps {
  open: boolean;
  componentCode: string;
  onClose: () => void;
}

export const PublicationSuccessDialog = ({
  open,
  componentCode,
  onClose,
}: PublicationSuccessDialogProps) => (
  <Modal
    open={open}
    title="Publicação concluída"
    description={`A ementa ${componentCode} foi publicada oficialmente com sucesso.`}
    onClose={onClose}
  >
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-800" role="status">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p className="text-sm leading-6">
          A versão publicada já está disponível para consulta e exportação em PDF ou DOCX.
        </p>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-2xl bg-primary-500 px-5 py-3 font-semibold text-white transition hover:bg-primary-600"
        >
          Ver versão publicada
        </button>
      </div>
    </div>
  </Modal>
);
