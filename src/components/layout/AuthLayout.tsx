import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] p-4">
      {/* Multi-color soft radial gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -left-40 -top-40 h-[360px] w-[360px] rounded-full"
          style={{ background: 'radial-gradient(360px 280px at 8% 6%, rgba(125, 211, 252, 0.22) 0%, transparent 60%)' }}
        />
        <div
          className="absolute -right-40 top-0 h-[380px] w-[380px] rounded-full"
          style={{ background: 'radial-gradient(380px 300px at 92% 8%, rgba(196, 181, 253, 0.25) 0%, transparent 60%)' }}
        />
        <div
          className="absolute left-1/4 top-1/3 h-[320px] w-[320px] rounded-full"
          style={{ background: 'radial-gradient(320px 260px at 28% 38%, rgba(147, 197, 253, 0.18) 0%, transparent 65%)' }}
        />
        <div
          className="absolute right-1/4 top-1/2 h-[300px] w-[300px] rounded-full"
          style={{ background: 'radial-gradient(300px 240px at 78% 48%, rgba(216, 180, 254, 0.16) 0%, transparent 65%)' }}
        />
        <div
          className="absolute bottom-0 left-0 h-[340px] w-[340px] rounded-full"
          style={{ background: 'radial-gradient(340px 280px at 6% 88%, rgba(167, 243, 208, 0.15) 0%, transparent 60%)' }}
        />
        <div
          className="absolute -right-20 bottom-0 h-[360px] w-[360px] rounded-full"
          style={{ background: 'radial-gradient(360px 280px at 94% 92%, rgba(251, 207, 232, 0.2) 0%, transparent 60%)' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-emerald-500 shadow-lg shadow-violet-500/25">
            <span className="text-xl font-bold text-white">LG</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A]">LandGate</h1>
          <p className="mt-1 text-sm text-slate-400">AI 网关服务平台</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
