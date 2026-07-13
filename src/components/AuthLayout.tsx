import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-primary-500 text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
        <div className="motion-rise w-full max-w-2xl rounded-3xl bg-white/95 p-6 shadow-2xl shadow-blue-100/70 sm:p-8">
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-primary-700">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-white">
              <img
                src="/computacao-logo.png"
                alt="Instituto de Computacao UFBA"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">Instituto de Computacao</div>
              <div className="text-sm font-semibold text-primary-700">Ementas</div>
            </div>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
};
