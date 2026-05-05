import { GraduationCap } from 'lucide-react';
import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-slate-50 to-background text-ink">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        <div className="flex items-center px-5 py-8 sm:px-8 lg:px-10">
          <div className="motion-rise w-full rounded-3xl border border-primary-100 bg-white/95 p-6 shadow-2xl shadow-blue-100/70 sm:p-8">
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3 text-primary-700">
              <div className="h-10 w-10 overflow-hidden rounded-full bg-white ring-1 ring-primary-200">
                <img src="/computacao-logo.png" alt="Instituto de Computacao UFBA" className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">Instituto de Computacao UFBA</div>
                <div className="text-sm font-semibold text-primary-700">Portal de Ementas e Conteudos Programaticos</div>
              </div>
            </div>
            <Outlet />
          </div>
        </div>

        <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary-700 via-primary-500 to-primary-600 lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div className="absolute inset-0 bg-hero-grid opacity-20" />
          <div className="relative flex items-center gap-4 text-white">
            <div className="h-14 w-14 overflow-hidden rounded-full bg-white ring-2 ring-white/35">
              <img src="/computacao-logo.png" alt="Instituto de Computacao UFBA" className="h-full w-full object-cover" />
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