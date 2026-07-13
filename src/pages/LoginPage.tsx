import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { FormActions } from '../components/FormActions';
import { FormField } from '../components/FormField';
import { useAuth } from '../contexts/AuthContext';
import { AppError } from '../lib/errors';
import { isUfbaInstitutionalEmail, isValidEmail, normalizeEmail } from '../lib/validation';

export const LoginPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = normalizeEmail(email);

    const nextErrors: { email?: string; password?: string } = {};

    if (!isValidEmail(normalizedEmail)) {
      nextErrors.email = 'Informe um e-mail valido.';
    } else if (!isUfbaInstitutionalEmail(normalizedEmail)) {
      nextErrors.email = 'Use seu e-mail institucional da UFBA (@ufba.br).';
    }

    if (!password) {
      nextErrors.password = 'Informe sua senha.';
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await auth.login(normalizedEmail, password);

      const nextPath = (location.state as { from?: { pathname?: string } } | undefined)?.from?.pathname;
      navigate(nextPath || '/disciplinas', { replace: true });
    } catch (err) {
      const appError = err as AppError;
      setError(appError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 text-ink">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold text-ink sm:text-4xl">Entrar</h1>
        <p className="text-sm leading-7 text-ink/80">Acesse o sistema para editar disciplinas, revisar rascunhos e publicar aprovacoes.</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <FormField
            label="E-mail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="suaconta@ufba.br"
            error={fieldErrors.email}
          />
          <p className="mt-2 text-xs font-semibold text-danger">Apenas conta @ufba.br.</p>
        </div>
        <FormField label="Senha" type="password" value={password} onChange={(event) => setPassword(event.target.value)} error={fieldErrors.password} />

        {error ? <div className="rounded-2xl border border-danger/20 bg-red-50 px-4 py-3 text-sm text-danger">{error}</div> : null}

        <FormActions>
          <Link to="/novasenha" className="inline-flex items-center justify-center rounded-2xl border border-primary-200 bg-white px-4 py-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-50">
            Esqueci minha senha
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-2xl bg-primary-500 px-5 py-3 font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </FormActions>
      </form>
    </div>
  );
};