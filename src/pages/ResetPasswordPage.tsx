import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { FormActions } from '../components/FormActions';
import { FormField } from '../components/FormField';
import { useAuth } from '../contexts/AuthContext';
import { confirmResetPassword } from '../lib/api';
import { AppError } from '../lib/errors';

export const ResetPasswordPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) {
    return <Navigate to="/novasenha" replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!password || password.length < 8) {
      setError('Informe uma nova senha valida.');
      setSuccess('');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas informadas não coincidem.');
      setSuccess('');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const result = await confirmResetPassword(token, password);
      await auth.login(result.email, password);
      setSuccess('Senha atualizada com sucesso. Redirecionando para o sistema...');
      navigate('/disciplinas', { replace: true });
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
        <h1 className="text-3xl font-semibold text-ink sm:text-4xl">Redefinir senha</h1>
        <p className="text-sm leading-7 text-ink/80">
          Defina uma nova senha para concluir o acesso à aplicação.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <FormField
          label="Nova senha"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Digite sua nova senha"
          error={error && !success ? error : undefined}
        />
        <FormField
          label="Confirmar nova senha"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repita a nova senha"
        />

        {success ? <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div> : null}

        <FormActions>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-2xl bg-primary-500 px-5 py-3 font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </FormActions>
      </form>
    </div>
  );
};