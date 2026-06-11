import { Link } from 'react-router-dom';
import { AmbientScene } from '../components/layout/AmbientScene';
import { Icon, type IconName } from '../components/ui/Icon';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';

const featureTags: Array<{ icon: IconName; label: string }> = [
  { icon: 'server', label: '统一模型网关' },
  { icon: 'key', label: 'API Key 隔离' },
  { icon: 'chartBar', label: '实时用量计费' },
];

const features: Array<{
  icon: IconName;
  title: string;
  description: string;
  gradient: string;
  shadow: string;
}> = [
  {
    icon: 'server',
    title: '多上游统一接入',
    description: '集中管理不同供应商、账号、分组和模型，业务侧只需要维护一个稳定入口。',
    gradient: 'from-sky-500 to-cyan-500',
    shadow: 'shadow-sky-500/25',
  },
  {
    icon: 'key',
    title: '密钥与权限边界',
    description: '为团队、项目和环境创建独立 API Key，调用记录清晰，权限边界明确。',
    gradient: 'from-indigo-500 to-violet-500',
    shadow: 'shadow-indigo-500/25',
  },
  {
    icon: 'creditCard',
    title: '余额与模型价格',
    description: '模型价格、充值扣费、余额流水和 Token 消耗统一统计，成本变化可追踪。',
    gradient: 'from-fuchsia-500 to-rose-500',
    shadow: 'shadow-fuchsia-500/25',
  },
];

const navItems = ['控制台', 'API Key', '用量', '模型价格'];

function GatewayRoutePreview() {
  return (
    <div className="relative w-full max-w-[430px]">
      <div className="absolute -inset-5 rounded-[28px] bg-gradient-to-br from-sky-400/18 via-indigo-400/12 to-fuchsia-400/16 blur-2xl dark:from-sky-400/12 dark:via-indigo-400/10 dark:to-fuchsia-400/10" />
      <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/76 p-5 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/58">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">Gateway Route</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">LandGate 网关路由</h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)]" />
            Online
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/82 p-4 dark:border-white/10 dark:bg-white/[0.045]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-slate-500 dark:text-dark-400">API Key</p>
              <p className="mt-1 truncate font-mono text-sm font-semibold text-slate-900 dark:text-white">ak-lg-prod-82f4...91c</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-300">
              <Icon name="key" size="md" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/82 p-3 ring-1 ring-slate-200/70 dark:bg-slate-900/62 dark:ring-white/10">
              <p className="text-xs text-slate-500 dark:text-dark-400">Model</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">deepseek-v4-pro</p>
            </div>
            <div className="rounded-2xl bg-white/82 p-3 ring-1 ring-slate-200/70 dark:bg-slate-900/62 dark:ring-white/10">
              <p className="text-xs text-slate-500 dark:text-dark-400">Balance</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">$4,280.60</p>
            </div>
          </div>
        </div>

        <div className="my-5 flex items-center gap-3 px-1">
          {['Client', 'LandGate', 'Upstream'].map((item, index) => (
            <div key={item} className="flex flex-1 items-center gap-3">
              <div className="flex min-w-0 flex-1 items-center justify-center rounded-full border border-slate-200/70 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.055] dark:text-dark-200">
                {item}
              </div>
              {index < 2 && <Icon name="chevronRight" size="sm" className="shrink-0 text-sky-500/80" />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-indigo-200/70 bg-indigo-50/70 p-4 dark:border-indigo-300/15 dark:bg-indigo-400/[0.07]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-dark-400">Route Status</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">按分组、余额与模型价格自动选择上游</p>
            </div>
            <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-600 ring-1 ring-indigo-200 dark:bg-white/10 dark:text-indigo-200 dark:ring-white/10">
              42 ms
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const token = useAuthStore((s) => s.token);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const { theme, toggleTheme } = useThemeStore();
  const dashboardPath = isAdmin ? '/admin/dashboard' : '/dashboard';
  const primaryPath = token ? dashboardPath : '/register';

  return (
    <main className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#EAF5FF] text-slate-950 dark:bg-dark-950 dark:text-white">
      <AmbientScene />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/35 bg-white/52 px-6 py-3 backdrop-blur-2xl dark:border-white/10 dark:bg-dark-950/52">
        <nav className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 via-indigo-500 to-fuchsia-500 text-sm font-black text-white shadow-md">
              LG
            </span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">LandGate</span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-medium text-slate-500 dark:text-dark-300 md:flex">
            {navItems.map((item) => (
              <a key={item} href="#features" className="transition hover:text-slate-900 dark:hover:text-white">
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-900 dark:text-dark-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
              aria-label={theme === 'dark' ? '切换到日间模式' : '切换到夜间模式'}
              title={theme === 'dark' ? '切换到日间模式' : '切换到夜间模式'}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size="sm" />
            </button>
            <Link
              to="/login"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-700 dark:text-dark-400 dark:hover:bg-white/[0.06] dark:hover:text-white sm:inline-flex"
            >
              登录
            </Link>
            <Link
              to={primaryPath}
              className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-950"
            >
              {token ? '控制台' : '开始使用'}
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10 flex-1 px-6 pb-14 pt-28">
        <div className="mx-auto max-w-6xl">
          <section className="mb-12 flex flex-col items-center justify-between gap-12 lg:flex-row lg:gap-16">
            <div className="flex-1 text-center lg:text-left">
              <h1 className="mb-5 text-4xl font-bold tracking-tight text-slate-900 dark:text-white md:text-5xl lg:text-6xl">
                LandGate
              </h1>
              <p className="mb-5 max-w-2xl text-lg font-semibold leading-8 text-slate-700 dark:text-dark-200 md:text-xl">
                企业级 AI API 网关与用量计费平台
              </p>
              <p className="mb-8 max-w-2xl text-base leading-7 text-slate-500 dark:text-dark-300 md:text-lg">
                统一接入 GPT、Claude、Gemini、Qwen 等模型，集中管理 API Key、余额流水、模型价格和 Token 用量。
              </p>

              <Link to={primaryPath} className="btn btn-primary px-8 py-3 text-base shadow-lg shadow-sky-500/20">
                {token ? '进入控制台' : '立即开始'}
                <Icon name="arrowRight" size="md" className="ml-1" strokeWidth={2} />
              </Link>
            </div>

            <div className="flex flex-1 justify-center lg:justify-end">
              <GatewayRoutePreview />
            </div>
          </section>

          <section className="mb-12 flex flex-wrap items-center justify-center gap-4 md:gap-6">
            {featureTags.map((tag) => (
              <div
                key={tag.label}
                className="inline-flex items-center gap-2.5 rounded-full border border-slate-200/60 bg-white/80 px-5 py-2.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.06]"
              >
                <Icon name={tag.icon} size="sm" className="text-sky-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-dark-200">{tag.label}</span>
              </div>
            ))}
          </section>

          <section id="features" className="mb-12 grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="group rounded-2xl border border-slate-200/60 bg-white/65 p-6 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/10 dark:border-white/10 dark:bg-white/[0.055]"
              >
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg ${feature.shadow} transition-transform group-hover:scale-110`}>
                  <Icon name={feature.icon} size="lg" className="text-white" />
                </div>
                <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">{feature.title}</h2>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-dark-300">{feature.description}</p>
              </article>
            ))}
          </section>

        </div>
      </main>

      <footer className="relative z-10 border-t border-slate-200/50 px-6 py-8 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-center text-center">
          <p className="text-sm text-slate-500 dark:text-dark-400">© {new Date().getFullYear()} LandGate. AI API Gateway Platform.</p>
        </div>
      </footer>
    </main>
  );
}
