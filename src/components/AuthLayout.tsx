import { GraduationCap } from 'lucide-react';
import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        <div className="flex items-center px-5 py-8 sm:px-8 lg:px-10">
          <div className="panel w-full p-6 sm:p-8">
            <Outlet />
          </div>
        </div>

        <div className="relative hidden overflow-hidden bg-primary-500 lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div className="absolute inset-0 bg-hero-grid opacity-20" />
          <div className="relative flex items-center gap-4 text-white">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/14 ring-1 ring-white/20">
              <img src="/computacao-logo.png" alt="Instituto de Computacao UFBA" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">UFBA Computacao</div>
              <div className="text-2xl font-semibold">BDCP</div>
            </div>
          </div>

          <div className="relative text-white">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em]">
              <GraduationCap className="h-4 w-4" />
              Mobile first e responsivo
            </div>
            <h2 className="max-w-lg text-4xl font-semibold leading-tight">
              Acesso institucional para editar, aprovar e publicar disciplinas.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/80">
              O novo front-end preserva o backend atual, mas reorganiza a experiencia para funcionar bem em tela pequena,
              desktop e uso administrativo continuo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};