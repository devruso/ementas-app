import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { FormActions } from '../components/FormActions';
import { FormField } from '../components/FormField';
import { useAuth } from '../contexts/AuthContext';
import { AppError } from '../lib/errors';
import { isValidEmail } from '../lib/validation';

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

    const normalizedEmail = email.trim().toLowerCase();

    const nextErrors: { email?: string; password?: string } = {};

    if (!isValidEmail(normalizedEmail)) {
      nextErrors.email = 'Informe um e-mail valido.';
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
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
          Login institucional
        </div>
        <h1 className="text-3xl font-semibold text-ink sm:text-4xl">Entrar</h1>
        <p className="text-sm leading-7 text-muted">Acesse o sistema para editar disciplinas, revisar rascunhos e publicar aprovacoes.</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <FormField label="E-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} error={fieldErrors.email} />
        <FormField label="Senha" type="password" value={password} onChange={(event) => setPassword(event.target.value)} error={fieldErrors.password} />

        {error ? <div className="rounded-2xl border border-danger/20 bg-red-50 px-4 py-3 text-sm text-danger">{error}</div> : null}

        <FormActions>
          <Link to="/novasenha" className="inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium text-primary-600">
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