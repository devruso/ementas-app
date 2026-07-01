import { useState } from 'react';

import { FormActions } from '../components/FormActions';
import { FormField } from '../components/FormField';
import { useAuth } from '../contexts/AuthContext';
import { AppError } from '../lib/errors';
import { isUfbaInstitutionalEmail, isValidEmail, normalizeEmail } from '../lib/validation';

export const ForgotPasswordPage = () => {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      setError('Informe um e-mail valido.');
      setSuccess('');
      return;
    }

    if (!isUfbaInstitutionalEmail(normalizedEmail)) {
      setError('Use seu e-mail institucional da UFBA (@ufba.br).');
      setSuccess('');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await auth.resetPassword(normalizedEmail);
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
    <div className="space-y-8 text-ink">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold text-ink sm:text-4xl">Esqueci minha senha</h1>
        <p className="text-sm leading-7 text-ink/80">
          <strong>Digite o e-mail cadastrado para solicitar uma nova senha. Recuperação restrita a contas @ufba.br.</strong>
        </p>
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