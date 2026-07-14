import { useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

import { FormActions } from '../components/FormActions';
import { FormField } from '../components/FormField';
import { useAuth } from '../contexts/AuthContext';
import { getUserSignatureFilePreview, updateUserEmail, updateUserPassword, updateUserSignature, uploadUserSignatureFile } from '../lib/api';
import { AppError } from '../lib/errors';
import { isValidEmail, isValidPassword } from '../lib/validation';

const MAX_SIGNATURE_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const supportedSignatureFileTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

export const ProfilePage = () => {
  const auth = useAuth();
  const signatureCanvasRef = useRef<SignatureCanvas | null>(null);
  const [email, setEmail] = useState(auth.user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [signature, setSignature] = useState('');
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signatureMessage, setSignatureMessage] = useState('');
  const [signatureError, setSignatureError] = useState('');
  const [persistedSignaturePreviewUrl, setPersistedSignaturePreviewUrl] = useState('');
  const [localSignaturePreviewUrl, setLocalSignaturePreviewUrl] = useState('');
  const [signaturePreviewError, setSignaturePreviewError] = useState('');
  const [loadingPersistedSignaturePreview, setLoadingPersistedSignaturePreview] = useState(false);
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [updatingSignature, setUpdatingSignature] = useState(false);

  useEffect(() => {
    setEmail(auth.user?.email || '');
  }, [auth.user?.email]);

  useEffect(() => {
    if (!signatureFile) {
      setLocalSignaturePreviewUrl('');
      return;
    }

    const previewUrl = URL.createObjectURL(signatureFile);
    setLocalSignaturePreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [signatureFile]);

  useEffect(() => {
    if (!auth.user?.signatureFileKey || !auth.user.signatureFileContentType?.startsWith('image/')) {
      setPersistedSignaturePreviewUrl('');
      setSignaturePreviewError('');
      setLoadingPersistedSignaturePreview(false);
      return;
    }

    let isMounted = true;
    let previewUrl = '';

    setLoadingPersistedSignaturePreview(true);
    setSignaturePreviewError('');

    getUserSignatureFilePreview()
      .then((signatureBlob) => {
        if (!isMounted) {
          return;
        }

        previewUrl = URL.createObjectURL(signatureBlob);
        setPersistedSignaturePreviewUrl(previewUrl);
      })
      .catch((err) => {
        if (!isMounted) {
          return;
        }

        const appError = err as AppError;
        setPersistedSignaturePreviewUrl('');
        setSignaturePreviewError(appError.message || 'Não foi possível carregar a assinatura persistida.');
      })
      .finally(() => {
        if (isMounted) {
          setLoadingPersistedSignaturePreview(false);
        }
      });

    return () => {
      isMounted = false;

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [auth.user?.signatureFileContentType, auth.user?.signatureFileKey]);

  const activeSignaturePreviewUrl = localSignaturePreviewUrl || persistedSignaturePreviewUrl;
  const hasSignatureConfigured = Boolean(auth.user?.hasSignatureConfigured);
  const hasSignatureFileConfigured = Boolean(auth.user?.hasSignatureFileConfigured);

  const handleSignatureFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;

    if (!selectedFile) {
      setSignatureFile(null);
      return;
    }

    if (!supportedSignatureFileTypes.has(selectedFile.type)) {
      setSignatureFile(null);
      setSignatureMessage('');
      setSignatureError('Formato de assinatura nao suportado. Envie PNG, JPG ou WEBP.');
      event.target.value = '';
      return;
    }

    if (selectedFile.size > MAX_SIGNATURE_FILE_SIZE_BYTES) {
      setSignatureFile(null);
      setSignatureMessage('');
      setSignatureError('Arquivo de assinatura excede 2MB.');
      event.target.value = '';
      return;
    }

    setSignatureFile(selectedFile);
    setSignatureError('');
  };

  const handleCaptureDrawnSignature = async () => {
    const signatureCanvas = signatureCanvasRef.current;

    if (!signatureCanvas || signatureCanvas.isEmpty()) {
      setSignatureError('Desenhe a assinatura no quadro antes de capturar o arquivo.');
      return;
    }

    const trimmedCanvas = signatureCanvas.getTrimmedCanvas();
    const blob = await new Promise<Blob | null>((resolve) => {
      trimmedCanvas.toBlob((generatedBlob) => resolve(generatedBlob), 'image/png');
    });

    if (!blob) {
      setSignatureError('Não foi possível capturar a assinatura desenhada. Tente novamente.');
      return;
    }

    const generatedFile = new File([blob], `assinatura-${Date.now()}.png`, { type: 'image/png' });
    setSignatureFile(generatedFile);
    setSignatureError('');
    setSignatureMessage('Assinatura desenhada capturada. Clique em "Atualizar assinatura" para persistir.');
  };

  const handleClearDrawnSignature = () => {
    signatureCanvasRef.current?.clear();
  };

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isValidEmail(email)) {
      setEmailError('Informe um e-mail valido.');
      setEmailMessage('');
      return;
    }

    try {
      setUpdatingEmail(true);
      setEmailError('');
      await updateUserEmail(email);
      await auth.refreshUser();
      setEmailMessage('E-mail atualizado com sucesso.');
    } catch (err) {
      const appError = err as AppError;
      setEmailError(appError.message);
      setEmailMessage('');
    } finally {
      setUpdatingEmail(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isValidPassword(password)) {
      setPasswordError('A senha deve ter 8 a 20 caracteres, com letra maiuscula, minuscula, numero e caractere especial.');
      setPasswordMessage('');
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('As senhas devem ser iguais.');
      setPasswordMessage('');
      return;
    }

    try {
      setUpdatingPassword(true);
      setPasswordError('');
      await updateUserPassword(password);
      setPassword('');
      setConfirmPassword('');
      setPasswordMessage('Senha atualizada com sucesso.');
    } catch (err) {
      const appError = err as AppError;
      setPasswordError(appError.message);
      setPasswordMessage('');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSignatureSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const hasTextualSignature = Boolean(signature.trim());

    if (hasTextualSignature && signature.trim().length < 6) {
      setSignatureError('A assinatura deve ter pelo menos 6 caracteres.');
      setSignatureMessage('');
      return;
    }

    if (!hasTextualSignature && !signatureFile) {
      setSignatureError('Informe uma assinatura textual ou envie um arquivo de assinatura.');
      setSignatureMessage('');
      return;
    }

    try {
      setUpdatingSignature(true);
      setSignatureError('');
      if (signatureFile) {
        await uploadUserSignatureFile(signatureFile, hasTextualSignature ? signature.trim() : undefined);
      } else {
        await updateUserSignature(signature.trim());
      }
      setSignature('');
      setSignatureFile(null);
      setSignatureMessage('Assinatura atualizada com sucesso.');
      await auth.refreshUser();
    } catch (err) {
      const appError = err as AppError;
      setSignatureError(appError.message);
      setSignatureMessage('');
    } finally {
      setUpdatingSignature(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="panel p-6 sm:p-8">
        <div className="mb-6 space-y-2">
          <div className="inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
            Perfil
          </div>
          <h1 className="text-2xl font-semibold text-ink">Informacoes da conta</h1>
          <p className="text-sm leading-7 text-muted">Atualize seu e-mail sem alterar o backend atual.</p>
        </div>

        <form className="space-y-5" onSubmit={handleEmailSubmit}>
          <FormField label="Nome" value={auth.user?.name || ''} disabled />
          <FormField label="E-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} error={emailError || undefined} />
          {emailMessage ? <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{emailMessage}</div> : null}
          <FormActions>
            <button
              type="submit"
              disabled={updatingEmail}
              className="inline-flex items-center justify-center rounded-2xl bg-primary-500 px-5 py-3 font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updatingEmail ? 'Atualizando...' : 'Atualizar e-mail'}
            </button>
          </FormActions>
        </form>
      </section>

      <section className="panel p-6 sm:p-8">
        <div className="mb-6 space-y-2">
          <div className="inline-flex rounded-full bg-secondary-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-secondary-700">
            Seguranca
          </div>
          <h2 className="text-2xl font-semibold text-ink">Alterar senha</h2>
          <p className="text-sm leading-7 text-muted">Mantenha o mesmo padrao de validacao usado no front-end anterior.</p>
        </div>

        <form className="space-y-5" onSubmit={handlePasswordSubmit}>
          <FormField label="Nova senha" type="password" value={password} onChange={(event) => setPassword(event.target.value)} error={passwordError || undefined} />
          <FormField label="Confirmar nova senha" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          {passwordMessage ? <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{passwordMessage}</div> : null}
          <FormActions>
            <button
              type="submit"
              disabled={updatingPassword}
              className="inline-flex items-center justify-center rounded-2xl bg-primary-500 px-5 py-3 font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updatingPassword ? 'Atualizando...' : 'Atualizar senha'}
            </button>
          </FormActions>
        </form>
      </section>

      <section className="panel p-6 sm:p-8 xl:col-span-2">
        <div className="mb-6 space-y-2">
          <div className="inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
            Publicação oficial
          </div>
          <h2 className="text-2xl font-semibold text-ink">Assinatura digital de aprovação</h2>
          <p className="text-sm leading-7 text-muted">
            Esta assinatura é validada no backend para publicar oficialmente uma disciplina.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSignatureSubmit}>
          <FormField
            label="Assinatura"
            type="password"
            value={signature}
            onChange={(event) => setSignature(event.target.value)}
            error={signatureError || undefined}
            placeholder="Assinatura textual (opcional se houver arquivo)"
          />
          <label className="flex min-w-0 w-full flex-col gap-2 text-sm font-medium text-ink">
            <span>Arquivo de assinatura (PNG, JPG ou WEBP)</span>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              onChange={handleSignatureFileSelection}
              className="soft-ring h-14 min-w-0 rounded-2xl border border-transparent bg-background px-4 text-sm text-ink shadow-sm"
            />
          </label>
          <div className="rounded-2xl border border-line bg-background px-4 py-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink/70">Assinatura desenhada (opcional)</div>
            <div className="rounded-2xl border border-line bg-white p-2">
              <SignatureCanvas
                ref={signatureCanvasRef}
                penColor="#0f172a"
                canvasProps={{
                  className: 'h-40 w-full rounded-xl bg-white',
                }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCaptureDrawnSignature}
                className="inline-flex items-center justify-center rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700 transition hover:bg-primary-100"
              >
                Capturar assinatura desenhada
              </button>
              <button
                type="button"
                onClick={handleClearDrawnSignature}
                className="inline-flex items-center justify-center rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:bg-slate-50"
              >
                Limpar desenho
              </button>
            </div>
            {signatureFile ? (
              <div className="mt-2 text-xs text-ink/70">Arquivo pronto para envio: {signatureFile.name}</div>
            ) : null}
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <div className="rounded-2xl border border-line bg-background px-4 py-3 text-xs text-ink/80">
              <div className="font-semibold uppercase tracking-[0.12em] text-ink/70">Status atual da assinatura</div>
              <div className="mt-2 space-y-1">
                <div>Assinatura textual para publicar: {hasSignatureConfigured ? 'Pronta' : 'Pendente'}</div>
                <div>Assinatura visual para DOCX: {hasSignatureFileConfigured ? 'Pronta' : 'Pendente'}</div>
                <div>Assinatura textual atualizada em: {auth.user?.signatureUpdatedAt ? new Date(auth.user.signatureUpdatedAt).toLocaleString('pt-BR') : 'Não configurada'}</div>
                <div>Arquivo persistido: {auth.user?.signatureFileKey || 'Não configurado'}</div>
                <div>Tipo de arquivo: {auth.user?.signatureFileContentType || 'Não informado'}</div>
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-background px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/70">Preview visual</div>
                  <div className="mt-1 text-xs text-ink/70">
                    {signatureFile ? 'Prévia local do arquivo selecionado para envio.' : 'Assinatura persistida atualmente no perfil e usada no DOCX oficial quando você for o aprovador.'}
                  </div>
                </div>
                {loadingPersistedSignaturePreview && !signatureFile ? (
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-600">Carregando...</div>
                ) : null}
              </div>
              <div className="mt-3 flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-line bg-white p-4">
                {activeSignaturePreviewUrl ? (
                  <img
                    src={activeSignaturePreviewUrl}
                    alt="Prévia da assinatura"
                    className="max-h-28 w-full object-contain"
                  />
                ) : (
                  <div className="text-center text-xs leading-6 text-ink/60">
                    {signaturePreviewError || 'Envie ou capture uma assinatura em imagem para validar visualmente o resultado oficial.'}
                  </div>
                )}
              </div>
            </div>
          </div>
          {signatureMessage ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {signatureMessage}
            </div>
          ) : null}
          <FormActions>
            <button
              type="submit"
              disabled={updatingSignature}
              className="inline-flex items-center justify-center rounded-2xl bg-primary-500 px-5 py-3 font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updatingSignature ? 'Atualizando...' : 'Atualizar assinatura'}
            </button>
          </FormActions>
        </form>
      </section>
    </div>
  );
};
