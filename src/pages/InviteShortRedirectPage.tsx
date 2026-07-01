import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { resolveInviteShortCode } from '../lib/api';
import { AppError } from '../lib/errors';

export const InviteShortRedirectPage = () => {
  const navigate = useNavigate();
  const { shortCode = '' } = useParams();
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    resolveInviteShortCode(shortCode)
      .then((inviteToken) => {
        if (!isMounted) {
          return;
        }

        navigate(`/cadastrar/${inviteToken}`, { replace: true });
      })
      .catch((err: unknown) => {
        if (!isMounted) {
          return;
        }

        const appError = err as AppError;
        setError(appError.message || 'Convite invalido ou expirado.');
      });

    return () => {
      isMounted = false;
    };
  }, [navigate, shortCode]);

  if (error) {
    return (
      <div className="space-y-4 text-ink">
        <h1 className="text-3xl font-semibold">Convite institucional</h1>
        <p className="rounded-2xl border border-danger/20 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </p>
        <Link
          to="/entrar"
          className="inline-flex items-center justify-center rounded-2xl border border-primary-200 bg-white px-4 py-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-50"
        >
          Voltar para login
        </Link>
      </div>
    );
  }

  return <div className="text-sm text-ink/80">Validando convite...</div>;
};
