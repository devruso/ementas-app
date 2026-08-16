import { Outlet } from 'react-router-dom';

import { BrandMark } from './BrandMark';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-primary-500 text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
        <div className="motion-rise w-full max-w-2xl rounded-3xl bg-white/95 p-6 shadow-2xl shadow-blue-100/70 sm:p-8">
          <div className="mb-6 flex items-center gap-4 rounded-2xl bg-slate-50 px-4 py-3 text-primary-700">
            <div className="h-14 w-16 shrink-0 bg-white">
              <BrandMark className="h-full w-full object-contain p-1" />
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
