import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';

export const GuestRoute = () => {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isLoading) {
    return <div className="panel p-10 text-center text-sm text-muted">Carregando sessao...</div>;
  }

  if (auth.isAuthenticated) {
    const nextPath = (location.state as { from?: { pathname?: string } } | undefined)?.from?.pathname;

    return <Navigate to={nextPath || '/disciplinas'} replace />;
  }

  return <Outlet />;
};