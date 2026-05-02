import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { FormActions } from '../components/FormActions';
import { FormField } from '../components/FormField';
import { useAuth } from '../contexts/AuthContext';
import { validateInviteToken } from '../lib/api';
import { AppError } from '../lib/errors';
import { isValidEmail, isValidPassword } from '../lib/validation';

export const RegisterPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const { inviteToken = '' } = useParams();
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setValidating(true);
    validateInviteToken(inviteToken)
      .then(() => setTokenValid(true))
      .catch(() => setTokenValid(false))
      .finally(() => setValidating(false));
  }, [inviteToken]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setError('Informe seu nome.');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Informe um e-mail valido.');
      return;
    }

    if (!isValidPassword(password)) {
      setError('A senha deve ter 8 a 20 caracteres, com letra maiuscula, minuscula, numero e caractere especial.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas devem ser iguais.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await auth.register(inviteToken, name, email, password);
      navigate('/entrar', { replace: true });
    } catch (err) {
      const appError = err as AppError;
      setError(appError.message);
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return <div className="text-sm text-muted">Validando convite...</div>;
  }

  if (!tokenValid) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold text-ink">Cadastro</h1>
        <p className="rounded-2xl border border-danger/20 bg-red-50 px-4 py-3 text-sm text-danger">
          Token invalido ou expirado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
          Convite institucional
        </div>
        <h1 className="text-3xl font-semibold text-ink sm:text-4xl">Criar conta</h1>
        <p className="text-sm leading-7 text-muted">Conclua seu cadastro para acessar os fluxos autenticados do sistema.</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <FormField label="Nome" value={name} onChange={(event) => setName(event.target.value)} />
        <FormField label="E-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <FormField label="Senha" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <FormField label="Confirmar senha" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        {error ? <div className="rounded-2xl border border-danger/20 bg-red-50 px-4 py-3 text-sm text-danger">{error}</div> : null}

        <FormActions>
          <Link to="/entrar" className="inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium text-primary-600">
            Voltar para login
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-2xl bg-primary-500 px-5 py-3 font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </FormActions>
      </form>
    </div>
  );
};