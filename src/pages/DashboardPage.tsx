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
    <div className="card flex flex-wrap items-center gap-3 px-4 py-3">
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

// ─── Stat Card (sub2api style) ─────────────────────────────

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  blue:    { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  purple:  { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
  green:   { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
  amber:   { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
  indigo:  { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400' },
  violet:  { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400' },
  rose:    { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400' },
  cyan:    { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400' },
  teal:    { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400' },
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
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className={clsx('rounded-lg p-2', c.bg)}>
          <Icon name={icon} size="md" className={c.text} />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtext && (
            <p className="text-xs text-green-600 dark:text-green-400">{subtext}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Chart Colors ───────────────────────────────────────────

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#f97316', '#eab308',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

// ─── Model Distribution Chart ───────────────────────────────

function ModelDistributionCard({ data, loading, isDark }: {
  data: UserModelStats[];
  loading: boolean;
  isDark: boolean;
}) {
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
    <div className="card p-4">
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
                  paddingAngle={1}
                >
                  {top.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <ReTooltip
                  contentStyle={{
                    background: isDark ? '#1e1e2e' : '#fff',
                    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                    borderRadius: 8,
                    fontSize: 12,
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
                <tr className="text-gray-500 dark:text-dark-400">
                  <th className="pb-1 text-left font-medium">模型</th>
                  <th className="pb-1 text-right font-medium">调用</th>
                  <th className="pb-1 text-right font-medium">Token</th>
                  <th className="pb-1 text-right font-medium">费用</th>
                </tr>
              </thead>
              <tbody>
                {top.map((m, i) => (
                  <tr key={m.model} className="border-t border-gray-50 dark:border-dark-700/50">
                    <td className="py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="truncate text-gray-800 dark:text-dark-200">{m.model}</span>
                      </div>
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-gray-600 dark:text-dark-300">{formatNumber(m.callCount)}</td>
                    <td className="py-1.5 text-right tabular-nums text-gray-600 dark:text-dark-300">{formatTokens(m.totalTokens)}</td>
                    <td className="py-1.5 text-right tabular-nums font-medium text-rose-600 dark:text-rose-400">{formatCost(Number(m.totalCost))}</td>
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

  const gridColor = isDark ? '#374151' : '#e5e7eb';
  const textColor = isDark ? '#9ca3af' : '#6b7280';

  return (
    <div className="card p-4">
      <h3 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">Token 用量趋势</h3>
      <p className="mb-3 text-xs text-gray-500 dark:text-dark-400">
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
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: textColor }} />
              <YAxis tick={{ fontSize: 10, fill: textColor }} tickFormatter={formatTokens} />
              <Tooltip
                contentStyle={{
                  background: isDark ? '#1e1e2e' : '#fff',
                  border: `1px solid ${gridColor}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) =>
                  [formatTokens(value), name === 'inputTokens' ? '输入' : name === 'outputTokens' ? '输出' : '缓存读']
                }
              />
              <Legend formatter={(value: string) => value === 'inputTokens' ? '输入' : value === 'outputTokens' ? '输出' : '缓存读'} />
              <Line type="monotone" dataKey="inputTokens" stroke="#3b82f6" strokeWidth={2} dot={false} fill="#3b82f6" fillOpacity={0.1} />
              <Line type="monotone" dataKey="outputTokens" stroke="#10b981" strokeWidth={2} dot={false} fill="#10b981" fillOpacity={0.1} />
              <Line type="monotone" dataKey="cacheReadTokens" stroke="#06b6d4" strokeWidth={2} dot={false} fill="#06b6d4" fillOpacity={0.1} />
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
          color="green"
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
