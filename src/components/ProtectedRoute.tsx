import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = () => {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isLoading) {
    return <div className="panel p-10 text-center text-sm text-muted">Carregando sessao...</div>;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/entrar" replace state={{ from: location }} />;
  }

  return <Outlet />;
};