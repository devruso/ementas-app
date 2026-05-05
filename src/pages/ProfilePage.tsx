import { useState } from 'react';

import { FormActions } from '../components/FormActions';
import { FormField } from '../components/FormField';
import { useAuth } from '../contexts/AuthContext';
import { updateUserEmail, updateUserPassword, updateUserSignature } from '../lib/api';
import { AppError } from '../lib/errors';
import { isValidEmail, isValidPassword } from '../lib/validation';

export const ProfilePage = () => {
  const auth = useAuth();
  const [email, setEmail] = useState(auth.user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [signature, setSignature] = useState('');
  const [signatureMessage, setSignatureMessage] = useState('');
  const [signatureError, setSignatureError] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [updatingSignature, setUpdatingSignature] = useState(false);

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

    if (!signature.trim() || signature.trim().length < 6) {
      setSignatureError('A assinatura deve ter pelo menos 6 caracteres.');
      setSignatureMessage('');
      return;
    }

    try {
      setUpdatingSignature(true);
      setSignatureError('');
      await updateUserSignature(signature.trim());
      setSignature('');
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
          />
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