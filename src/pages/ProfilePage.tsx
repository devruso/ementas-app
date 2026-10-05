import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

import { FormActions } from '../components/FormActions';
import { FormField } from '../components/FormField';
import { useAuth } from '../contexts/AuthContext';
import { getUserSignatureFilePreview, updateUserEmail, updateUserPassword, updateUserSignature, uploadUserSignatureFile } from '../lib/api';
import { AppError } from '../lib/errors';
import { captureSignatureFile } from '../lib/signatureCanvas';
import { isValidEmail, isValidPassword } from '../lib/validation';

const MAX_SIGNATURE_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const supportedSignatureFileTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

export const ProfilePage = () => {
  const auth = useAuth();
  const signatureCanvasRef = useRef<SignatureCanvas | null>(null);
  const signatureCanvasContainerRef = useRef<HTMLDivElement | null>(null);
  const signatureFileInputRef = useRef<HTMLInputElement | null>(null);
  const [signatureInputMode, setSignatureInputMode] = useState<'file' | 'draw'>('file');
  const [removeSignatureFile, setRemoveSignatureFile] = useState(false);
  const [hasUncapturedDrawing, setHasUncapturedDrawing] = useState(false);
  const [capturingSignature, setCapturingSignature] = useState(false);
  const [previewRevision, setPreviewRevision] = useState(0);
  const drawnSignatureDataRef = useRef('');
  const [signatureCanvasWidth, setSignatureCanvasWidth] = useState(800);
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
    const container = signatureCanvasContainerRef.current;

    if (!container) {
      return;
    }

    const resizeCanvas = () => {
      const signatureCanvas = signatureCanvasRef.current;

      if (signatureCanvas && !signatureCanvas.isEmpty()) {
        drawnSignatureDataRef.current = signatureCanvas.toDataURL('image/png');
      }

      const nextWidth = Math.max(1, Math.round(container.clientWidth - 18));
      setSignatureCanvasWidth((currentWidth) => currentWidth === nextWidth ? currentWidth : nextWidth);
    };

    resizeCanvas();
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(resizeCanvas);
    resizeObserver?.observe(container);
    window.addEventListener('resize', resizeCanvas);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [signatureInputMode]);

  useLayoutEffect(() => {
    if (!drawnSignatureDataRef.current) {
      return;
    }

    signatureCanvasRef.current?.fromDataURL(drawnSignatureDataRef.current, {
      width: signatureCanvasWidth,
      height: 160,
    });
  }, [signatureCanvasWidth, signatureInputMode]);

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

    setPersistedSignaturePreviewUrl('');
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
  }, [auth.user?.signatureFileContentType, auth.user?.signatureFileKey, previewRevision]);

  const activeSignaturePreviewUrl = localSignaturePreviewUrl || (removeSignatureFile ? '' : persistedSignaturePreviewUrl);
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
    setRemoveSignatureFile(false);
    setSignatureMessage('');
    setSignatureError('');
  };

  const handleCaptureDrawnSignature = async () => {
    const signatureCanvas = signatureCanvasRef.current;
    if (!signatureCanvas || signatureCanvas.isEmpty()) {
      setSignatureError('Desenhe a assinatura no quadro antes de capturar o arquivo.');
      return;
    }
    try {
      setCapturingSignature(true);
      setSignatureFile(await captureSignatureFile(signatureCanvas.getCanvas()));
      if (signatureFileInputRef.current) signatureFileInputRef.current.value = '';
      setRemoveSignatureFile(false);
      setHasUncapturedDrawing(false);
      setSignatureError('');
      setSignatureMessage('Desenho capturado. Clique em "Atualizar assinatura" para salvar.');
    } catch (err) {
      setSignatureError((err as Error).message || 'Não foi possível capturar o desenho. Tente novamente.');
      setSignatureMessage('');
    } finally {
      setCapturingSignature(false);
    }
  };

  const handleClearDrawnSignature = () => {
    signatureCanvasRef.current?.clear();
    drawnSignatureDataRef.current = '';
    setHasUncapturedDrawing(false);
    if (signatureInputMode === 'draw') setSignatureFile(null);
    setSignatureMessage('');
    setSignatureError('');
  };

  const handleRemoveSignatureImage = () => {
    handleClearDrawnSignature();
    setSignatureFile(null);
    if (signatureFileInputRef.current) signatureFileInputRef.current.value = '';
    setRemoveSignatureFile(hasSignatureFileConfigured);
    setSignatureMessage(hasSignatureFileConfigured ? 'Imagem removida da prévia. Clique em "Atualizar assinatura" para salvar a remoção.' : '');
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

    if (hasUncapturedDrawing) {
      setSignatureError('Capture a assinatura desenhada antes de salvar.');
      setSignatureMessage('');
      return;
    }

    if (!hasTextualSignature && !signatureFile && !removeSignatureFile) {
      setSignatureError('Nenhuma alteração para salvar. Informe uma nova assinatura textual, selecione uma imagem ou remova a imagem atual.');
      setSignatureMessage('');
      return;
    }

    try {
      setUpdatingSignature(true);
      setSignatureError('');
      if (signatureFile) {
        await uploadUserSignatureFile(signatureFile, hasTextualSignature ? signature.trim() : undefined);
      } else {
        await updateUserSignature(hasTextualSignature ? signature.trim() : undefined, removeSignatureFile);
      }
      await auth.refreshUser();
      setSignature('');
      setSignatureFile(null);
      setRemoveSignatureFile(false);
      handleClearDrawnSignature();
      if (signatureFileInputRef.current) signatureFileInputRef.current.value = '';
      setPreviewRevision((value) => value + 1);
      setSignatureMessage('Assinatura atualizada com sucesso.');
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
          <h1 className="text-2xl font-semibold text-ink">Informações da conta</h1>
          <p className="text-sm leading-7 text-muted">Confira seus dados e atualize seu e-mail.</p>
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
          <h2 className="text-2xl font-semibold text-ink">Alterar senha</h2>
          <p className="text-sm leading-7 text-muted">Escolha uma senha com letras maiúsculas e minúsculas, números e um caractere especial.</p>
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
          <h2 className="text-2xl font-semibold text-ink">Assinatura digital de aprovação</h2>
          <p className="text-sm leading-7 text-muted">
            Configure sua assinatura e a imagem usada nos documentos oficiais. A aprovação de disciplinas é confirmada com a senha da conta.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSignatureSubmit}>
          <FormField
            label="Assinatura"
            type="password"
            value={signature}
            onChange={(event) => setSignature(event.target.value)}
            disabled={updatingSignature || capturingSignature}
            autoComplete="new-password"
            placeholder={hasSignatureConfigured ? 'Assinatura textual já configurada; preencha apenas para alterar' : 'Assinatura textual (opcional)'}
          />
          <p className="text-sm text-muted">
            {hasSignatureConfigured ? 'Assinatura textual salva. Deixe o campo vazio para manter a atual.' : 'Nenhuma assinatura textual configurada. Você pode salvar apenas a imagem.'}
          </p>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-4 rounded-2xl border border-line bg-background p-4">
              <h3 className="font-semibold text-ink">Imagem da assinatura</h3>
              <p className="text-sm text-muted">Envie uma imagem ou desenhe sua assinatura. A imagem salva aparece na prévia ao voltar ao perfil.</p>
              <div className="flex gap-2" role="group" aria-label="Origem da imagem da assinatura">
                {(['file', 'draw'] as const).map((mode) => (
                  <button key={mode} type="button" aria-pressed={signatureInputMode === mode}
                    disabled={updatingSignature || capturingSignature}
                    onClick={() => {
                      if (mode === signatureInputMode) return;
                      setSignatureInputMode(mode);
                      setSignatureFile(null);
                      drawnSignatureDataRef.current = '';
                      setHasUncapturedDrawing(false);
                      setSignatureMessage('');
                      setSignatureError('');
                    }}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold ${signatureInputMode === mode ? 'border-primary-200 bg-primary-50 text-primary-700' : 'border-line bg-white text-ink'}`}>
                    {mode === 'file' ? 'Enviar imagem' : 'Desenhar assinatura'}
                  </button>
                ))}
              </div>
              {signatureInputMode === 'file' ? (
                <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-ink">
                  <span>Arquivo de assinatura (PNG, JPG ou WEBP)</span>
                  <input ref={signatureFileInputRef} type="file" accept=".png,.jpg,.jpeg,.webp" aria-label="Arquivo de assinatura (PNG, JPG ou WEBP)"
                    disabled={updatingSignature} onChange={handleSignatureFileSelection}
                    className="soft-ring min-w-0 rounded-xl border border-line bg-white p-3 text-sm" />
                  <span className="text-xs text-muted">Até 2 MB. Prefira PNG com fundo transparente. Para substituir a imagem salva, escolha um novo arquivo.</span>
                </label>
              ) : (
                <div>
                  <div ref={signatureCanvasContainerRef} className="rounded-2xl border border-line bg-white p-2">
                    <SignatureCanvas ref={signatureCanvasRef} penColor="#0f172a" clearOnResize={false}
                      onEnd={() => {
                        const canvas = signatureCanvasRef.current;
                        if (canvas && !canvas.isEmpty()) {
                          drawnSignatureDataRef.current = canvas.toDataURL('image/png');
                          setHasUncapturedDrawing(true);
                          setSignatureFile(null);
                          setSignatureMessage('');
                          setSignatureError('');
                        }
                      }}
                      canvasProps={{ width: signatureCanvasWidth, height: 160, 'aria-label': 'Quadro para desenhar assinatura', className: `h-40 w-full touch-none rounded-xl ${capturingSignature || updatingSignature ? 'pointer-events-none' : ''}` }} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={handleCaptureDrawnSignature} disabled={capturingSignature || updatingSignature}
                      className="rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700">
                      {capturingSignature ? 'Capturando...' : 'Capturar assinatura desenhada'}
                    </button>
                    <button type="button" onClick={handleClearDrawnSignature} disabled={capturingSignature || updatingSignature}
                      className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink">Limpar desenho</button>
                  </div>
                </div>
              )}
              {signatureFile ? <p className="break-all text-xs text-muted">Imagem selecionada: {signatureFile.name}</p> : null}
            </div>
            <div className="rounded-2xl border border-line bg-background p-4">
              <h3 className="font-semibold text-ink">Prévia da assinatura</h3>
              <p className="mt-2 text-sm text-muted">
                {signatureFile ? 'Nova imagem. Salve para usá-la nos documentos.' : removeSignatureFile ? 'A imagem será removida ao salvar.' : hasSignatureFileConfigured ? 'Imagem salva para uso nos documentos oficiais.' : 'Nenhuma imagem de assinatura salva.'}
              </p>
              <div className="mt-3 flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-line bg-white p-4">
                {activeSignaturePreviewUrl ? (
                  <img src={activeSignaturePreviewUrl} alt="Prévia da assinatura" className="max-h-28 w-full object-contain" />
                ) : <p className="text-center text-sm text-muted">{loadingPersistedSignaturePreview && !removeSignatureFile ? 'Carregando imagem salva...' : signaturePreviewError || 'Envie uma imagem ou capture um desenho para visualizar a assinatura.'}</p>}
              </div>
              {signatureFile || (hasSignatureFileConfigured && !removeSignatureFile) ? (
                <button type="button" onClick={handleRemoveSignatureImage} disabled={updatingSignature || capturingSignature}
                  className="mt-3 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-ink">Remover imagem</button>
              ) : null}
              {removeSignatureFile ? <button type="button" onClick={() => { setRemoveSignatureFile(false); setSignatureMessage(''); }} className="mt-3 text-sm font-semibold text-primary-700">Manter imagem salva</button> : null}
              <p className="mt-3 text-xs text-muted">Alterações valem para novas aprovações. Documentos já aprovados mantêm a assinatura registrada.</p>
              <p className="mt-3 text-xs text-muted">{auth.user?.signatureUpdatedAt ? `Última atualização: ${new Date(auth.user.signatureUpdatedAt).toLocaleString('pt-BR')}` : 'Assinatura ainda não configurada.'}</p>
            </div>
          </div>
          {signatureError ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">{signatureError}</div> : null}
          {signatureMessage ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {signatureMessage}
            </div>
          ) : null}
          <FormActions>
            <button
              type="submit"
              disabled={updatingSignature || capturingSignature}
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
