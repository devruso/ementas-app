import { Navigate, Route, Routes } from 'react-router-dom';

import { AuthLayout } from './components/AuthLayout';
import { GuestRoute } from './components/GuestRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/AppShell';
import { AuthProvider } from './contexts/AuthContext';
import { DisciplineDetailsPage } from './pages/DisciplineDetailsPage';
import { DisciplineEditPage } from './pages/DisciplineEditPage';
import { DisciplineListPage } from './pages/DisciplineListPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';

export const App = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/disciplinas" replace />} />
          <Route path="/disciplinas" element={<DisciplineListPage />} />
          <Route path="/disciplinas/:componentCode" element={<DisciplineDetailsPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/disciplinas/:componentCode/editar" element={<DisciplineEditPage />} />
          </Route>
        </Route>

        <Route element={<GuestRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/entrar" element={<LoginPage />} />
            <Route path="/novasenha" element={<ForgotPasswordPage />} />
            <Route path="/cadastrar/:inviteToken" element={<RegisterPage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
};