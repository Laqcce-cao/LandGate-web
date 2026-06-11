import { useEffect, useState, useMemo, useCallback } from 'react';
import clsx from 'clsx';
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import {
  dashboardApi,
  type DashboardOverview,
  type ModelStats,
  type PlatformDailyStats,
  type UserDailyStats,
  type DashboardTimeRangeParams,
} from '../api/admin/dashboard';
import { Icon, type IconName } from '../components/ui/Icon';
import { DatePicker } from '../components/ui/DatePicker';
import { Skeleton } from '../components/ui/Skeleton';
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

function daysBetween(start: string, end: string): number {
  const startTime = new Date(`${start}T00:00:00`).getTime();
  const endTime = new Date(`${end}T00:00:00`).getTime();
  const diff = Math.ceil((endTime - startTime) / 86_400_000);
  return Number.isFinite(diff) && diff > 0 ? diff : 30;
}

type PresetKey = '7d' | '30d' | '90d' | 'custom';

const PRESETS: { key: PresetKey; label: string; days?: number }[] = [
  { key: '7d', label: '近7天', days: 7 },
  { key: '30d', label: '近30天', days: 30 },
  { key: '90d', label: '近90天', days: 90 },
  { key: 'custom', label: '自定义' },
];

function TimeRangeBar({ preset, start, end, onPresetChange, onStartChange, onEndChange }: {
  preset: PresetKey;
  start: string;
  end: string;
  onPresetChange: (key: PresetKey) => void;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
}) {
  const isCustom = preset === 'custom';

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100/80 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.055]">
      <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-white/[0.055]">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            className={clsx(
              'rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-200',
              preset === p.key
                ? 'bg-white text-gray-900 shadow-sm dark:bg-white/[0.12] dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-200',
            )}
            onClick={() => onPresetChange(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isCustom && <div className="h-5 w-px bg-gray-200 dark:bg-dark-600" />}

      <div className={clsx(
        'flex items-center gap-2 transition-all',
        isCustom ? 'opacity-100' : 'pointer-events-none h-0 overflow-hidden opacity-0',
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

const USER_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
  '#6366f1', '#84cc16', '#06b6d4', '#a855f7',
];

// ─── Model Distribution Chart ───────────────────────────────

function ModelDistributionCard({ data, loading, isDark }: {
  data: ModelStats[];
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
    <div className="group relative overflow-hidden rounded-2xl border border-gray-100/80 bg-white p-5 dark:border-white/10 dark:bg-white/[0.055]">
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
  data: PlatformDailyStats[];
  loading: boolean;
  isDark: boolean;
}) {
  const chartData = useMemo(() =>
    data.map((s) => {
      const inputTokens = s.inputTokens ?? 0;
      const cacheReadTokens = s.cacheReadTokens ?? 0;
      const cacheCreationTokens = s.cacheCreationTokens ?? 0;
      const totalInputContext = inputTokens + cacheReadTokens + cacheCreationTokens;
      const cacheHitRate = totalInputContext > 0 ? (cacheReadTokens / totalInputContext) * 100 : 0;
      const d = new Date(s.date);
      return {
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        inputTokens,
        outputTokens: s.outputTokens ?? 0,
        cacheReadTokens,
        cacheHitRate: Math.round(cacheHitRate * 10) / 10,
      };
    }),
    [data],
  );

  const gridColor = isDark ? '#374151' : '#e5e7eb';
  const textColor = isDark ? '#9ca3af' : '#6b7280';

  return (
    <div className="card p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Token 用量趋势</h3>
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-400 dark:text-dark-500">暂无数据</div>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: textColor }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: textColor }} tickFormatter={formatTokens} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fill: textColor }} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip
                contentStyle={{
                  background: isDark ? '#1e1e2e' : '#fff',
                  border: `1px solid ${gridColor}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'cacheHitRate') return [`${value}%`, '缓存命中率'];
                  return [formatTokens(value), name === 'inputTokens' ? '输入' : name === 'outputTokens' ? '输出' : '缓存读'];
                }}
              />
              <Legend formatter={(value: string) => value === 'inputTokens' ? '输入' : value === 'outputTokens' ? '输出' : value === 'cacheReadTokens' ? '缓存读' : '命中率'} />
              <Line yAxisId="left" type="monotone" dataKey="inputTokens" stroke="#3b82f6" strokeWidth={2} dot={false} fill="#3b82f6" fillOpacity={0.1} />
              <Line yAxisId="left" type="monotone" dataKey="outputTokens" stroke="#10b981" strokeWidth={2} dot={false} fill="#10b981" fillOpacity={0.1} />
              <Line yAxisId="left" type="monotone" dataKey="cacheReadTokens" stroke="#06b6d4" strokeWidth={2} dot={false} fill="#06b6d4" fillOpacity={0.1} />
              <Line yAxisId="right" type="monotone" dataKey="cacheHitRate" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── User Usage Trend Chart ─────────────────────────────────

function UserTrendCard({ data, loading, isDark }: {
  data: UserDailyStats[];
  loading: boolean;
  isDark: boolean;
}) {
  const { chartData, userIds } = useMemo(() => {
    const dateMap = new Map<string, Record<string, number | string>>();
    const ids = new Set<number>();

    for (const d of data) {
      ids.add(d.userId);
      if (!dateMap.has(d.date)) dateMap.set(d.date, { date: d.date });
      dateMap.get(d.date)![`user_${d.userId}`] = d.totalTokens;
    }

    const sorted = Array.from(dateMap.values()).sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );

    const idArr = Array.from(ids);
    for (const row of sorted) {
      for (const id of idArr) {
        if (row[`user_${id}`] === undefined) row[`user_${id}`] = 0;
      }
    }

    return {
      chartData: sorted.map((r) => {
        const d = new Date(r.date as string);
        return { ...r, label: `${d.getMonth() + 1}/${d.getDate()}` };
      }),
      userIds: idArr,
    };
  }, [data]);

  const gridColor = isDark ? '#374151' : '#e5e7eb';
  const textColor = isDark ? '#9ca3af' : '#6b7280';

  return (
    <div className="card p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
        用户用量趋势 · Top {userIds.length}
      </h3>
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
                formatter={(value: number, name: string) => [formatTokens(value), `User #${name.replace('user_', '')}`]}
              />
              {userIds.map((id, i) => (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={`user_${id}`}
                  stroke={USER_COLORS[i % USER_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [modelData, setModelData] = useState<ModelStats[]>([]);
  const [tokenTrend, setTokenTrend] = useState<PlatformDailyStats[]>([]);
  const [userTrend, setUserTrend] = useState<UserDailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const addToast = useToastStore((s) => s.addToast);
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const [preset, setPreset] = useState<PresetKey>('30d');
  const [customStart, setCustomStart] = useState(daysAgoStr(30));
  const [customEnd, setCustomEnd] = useState(todayStr());

  const timeParams = useMemo<DashboardTimeRangeParams>(() => {
    if (preset === 'custom') {
      return {
        days: daysBetween(customStart, customEnd),
        start: customStart,
        end: customEnd,
      };
    }
    const p = PRESETS.find((p) => p.key === preset);
    const days = p?.days ?? 30;
    return { days, start: daysAgoStr(days), end: todayStr() };
  }, [preset, customStart, customEnd]);

  useEffect(() => {
    dashboardApi.overview()
      .then((res) => setOverview(res.data))
      .catch(() => addToast({ type: 'error', message: '加载仪表盘数据失败' }))
      .finally(() => setLoading(false));
  }, [addToast]);

  const fetchCharts = useCallback(async (params: DashboardTimeRangeParams) => {
    setChartsLoading(true);
    try {
      const [modelRes, trendRes, userTrendRes] = await Promise.all([
        dashboardApi.modelDistribution(params),
        dashboardApi.tokenTrend(params),
        dashboardApi.userTrend({ ...params, topN: 12 }),
      ]);
      setModelData(modelRes.data);
      setTokenTrend(trendRes.data);
      setUserTrend(userTrendRes.data);
    } catch {
      addToast({ type: 'error', message: '加载仪表盘图表失败' });
    } finally {
      setChartsLoading(false);
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

  const o = overview;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Core Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DashboardStatCard icon="key" color="blue" label="API Keys" value={o?.totalApiKeys ?? 0} subtext={`${o?.activeApiKeys ?? 0} 活跃`} />
        <DashboardStatCard icon="server" color="purple" label="上游账号" value={o?.totalAccounts ?? 0} subtext={`${o?.normalAccounts ?? 0} 正常 / ${o?.errorAccounts ?? 0} 异常`} />
        <DashboardStatCard icon="chart" color="green" label="今日请求" value={formatNumber(o?.todayRequests ?? 0)} subtext={`${formatNumber(o?.totalRequests ?? 0)} 总计`} />
        <DashboardStatCard icon="user" color="emerald" label="今日新增用户" value={`+${o?.newUsersToday ?? 0}`} subtext={`${formatNumber(o?.totalUsers ?? 0)} 总计`} />
      </div>

      {/* Row 2: Token Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DashboardStatCard icon="sparkles" color="amber" label="今日 Token" value={formatTokens(o?.todayTokens ?? 0)} subtext={formatCost(o?.todayCost ?? 0)} />
        <DashboardStatCard icon="grid" color="indigo" label="总 Token" value={formatTokens(o?.totalTokens ?? 0)} subtext={formatCost(o?.totalCost ?? 0)} />
        <DashboardStatCard icon="trendingUp" color="violet" label="性能" value={`${(o?.rpm ?? 0).toFixed(1)} RPM`} />
        <DashboardStatCard icon="clock" color="rose" label="平均响应" value={formatDuration(o?.avgDurationMs ?? 0)} />
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

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ModelDistributionCard data={modelData} loading={chartsLoading} isDark={isDark} />
        <TokenTrendCard data={tokenTrend} loading={chartsLoading} isDark={isDark} />
      </div>

      {/* User Usage Trend */}
      <UserTrendCard data={userTrend} loading={chartsLoading} isDark={isDark} />
    </div>
  );
}
