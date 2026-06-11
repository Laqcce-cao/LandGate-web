import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { usageApi, type DailyUsageStats } from '../../api/admin/usage';
import { Tabs } from '../ui/Tabs';
import { Skeleton } from '../ui/Skeleton';
import { Icon } from '../ui/Icon';
import { useThemeStore } from '../../stores/themeStore';
import { useToastStore } from '../../stores/toastStore';

interface TokenUsageData {
  label: string;
  timestamp: number;
  cacheReadTokens: number;
  inputTokens: number;
  outputTokens: number;
}

type TimeMode = '7d' | '30d';

const MODES: { key: TimeMode; label: string }[] = [
  { key: '7d',  label: '近7天' },
  { key: '30d', label: '近30天' },
];

function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

/**
 * 根据选中的时间模式计算 start/end 日期字符串（yyyy-MM-dd）。
 * end 取明天（不包含），保证当天数据也被纳入。
 */
function computeDateRange(mode: TimeMode): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const days = mode === '7d' ? 7 : 30;
  const start = new Date(end);
  start.setDate(end.getDate() - days);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

/**
 * 将后端返回的 DailyUsageStats[] 转换为图表可用数据，并补零填满所有日期。
 */
function fillChartData(stats: DailyUsageStats[], mode: TimeMode): TokenUsageData[] {
  const days = mode === '7d' ? 7 : 30;
  const { start } = computeDateRange(mode);
  const startDate = new Date(start);

  // 创建每一天的空桶
  const buckets: Map<string, TokenUsageData> = new Map();
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, {
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      timestamp: d.getTime(),
      cacheReadTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
    });
  }

  // 填充后端返回的实际数据
  for (const s of stats) {
    const bucket = buckets.get(s.date);
    if (bucket) {
      bucket.inputTokens += s.inputTokens ?? 0;
      bucket.outputTokens += s.outputTokens ?? 0;
      bucket.cacheReadTokens += s.cacheReadTokens ?? 0;
    }
  }

  return Array.from(buckets.values());
}

function CustomTooltip({ active, payload, label, isDark }: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number }>;
  label?: string;
  isDark: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const nameMap: Record<string, string> = {
    cacheReadTokens: '缓存命中',
    inputTokens: '输入令牌',
    outputTokens: '输出令牌',
  };

  const colors: Record<string, string> = {
    cacheReadTokens: isDark ? '#93c5fd' : '#60a5fa',
    inputTokens:     isDark ? '#3b82f6' : '#2563eb',
    outputTokens:    isDark ? '#60a5fa' : '#3b82f6',
  };

  return (
    <div className="card rounded-lg px-3 py-2 text-xs shadow-lg border border-gray-100 dark:border-dark-700">
      <p className="mb-1 font-medium text-gray-800 dark:text-dark-200">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-gray-600 dark:text-dark-400">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: colors[entry.dataKey] || '#888' }}
          />
          <span>{nameMap[entry.dataKey] || entry.dataKey}:</span>
          <span className="tabular-nums font-medium text-gray-800 dark:text-dark-200">
            {formatCompactNumber(entry.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

interface TokenUsageChartProps {
  title?: string;
}

/**
 * Token 用量趋势图表。
 * <p>
 * 根据用户选择的时间范围（7d / 30d）调用后端聚合接口
 * {@code GET /api/v1/user/usage/my/stats}，后端直接返回按天分组的数据，
 * 避免拉取原始日志后在前端二次聚合。
 */
export function TokenUsageChart({ title = 'Token 用量' }: TokenUsageChartProps) {
  const [stats, setStats] = useState<DailyUsageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [timeMode, setTimeMode] = useState<TimeMode>('7d');
  const theme = useThemeStore((s) => s.theme);
  const addToast = useToastStore((s) => s.addToast);
  const isDark = theme === 'dark';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { start, end } = computeDateRange(timeMode);
      const { data } = await usageApi.dailyStats(start, end);
      setStats(data ?? []);
    } catch {
      setError(true);
      addToast({ type: 'error', message: '加载用量数据失败' });
    } finally {
      setLoading(false);
    }
  }, [timeMode, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartData = useMemo(
    () => fillChartData(stats, timeMode),
    [stats, timeMode],
  );

  // 所有 token 总量
  const totalTokens = useMemo(() => {
    let total = 0;
    for (const s of stats) {
      total += (s.inputTokens ?? 0) + (s.outputTokens ?? 0) + (s.cacheReadTokens ?? 0);
    }
    return total;
  }, [stats]);

  const colors = {
    cacheReadTokens: isDark ? '#93c5fd' : '#60a5fa',
    inputTokens:     isDark ? '#3b82f6' : '#2563eb',
    outputTokens:    isDark ? '#60a5fa' : '#3b82f6',
  };

  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  const timeTabs = MODES.map((m) => ({ key: m.key, label: m.label }));
  const timeLabel = MODES.find((m) => m.key === timeMode)?.label || '';

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <Skeleton className="mb-1 h-6 w-44" />
          <Skeleton className="mb-6 h-4 w-64" />
          <div className="mb-4 flex items-center gap-4">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center gap-3 py-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
            <Icon name="xCircle" size="xl" className="text-rose-500 dark:text-rose-400" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-dark-400">加载图表数据失败</p>
          <button className="btn btn-secondary btn-sm mt-1" onClick={fetchData}>
            重试
          </button>
        </div>
      );
    }

    if (stats.length === 0) {
      return (
        <div className="flex flex-col items-center gap-3 py-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-800">
            <Icon name="chart" size="xl" className="text-gray-300 dark:text-dark-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500 dark:text-dark-400">暂无 Token 使用记录</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-dark-500">
              发起 API 调用后将在此处展示用量图表
            </p>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Controls row */}
        <div className="mb-4 flex items-center">
          <Tabs items={timeTabs} activeKey={timeMode} onChange={(k) => setTimeMode(k as TimeMode)} />
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            barGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: axisColor }}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: axisColor }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCompactNumber}
              width={50}
            />
            <Tooltip content={<CustomTooltip isDark={isDark} />} cursor={false} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
              formatter={(value: string) => {
                const map: Record<string, string> = {
                  cacheReadTokens: '缓存命中',
                  inputTokens: '输入令牌',
                  outputTokens: '输出令牌',
                };
                return <span style={{ color: axisColor }}>{map[value] || value}</span>;
              }}
            />
            <Bar dataKey="inputTokens"     stackId="tokens" fill={colors.inputTokens}     name="inputTokens"     barSize={24} />
            <Bar dataKey="outputTokens"    stackId="tokens" fill={colors.outputTokens}    name="outputTokens"    barSize={24} />
            <Bar dataKey="cacheReadTokens" stackId="tokens" fill={colors.cacheReadTokens} name="cacheReadTokens" barSize={24} radius={[0, 0, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </>
    );
  };

  return (
    <div className="card p-4">
      <h3 className="mb-0.5 text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mb-3 text-sm text-gray-500 dark:text-dark-400">
        {loading || error || stats.length === 0
          ? '各时段 Token 消耗分布'
          : `共 ${formatCompactNumber(totalTokens)} tokens（${timeLabel}）`}
      </p>
      {renderContent()}
    </div>
  );
}
