import { BookOpenText, FilePlus2, FileSearch2, GraduationCap, LogIn, Menu, UserCircle2, Users2, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';

export const AppShell = () => {
  const auth = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdminProfile = auth.user?.role === 'admin' || auth.user?.role === 'super_admin';
  const navPillClass = ({ isActive }: { isActive: boolean }) => `nav-pill ${isActive ? 'nav-pill-active' : ''}`;

  return (
    <div className="min-h-screen">
      <header className="glass-header sticky top-0 z-30 motion-fade">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 text-white sm:px-6 md:gap-6 md:px-10 md:py-4">
          <NavLink to="/disciplinas" className="flex items-center gap-4">
            <div className="logo-orb bg-white">
              <img
                src="https://computacao.ufba.br/imagem"
                alt="Instituto de Computacao UFBA"
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.src = '/computacao-logo.png';
                }}
              />
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                Instituto de Computacao
              </div>
              <div className="text-lg font-semibold">Ementas</div>
            </div>
          </NavLink>

          <nav className="hidden items-center gap-2 md:flex">
            <NavLink to="/disciplinas" className={navPillClass}>
              <span className="inline-flex items-center gap-2">
                <BookOpenText className="h-4 w-4" />
                Disciplinas
              </span>
            </NavLink>

            {auth.isAuthenticated ? (
              <>
                {isAdminProfile ? (
                  <NavLink to="/disciplinas/adicionar" className={navPillClass}>
                    <span className="inline-flex items-center gap-2">
                      <FilePlus2 className="h-4 w-4" />
                      Adicionar
                    </span>
                  </NavLink>
                ) : null}

                {isAdminProfile ? (
                  <NavLink to="/usuarios" className={navPillClass}>
                    <span className="inline-flex items-center gap-2">
                      <Users2 className="h-4 w-4" />
                      Usuarios
                    </span>
                  </NavLink>
                ) : null}

                <NavLink to="/perfil" className={navPillClass}>
                  <span className="inline-flex items-center gap-2">
                    <UserCircle2 className="h-4 w-4" />
                    Perfil
                  </span>
                </NavLink>

                {auth.user?.name ? (
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white/90">
                    Ola, {auth.user.name.split(' ')[0]}
                  </span>
                ) : null}

                <button
                  type="button"
                  onClick={auth.logout}
                  className="nav-pill"
                >
                  Sair
                </button>
              </>
            ) : (
              <NavLink to="/entrar" className={({ isActive }) => `nav-pill ${isActive ? 'nav-pill-active' : 'bg-secondary-500 text-secondary-700 hover:brightness-95'}`}>
                <span className="inline-flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Entrar
                </span>
              </NavLink>
            )}
          </nav>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/25 bg-white/10 transition hover:bg-white/20 md:hidden"
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div className="mobile-sheet motion-rise md:hidden">
            <div className="flex flex-col gap-2 text-sm">
              <NavLink
                to="/disciplinas"
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3"
                onClick={() => setMobileMenuOpen(false)}
              >
                Disciplinas
              </NavLink>
              {auth.isAuthenticated ? (
                <>
                  {isAdminProfile ? (
                    <NavLink
                      to="/disciplinas/adicionar"
                      className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Adicionar disciplina
                    </NavLink>
                  ) : null}
                  {isAdminProfile ? (
                    <NavLink
                      to="/usuarios"
                      className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Usuarios
                    </NavLink>
                  ) : null}
                  <NavLink
                    to="/perfil"
                    className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Perfil
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => {
                      auth.logout();
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-left"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <NavLink
                  to="/entrar"
                  className="rounded-2xl bg-secondary-500 px-4 py-3 font-semibold text-secondary-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Entrar
                </NavLink>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-hero-grid opacity-40" />
        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-10 md:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
