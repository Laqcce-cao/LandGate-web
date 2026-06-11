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

const providers = ['GPT', 'Claude', 'Gemini', 'DeepSeek', 'Qwen'];
const navItems = ['控制台', 'API Key', '用量', '模型价格'];

function TerminalPreview() {
  return (
    <div className="relative inline-block">
      <div className="w-full max-w-[420px] overflow-hidden rounded-[14px] bg-gradient-to-br from-slate-800 to-slate-950 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.45),0_0_0_1px_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] transition duration-300 hover:-translate-y-1 lg:w-[420px] lg:[transform:perspective(1000px)_rotateX(2deg)_rotateY(-2deg)] lg:hover:[transform:perspective(1000px)_rotateX(0deg)_rotateY(0deg)_translateY(-4px)]">
        <div className="flex items-center border-b border-white/[0.05] bg-slate-800/80 px-4 py-3">
          <div className="flex gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <span className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="h-3 w-3 rounded-full bg-green-500" />
          </div>
          <span className="mr-[52px] flex-1 text-center font-mono text-xs text-slate-500">landgate</span>
        </div>

        <div className="space-y-3 px-6 py-5 font-mono text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-emerald-400">$</span>
            <span className="text-sky-400">curl</span>
            <span className="text-violet-300">-X POST</span>
            <span className="text-cyan-300">/v1/chat/completions</span>
          </div>
          <div className="text-slate-500"># Routing by group, balance and model price...</div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-emerald-400/15 px-2 py-0.5 font-semibold text-emerald-400">200 OK</span>
            <span className="text-amber-300">{'{ "model": "gpt-4.1-mini" }'}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2">
            {[
              ['Keys', '164'],
              ['Tokens', '89.6M'],
              ['Balance', '$4.2K'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 font-semibold text-slate-100">{value}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="font-bold text-emerald-400">$</span>
            <span className="h-4 w-2 animate-pulse bg-emerald-400" />
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
              <TerminalPreview />
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

          <section className="mb-10 text-center">
            <h2 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">支持主流模型服务</h2>
            <p className="text-sm text-slate-500 dark:text-dark-400">通过统一接口接入、计费和审计，减少业务侧重复配置。</p>
          </section>

          <section className="mb-12 flex flex-wrap items-center justify-center gap-4">
            {providers.map((provider, index) => (
              <div
                key={provider}
                className="flex items-center gap-2 rounded-xl border border-sky-200 bg-white/65 px-5 py-3 ring-1 ring-sky-500/10 backdrop-blur-sm dark:border-sky-400/20 dark:bg-white/[0.055]"
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${index % 2 === 0 ? 'from-sky-500 to-cyan-500' : 'from-indigo-500 to-fuchsia-500'}`}>
                  <span className="text-xs font-bold text-white">{provider.charAt(0)}</span>
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-dark-200">{provider}</span>
                <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-600 dark:bg-sky-400/10 dark:text-sky-300">
                  已支持
                </span>
              </div>
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
