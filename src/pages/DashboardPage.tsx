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

function TimeRangeBar({ preset, onStartChange, onEndChange, onPresetChange, start, end }: {
  preset: PresetKey;
  start: string;
  end: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onPresetChange: (key: PresetKey) => void;
}) {
  const isCustom = preset === 'custom';

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100/80 bg-white px-4 py-3 dark:border-dark-700/50 dark:bg-dark-800">
      {/* Preset tabs */}
      <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-dark-800">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            className={clsx(
              'rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-200',
              preset === p.key
                ? 'bg-white text-gray-900 shadow-sm dark:bg-dark-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-200'
            )}
            onClick={() => onPresetChange(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      {isCustom && <div className="h-5 w-px bg-gray-200 dark:bg-dark-600" />}

      {/* Custom date range */}
      <div className={clsx(
        'flex items-center gap-2 transition-all',
        isCustom ? 'opacity-100' : 'pointer-events-none h-0 overflow-hidden opacity-0'
      )}>
        <DatePicker value={start} onChange={onStartChange} max={end} />
        <span className="text-xs text-gray-400 dark:text-dark-500">至</span>
        <DatePicker value={end} onChange={onEndChange} min={start} max={todayStr()} />
      </div>
    </div>
  );
}

// ─── Stat Card (gradient style) ────────────────────────────

interface CardColorScheme {
  gradient: string;
  glow: string;
  text: string;
  iconBg: string;
}

const COLOR_MAP: Record<string, CardColorScheme> = {
  emerald: {
    gradient: 'from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-500/15 dark:via-teal-500/10',
    glow: 'shadow-emerald-500/5',
    text: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500',
  },
  indigo: {
    gradient: 'from-indigo-500/10 via-violet-500/5 to-transparent dark:from-indigo-500/15 dark:via-violet-500/10',
    glow: 'shadow-indigo-500/5',
    text: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-gradient-to-br from-indigo-400 to-violet-500',
  },
  blue: {
    gradient: 'from-blue-500/10 via-cyan-500/5 to-transparent dark:from-blue-500/15 dark:via-cyan-500/10',
    glow: 'shadow-blue-500/5',
    text: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-gradient-to-br from-blue-400 to-cyan-500',
  },
  rose: {
    gradient: 'from-rose-500/10 via-pink-500/5 to-transparent dark:from-rose-500/15 dark:via-pink-500/10',
    glow: 'shadow-rose-500/5',
    text: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-gradient-to-br from-rose-400 to-pink-500',
  },
  amber: {
    gradient: 'from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-500/15 dark:via-orange-500/10',
    glow: 'shadow-amber-500/5',
    text: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
  },
  violet: {
    gradient: 'from-violet-500/10 via-purple-500/5 to-transparent dark:from-violet-500/15 dark:via-purple-500/10',
    glow: 'shadow-violet-500/5',
    text: 'text-violet-600 dark:text-violet-400',
    iconBg: 'bg-gradient-to-br from-violet-400 to-purple-500',
  },
  cyan: {
    gradient: 'from-cyan-500/10 via-sky-500/5 to-transparent dark:from-cyan-500/15 dark:via-sky-500/10',
    glow: 'shadow-cyan-500/5',
    text: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-gradient-to-br from-cyan-400 to-sky-500',
  },
  teal: {
    gradient: 'from-teal-500/10 via-emerald-500/5 to-transparent dark:from-teal-500/15 dark:via-emerald-500/10',
    glow: 'shadow-teal-500/5',
    text: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-gradient-to-br from-teal-400 to-emerald-500',
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
      'group relative overflow-hidden rounded-2xl border border-gray-100/80 bg-white p-4 transition-all duration-300',
      'hover:shadow-lg dark:border-dark-700/50 dark:bg-dark-800',
      c.glow,
    )}>
      {/* Gradient overlay */}
      <div className={clsx('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100', c.gradient)} />
      <div className="relative flex items-center gap-3">
        <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm', c.iconBg)}>
          <Icon name={icon} size="md" className="text-white" />
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
  '#818cf8', '#a78bfa', '#c084fc', '#e879f9',
  '#f472b6', '#fb7185', '#fb923c', '#fbbf24',
  '#4ade80', '#2dd4bf', '#22d3ee', '#60a5fa',
];

const CHART_COLORS_DARK = [
  '#a5b4fc', '#c4b5fd', '#d8b4fe', '#f0abfc',
  '#f9a8d4', '#fda4af', '#fdba74', '#fcd34d',
  '#86efac', '#5eead4', '#67e8f9', '#93c5fd',
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
    <div className="group relative overflow-hidden rounded-2xl border border-gray-100/80 bg-white p-5 dark:border-dark-700/50 dark:bg-dark-800">
      <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">模型分布</h3>
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
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
                    fontSize: 12,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                  }}
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

  const gridColor = isDark ? 'rgba(55,65,81,0.3)' : 'rgba(229,231,235,0.6)';
  const textColor = isDark ? '#9ca3af' : '#9ca3af';

  const lineColors = isDark
    ? { input: '#93c5fd', output: '#6ee7b7', cache: '#67e8f9' }
    : { input: '#3b82f6', output: '#10b981', cache: '#06b6d4' };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100/80 bg-white p-5 dark:border-dark-700/50 dark:bg-dark-800">
      <h3 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">Token 用量趋势</h3>
      <p className="mb-4 text-xs text-gray-400 dark:text-dark-500">
        {loading || data.length === 0
          ? '各时段 Token 消耗分布'
          : `共 ${formatTokens(totalTokens)} tokens`}
      </p>
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
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

  useEffect(() => { fetchCharts(timeParams); }, [timeParams, fetchCharts]);

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
    <div className="space-y-4">
      {/* Row 1: Core Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <DashboardStatCard
          icon="dollar"
          color="emerald"
          label="当前余额"
          value={balance != null ? `⚡${balance.toFixed(2)}` : '...'}
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

      {/* Row 2: Performance Stats */}
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

      {/* Time Range Selector */}
      <TimeRangeBar
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
