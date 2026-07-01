import { Navigate, Route, Routes } from 'react-router-dom';

import { AdminRoute } from './components/AdminRoute';
import { AuthLayout } from './components/AuthLayout';
import { GuestRoute } from './components/GuestRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/AppShell';
import { AuthProvider } from './contexts/AuthContext';
import { DisciplineDetailsPage } from './pages/DisciplineDetailsPage';
import { DisciplineEditPage } from './pages/DisciplineEditPage';
import { DisciplineCreatePage } from './pages/DisciplineCreatePage';
import { DisciplineListPage } from './pages/DisciplineListPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { InviteShortRedirectPage } from './pages/InviteShortRedirectPage';
import { RegisterPage } from './pages/RegisterPage';
import { SharedDisciplinePage } from './pages/SharedDisciplinePage';
import { UsersPage } from './pages/UsersPage';

export const App = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/disciplinas" replace />} />
          <Route path="/publico/disciplinas/:shareToken" element={<SharedDisciplinePage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/disciplinas" element={<DisciplineListPage />} />
            <Route path="/disciplinas/:componentCode" element={<DisciplineDetailsPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/disciplinas/:componentCode/editar" element={<DisciplineEditPage />} />

            <Route element={<AdminRoute />}>
              <Route path="/usuarios" element={<UsersPage />} />
              <Route path="/departamentos" element={<DepartmentsPage />} />
              <Route path="/disciplinas/adicionar" element={<DisciplineCreatePage />} />
            </Route>
          </Route>
        </Route>

        <Route element={<GuestRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/entrar" element={<LoginPage />} />
            <Route path="/novasenha" element={<ForgotPasswordPage />} />
            <Route path="/i/:shortCode" element={<InviteShortRedirectPage />} />
            <Route path="/cadastrar/:inviteToken" element={<RegisterPage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
};