import { useState } from 'react';

import { FormActions } from '../components/FormActions';
import { FormField } from '../components/FormField';
import { useAuth } from '../contexts/AuthContext';
import { AppError } from '../lib/errors';
import { isValidEmail } from '../lib/validation';

export const ForgotPasswordPage = () => {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isValidEmail(email)) {
      setError('Informe um e-mail valido.');
      setSuccess('');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await auth.resetPassword(email);
      setSuccess('Se o e-mail existir, uma nova senha sera enviada pelo backend atual.');
    } catch (err) {
      const appError = err as AppError;
      setError(appError.message);
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
          Recuperacao de acesso
        </div>
        <h1 className="text-3xl font-semibold text-ink sm:text-4xl">Esqueci minha senha</h1>
        <p className="text-sm leading-7 text-muted">Digite o e-mail cadastrado para solicitar uma nova senha.</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <FormField label="E-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} error={error && !success ? error : undefined} />
        {success ? <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div> : null}
        <FormActions>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-2xl bg-primary-500 px-5 py-3 font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Enviando...' : 'Solicitar nova senha'}
          </button>
        </FormActions>
      </form>
    </div>
  );
};