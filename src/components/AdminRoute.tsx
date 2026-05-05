import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';

export const AdminRoute = () => {
  const auth = useAuth();

  if (auth.isLoading) {
    return <div className="panel p-10 text-center text-sm text-muted">Carregando permissao...</div>;
  }

  if (!auth.isAuthenticated || (auth.user?.role !== 'admin' && auth.user?.role !== 'super_admin')) {
    return <Navigate to="/disciplinas" replace />;
  }

  return <Outlet />;
};