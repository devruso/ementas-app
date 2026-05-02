import { BookOpenText, FilePlus2, FileSearch2, GraduationCap, LogIn, Menu, UserCircle2, Users2, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';

export const AppShell = () => {
  const auth = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/70 bg-primary-500/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 text-white md:px-10">
          <NavLink to="/disciplinas" className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white ring-1 ring-white/20">
              <img src="/computacao-logo.png" alt="Instituto de Computacao UFBA" className="h-8 w-8 object-contain" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                UFBA Computacao
              </div>
              <div className="text-lg font-semibold">Ementas e Conteudos Programaticos</div>
            </div>
          </NavLink>

          <nav className="hidden items-center gap-2 md:flex">
            <NavLink
              to="/disciplinas"
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-white text-primary-600' : 'text-white/86 hover:bg-white/10'
                }`
              }
            >
              <span className="inline-flex items-center gap-2">
                <BookOpenText className="h-4 w-4" />
                Disciplinas
              </span>
            </NavLink>

            {auth.isAuthenticated ? (
              <>
                {auth.user?.role === 'admin' ? (
                  <NavLink
                    to="/disciplinas/adicionar"
                    className={({ isActive }) =>
                      `rounded-full px-4 py-2 text-sm font-medium transition ${
                        isActive ? 'bg-white text-primary-600' : 'text-white/86 hover:bg-white/10'
                      }`
                    }
                  >
                    <span className="inline-flex items-center gap-2">
                      <FilePlus2 className="h-4 w-4" />
                      Adicionar
                    </span>
                  </NavLink>
                ) : null}

                {auth.user?.role === 'admin' ? (
                  <NavLink
                    to="/usuarios"
                    className={({ isActive }) =>
                      `rounded-full px-4 py-2 text-sm font-medium transition ${
                        isActive ? 'bg-white text-primary-600' : 'text-white/86 hover:bg-white/10'
                      }`
                    }
                  >
                    <span className="inline-flex items-center gap-2">
                      <Users2 className="h-4 w-4" />
                      Usuários
                    </span>
                  </NavLink>
                ) : null}

                <NavLink
                  to="/perfil"
                  className={({ isActive }) =>
                    `rounded-full px-4 py-2 text-sm font-medium transition ${
                      isActive ? 'bg-white text-primary-600' : 'text-white/86 hover:bg-white/10'
                    }`
                  }
                >
                  <span className="inline-flex items-center gap-2">
                    <UserCircle2 className="h-4 w-4" />
                    Perfil
                  </span>
                </NavLink>

                <button
                  type="button"
                  onClick={auth.logout}
                  className="rounded-full px-4 py-2 text-sm font-medium text-white/86 transition hover:bg-white/10"
                >
                  Sair
                </button>
              </>
            ) : (
              <NavLink
                to="/entrar"
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-white text-primary-600' : 'bg-secondary-500 text-secondary-700 hover:brightness-95'
                  }`
                }
              >
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 md:hidden"
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-white/10 bg-primary-600 px-6 py-4 md:hidden">
            <div className="flex flex-col gap-2 text-sm">
              <NavLink
                to="/disciplinas"
                className="rounded-2xl bg-white/10 px-4 py-3"
                onClick={() => setMobileMenuOpen(false)}
              >
                Disciplinas
              </NavLink>
              {auth.isAuthenticated ? (
                <>
                  {auth.user?.role === 'admin' ? (
                    <NavLink
                      to="/disciplinas/adicionar"
                      className="rounded-2xl bg-white/10 px-4 py-3"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Adicionar disciplina
                    </NavLink>
                  ) : null}
                  {auth.user?.role === 'admin' ? (
                    <NavLink
                      to="/usuarios"
                      className="rounded-2xl bg-white/10 px-4 py-3"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Usuários
                    </NavLink>
                  ) : null}
                  <NavLink
                    to="/perfil"
                    className="rounded-2xl bg-white/10 px-4 py-3"
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
                    className="rounded-2xl bg-white/10 px-4 py-3 text-left"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <NavLink
                  to="/entrar"
                  className="rounded-2xl bg-secondary-500 px-4 py-3 text-secondary-700"
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
        <div className="relative mx-auto max-w-7xl px-6 py-8 md:px-10 md:py-10">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary-100 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
                <FileSearch2 className="h-3.5 w-3.5" />
                Migracao inicial do app publico
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
                Consulta pública, gestão acadêmica e exportação oficial IC045
              </h1>
            </div>
          </div>

          <Outlet />
        </div>
      </main>
    </div>
  );
};