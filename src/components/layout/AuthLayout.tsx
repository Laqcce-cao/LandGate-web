import { Outlet } from 'react-router-dom';
import { AmbientScene } from './AmbientScene';

export function AuthLayout() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F6F6F3] p-4 dark:bg-dark-950">
      <AmbientScene compact />

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#101418] shadow-lg shadow-black/10 dark:bg-[#E8E2D8]">
            <span className="absolute inset-[4px] rounded-lg border border-[#A77A45]/45" />
            <span className="text-xl font-bold text-white dark:text-[#101418]">LG</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white">LandGate</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-dark-300">AI 网关服务平台</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
