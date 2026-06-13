import { useEffect, useState, useMemo, useCallback } from 'react';
import clsx from 'clsx';
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import {
  userDashboardApi,
  type UserDashboardOverview,
  type UserModelStats,
  type UserTokenTrend,
  type TimeRangeParams,
} from '../api/user/dashboard';
import { Icon, type IconName } from '../components/ui/Icon';
import { DatePicker } from '../components/ui/DatePicker';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { useThemeStore } from '../stores/themeStore';

// ─── Helpers ────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.001) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(6)}`;
}

function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(d: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt.toISOString().slice(0, 10);
}

// ─── Time Range Presets ─────────────────────────────────────

type PresetKey = '7d' | '30d' | '90d' | 'custom';

const PRESETS: { key: PresetKey; label: string; days?: number }[] = [
  { key: '7d', label: '近7天', days: 7 },
  { key: '30d', label: '近30天', days: 30 },
  { key: '90d', label: '近90天', days: 90 },
  { key: 'custom', label: '自定义' },
];

function ChartSectionHeader({ preset, onStartChange, onEndChange, onPresetChange, start, end }: {
  preset: PresetKey;
  start: string;
  end: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onPresetChange: (key: PresetKey) => void;
}) {
  const isCustom = preset === 'custom';

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-dark-200">用量分析</h3>
        <p className="mt-1 text-xs text-slate-400 dark:text-dark-500">模型分布与 Token 趋势共用同一时间范围</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-slate-200/80 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
                preset === p.key
                  ? 'bg-[#101418] text-white shadow-sm dark:bg-[#E8E2D8] dark:text-[#101418]'
                  : 'text-slate-500 hover:text-slate-800 dark:text-dark-400 dark:hover:text-dark-200'
              )}
              onClick={() => onPresetChange(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {isCustom && (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-2 py-1 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
            <DatePicker value={start} onChange={onStartChange} max={end} />
            <span className="text-xs text-gray-400 dark:text-dark-500">至</span>
            <DatePicker value={end} onChange={onEndChange} min={start} max={todayStr()} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────

interface CardColorScheme {
  accent: string;
  wash: string;
  text: string;
  iconBg: string;
}

const COLOR_MAP: Record<string, CardColorScheme> = {
  emerald: {
    accent: 'bg-[#65776B]',
    wash: 'bg-[#F0F3F1] dark:bg-[#65776B]/15',
    text: 'text-[#52665B] dark:text-[#AFC2B5]',
    iconBg: 'bg-[#F0F3F1] text-[#65776B] dark:bg-[#65776B]/15 dark:text-[#AFC2B5]',
  },
  indigo: {
    accent: 'bg-[#1E2A44]',
    wash: 'bg-[#F1F2F1] dark:bg-[#7383A3]/15',
    text: 'text-[#1E2A44] dark:text-[#B8C2D8]',
    iconBg: 'bg-[#F1F2F1] text-[#1E2A44] dark:bg-[#7383A3]/15 dark:text-[#B8C2D8]',
  },
  blue: {
    accent: 'bg-[#59677A]',
    wash: 'bg-[#F0F1F2] dark:bg-[#59677A]/18',
    text: 'text-[#4A5667] dark:text-[#B5BECA]',
    iconBg: 'bg-[#F0F1F2] text-[#59677A] dark:bg-[#59677A]/18 dark:text-[#B5BECA]',
  },
  rose: {
    accent: 'bg-[#A65F5A]',
    wash: 'bg-[#F7F0EF] dark:bg-[#A65F5A]/14',
    text: 'text-[#854A46] dark:text-[#D7A29E]',
    iconBg: 'bg-[#F7F0EF] text-[#A65F5A] dark:bg-[#A65F5A]/14 dark:text-[#D7A29E]',
  },
  amber: {
    accent: 'bg-[#A77A45]',
    wash: 'bg-[#FAF8F2] dark:bg-[#A77A45]/14',
    text: 'text-[#6F512D] dark:text-[#D8BE96]',
    iconBg: 'bg-[#FAF8F2] text-[#A77A45] dark:bg-[#A77A45]/14 dark:text-[#D8BE96]',
  },
  violet: {
    accent: 'bg-[#756C62]',
    wash: 'bg-[#F2F1EE] dark:bg-[#756C62]/16',
    text: 'text-[#635A51] dark:text-[#C3B8AA]',
    iconBg: 'bg-[#F2F1EE] text-[#756C62] dark:bg-[#756C62]/16 dark:text-[#C3B8AA]',
  },
  cyan: {
    accent: 'bg-[#60717A]',
    wash: 'bg-[#EFF2F2] dark:bg-[#60717A]/16',
    text: 'text-[#506169] dark:text-[#B1C0C5]',
    iconBg: 'bg-[#EFF2F2] text-[#60717A] dark:bg-[#60717A]/16 dark:text-[#B1C0C5]',
  },
  teal: {
    accent: 'bg-[#6F8176]',
    wash: 'bg-[#F0F3F1] dark:bg-[#6F8176]/16',
    text: 'text-[#596C61] dark:text-[#B7C7BC]',
    iconBg: 'bg-[#F0F3F1] text-[#6F8176] dark:bg-[#6F8176]/16 dark:text-[#B7C7BC]',
  },
};

function DashboardStatCard({ icon, color, label, value, subtext }: {
  icon: IconName;
  color: keyof typeof COLOR_MAP;
  label: string;
  value: string | number;
  subtext?: string;
}) {
  const c = COLOR_MAP[color];
  return (
    <div className={clsx(
      'group relative overflow-hidden rounded-xl border border-[#D8D5CC] bg-white/90 p-4 shadow-[0_10px_26px_rgba(16,20,24,0.055)] transition-all duration-300',
      'hover:-translate-y-0.5 hover:shadow-xl dark:border-white/10 dark:bg-white/[0.055]',
    )}>
      <div className={clsx('pointer-events-none absolute inset-x-0 top-0 h-px', c.accent)} />
      <div className={clsx('pointer-events-none absolute -right-8 -top-12 h-24 w-24 rotate-12 rounded-[2rem] opacity-70 transition-transform duration-500 group-hover:translate-y-3 group-hover:rotate-45', c.wash)} />
      <div className="relative flex items-center gap-3">
        <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-black/[0.04] dark:ring-white/10', c.iconBg)}>
          <Icon name={icon} size="md" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-dark-500">{label}</p>
          <p className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">{value}</p>
          {subtext && (
            <p className={clsx('text-xs font-medium', c.text)}>{subtext}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Chart Colors ───────────────────────────────────────────

const CHART_COLORS_LIGHT = [
  '#1E2A44', '#A77A45', '#65776B', '#A65F5A',
  '#59677A', '#756C62', '#60717A', '#8A7156',
  '#6F8176', '#8C8F96', '#4E5663', '#B08B62',
];

const CHART_COLORS_DARK = [
  '#B8C2D8', '#D8BE96', '#AFC2B5', '#D7A29E',
  '#B5BECA', '#C3B8AA', '#B1C0C5', '#D0B18B',
  '#B7C7BC', '#A8ABB4', '#A9B0BC', '#E0C09A',
];

// ─── Model Distribution Chart ───────────────────────────────

function ModelDistributionCard({ data, loading, isDark }: {
  data: UserModelStats[];
  loading: boolean;
  isDark: boolean;
}) {
  const colors = isDark ? CHART_COLORS_DARK : CHART_COLORS_LIGHT;
  const sorted = useMemo(() => [...data].sort((a, b) => b.totalTokens - a.totalTokens), [data]);
  const top = useMemo(() => {
    const t = sorted.slice(0, 10);
    const otherTokens = sorted.slice(10).reduce((s, m) => s + m.totalTokens, 0);
    const otherCost = sorted.slice(10).reduce((s, m) => s + Number(m.totalCost), 0);
    const otherCalls = sorted.slice(10).reduce((s, m) => s + m.callCount, 0);
    if (otherTokens > 0) {
      t.push({ model: 'Others', totalTokens: otherTokens, totalCost: otherCost, callCount: otherCalls });
    }
    return t;
  }, [sorted]);

  return (
    <div className="group relative overflow-hidden rounded-xl border border-[#D8D5CC] bg-white/90 p-5 shadow-[0_10px_26px_rgba(16,20,24,0.055)] dark:border-white/10 dark:bg-white/[0.055]">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[#A77A45]/50" />
      <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">模型分布</h3>
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#A77A45] border-t-transparent" />
        </div>
      ) : top.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-gray-400 dark:text-dark-500">暂无数据</div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="h-64 w-64 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={top}
                  dataKey="totalTokens"
                  nameKey="model"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={100}
                  paddingAngle={2}
                  cornerRadius={3}
                >
                  {top.map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} stroke="none" />
                  ))}
                </Pie>
                <ReTooltip
                  contentStyle={{
                    background: isDark ? 'rgba(30,30,46,0.95)' : 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(8px)',
                    border: `1px solid ${isDark ? 'rgba(55,65,81,0.5)' : 'rgba(229,231,235,0.8)'}`,
                    borderRadius: 12,
                    color: isDark ? '#f9fafb' : '#111827',
                    fontSize: 12,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                  }}
                  itemStyle={{ color: isDark ? '#f9fafb' : '#111827' }}
                  labelStyle={{ color: isDark ? '#f9fafb' : '#111827' }}
                  formatter={(value: number, _name: string, props: { payload?: { model?: string; totalCost?: number; callCount?: number } }) => {
                    const p = props.payload;
                    return [
                      `${formatTokens(value)} tokens · ${formatCost(Number(p?.totalCost ?? 0))} · ${p?.callCount ?? 0} calls`,
                      p?.model ?? '',
                    ];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="min-w-0 flex-1 overflow-y-auto" style={{ maxHeight: 256 }}>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 dark:text-dark-500">
                  <th className="pb-2 text-left font-medium">模型</th>
                  <th className="pb-2 text-right font-medium">调用</th>
                  <th className="pb-2 text-right font-medium">Token</th>
                  <th className="pb-2 text-right font-medium">费用</th>
                </tr>
              </thead>
              <tbody>
                {top.map((m, i) => (
                  <tr key={m.model} className="border-t border-gray-100/60 dark:border-dark-700/40">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full shadow-sm" style={{ background: colors[i % colors.length] }} />
                        <span className="truncate text-gray-700 dark:text-dark-200">{m.model}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right tabular-nums text-gray-500 dark:text-dark-400">{formatNumber(m.callCount)}</td>
                    <td className="py-2 text-right tabular-nums text-gray-500 dark:text-dark-400">{formatTokens(m.totalTokens)}</td>
                    <td className="py-2 text-right tabular-nums font-medium text-rose-500 dark:text-rose-400">{formatCost(Number(m.totalCost))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Token Usage Trend Chart ────────────────────────────────

function TokenTrendCard({ data, loading, isDark }: {
  data: UserTokenTrend[];
  loading: boolean;
  isDark: boolean;
}) {
  const chartData = useMemo(() =>
    data.map((s) => {
      const d = new Date(s.date);
      return {
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        inputTokens: s.inputTokens ?? 0,
        outputTokens: s.outputTokens ?? 0,
        cacheReadTokens: s.cacheReadTokens ?? 0,
      };
    }),
    [data],
  );

  const totalTokens = useMemo(() => {
    let total = 0;
    for (const s of data) {
      total += (s.inputTokens ?? 0) + (s.outputTokens ?? 0) + (s.cacheReadTokens ?? 0);
    }
    return total;
  }, [data]);

  const gridColor = isDark ? 'rgba(120,112,101,0.24)' : 'rgba(210,207,198,0.72)';
  const textColor = isDark ? '#9ca3af' : '#9ca3af';

  const lineColors = isDark
    ? { input: '#B8C2D8', output: '#D8BE96', cache: '#AFC2B5' }
    : { input: '#1E2A44', output: '#A77A45', cache: '#65776B' };

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#D8D5CC] bg-white/90 p-5 shadow-[0_10px_26px_rgba(16,20,24,0.055)] dark:border-white/10 dark:bg-white/[0.055]">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[#1E2A44]/45 dark:bg-[#D8BE96]/45" />
      <h3 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">Token 用量趋势</h3>
      <p className="mb-4 text-xs text-gray-400 dark:text-dark-500">
        {loading || data.length === 0
          ? '各时段 Token 消耗分布'
          : `共 ${formatTokens(totalTokens)} tokens`}
      </p>
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#A77A45] border-t-transparent" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-gray-400 dark:text-dark-500">暂无数据</div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradInput" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColors.input} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={lineColors.input} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradOutput" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColors.output} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={lineColors.output} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCache" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColors.cache} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={lineColors.cache} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: textColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: textColor }} tickFormatter={formatTokens} axisLine={false} tickLine={false} width={45} />
              <Tooltip
                contentStyle={{
                  background: isDark ? 'rgba(30,30,46,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(8px)',
                  border: `1px solid ${isDark ? 'rgba(55,65,81,0.5)' : 'rgba(229,231,235,0.8)'}`,
                  borderRadius: 12,
                  fontSize: 12,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                }}
                formatter={(value: number, name: string) =>
                  [formatTokens(value), name === 'inputTokens' ? '输入' : name === 'outputTokens' ? '输出' : '缓存读']
                }
              />
              <Legend
                formatter={(value: string) => value === 'inputTokens' ? '输入' : value === 'outputTokens' ? '输出' : '缓存读'}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
              <Line type="monotone" dataKey="inputTokens" stroke={lineColors.input} strokeWidth={2.5} dot={false} fill="url(#gradInput)" />
              <Line type="monotone" dataKey="outputTokens" stroke={lineColors.output} strokeWidth={2.5} dot={false} fill="url(#gradOutput)" />
              <Line type="monotone" dataKey="cacheReadTokens" stroke={lineColors.cache} strokeWidth={2.5} dot={false} fill="url(#gradCache)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function DashboardPage() {
  const balance = useAuthStore((s) => s.user?.balance);
  const addToast = useToastStore((s) => s.addToast);
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const [overview, setOverview] = useState<UserDashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  // Shared time range state
  const [preset, setPreset] = useState<PresetKey>('7d');
  const [customStart, setCustomStart] = useState(daysAgoStr(7));
  const [customEnd, setCustomEnd] = useState(todayStr());

  const [modelData, setModelData] = useState<UserModelStats[]>([]);
  const [modelLoading, setModelLoading] = useState(true);

  const [tokenTrend, setTokenTrend] = useState<UserTokenTrend[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);

  // Derive TimeRangeParams from current state
  const timeParams = useMemo<TimeRangeParams>(() => {
    if (preset === 'custom') {
      return { start: customStart, end: customEnd };
    }
    const p = PRESETS.find((p) => p.key === preset);
    return { days: p?.days ?? 7 };
  }, [preset, customStart, customEnd]);

  // Overview (once)
  useEffect(() => {
    userDashboardApi.overview()
      .then((res) => setOverview(res.data))
      .catch(() => addToast({ type: 'error', message: '加载仪表盘数据失败' }))
      .finally(() => setLoading(false));
  }, [addToast]);

  // Fetch both charts when time range changes
  const fetchCharts = useCallback(async (params: TimeRangeParams) => {
    setModelLoading(true);
    setTrendLoading(true);
    try {
      const [modelRes, trendRes] = await Promise.all([
        userDashboardApi.modelDistribution(params),
        userDashboardApi.tokenTrend(params),
      ]);
      setModelData(modelRes.data);
      setTokenTrend(trendRes.data);
    } catch {
      addToast({ type: 'error', message: '加载图表数据失败' });
    } finally {
      setModelLoading(false);
      setTrendLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void fetchCharts(timeParams);
    }, 0);
    return () => window.clearTimeout(handle);
  }, [timeParams, fetchCharts]);

  const handlePresetChange = useCallback((key: PresetKey) => {
    setPreset(key);
    if (key !== 'custom') {
      const p = PRESETS.find((p) => p.key === key);
      if (p?.days) {
        setCustomStart(daysAgoStr(p.days));
        setCustomEnd(todayStr());
      }
    }
  }, []);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <DashboardStatCard
          icon="dollar"
          color="emerald"
          label="当前余额"
          value={balance != null ? `$${balance.toFixed(2)}` : '...'}
        />
        <DashboardStatCard
          icon="sparkles"
          color="indigo"
          label="今日 Tokens"
          value={loading ? '...' : formatTokens(overview?.todayTokens ?? 0)}
          subtext={loading ? undefined : `总计 ${formatTokens(overview?.totalTokens ?? 0)}`}
        />
        <DashboardStatCard
          icon="chartBar"
          color="blue"
          label="今日请求"
          value={loading ? '...' : formatNumber(overview?.todayRequests ?? 0)}
          subtext={loading ? undefined : `总计 ${formatNumber(overview?.totalRequests ?? 0)}`}
        />
        <DashboardStatCard
          icon="creditCard"
          color="rose"
          label="今日消耗"
          value={loading ? '...' : formatCost(overview?.todayCost ?? 0)}
          subtext={loading ? undefined : `总计 ${formatCost(overview?.totalCost ?? 0)}`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <DashboardStatCard
          icon="trendingUp"
          color="amber"
          label="日均 Tokens"
          value={loading ? '...' : formatTokens(overview?.avgDailyTokens ?? 0)}
        />
        <DashboardStatCard
          icon="server"
          color="violet"
          label="日均请求"
          value={loading ? '...' : (overview?.avgDailyRequests ?? 0).toFixed(1)}
        />
        <DashboardStatCard
          icon="globe"
          color="cyan"
          label="RPM"
          value={loading ? '...' : (overview?.rpm ?? 0).toFixed(1)}
        />
        <DashboardStatCard
          icon="clock"
          color="teal"
          label="平均响应"
          value={loading ? '...' : formatDuration(overview?.avgDurationMs ?? 0)}
        />
      </div>

      <ChartSectionHeader
          preset={preset}
          start={customStart}
          end={customEnd}
          onPresetChange={handlePresetChange}
          onStartChange={setCustomStart}
          onEndChange={setCustomEnd}
        />

      {/* Row 3: Charts */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ModelDistributionCard data={modelData} loading={modelLoading} isDark={isDark} />
        <TokenTrendCard data={tokenTrend} loading={trendLoading} isDark={isDark} />
      </div>
    </div>
  );
}
