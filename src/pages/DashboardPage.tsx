import { useEffect, useState, useMemo } from 'react';
import { Icon, type IconName } from '../components/ui/Icon';
import { TokenUsageChart } from '../components/charts/TokenUsageChart';
import { usageApi, type DailyUsageStats } from '../api/admin/usage';
import { useAuthStore } from '../stores/authStore';
import { Skeleton } from '../components/ui/Skeleton';
import { useToastStore } from '../stores/toastStore';

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function dateToStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface StatRowProps {
  icon: IconName;
  iconColor: string;
  label: string;
  value: string;
}

function StatRow({ icon, iconColor, label, value }: StatRowProps) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconColor}`}>
        <Icon name={icon} size="xs" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 dark:text-dark-400">{label}</p>
        <p className="text-sm font-semibold text-gray-800 dark:text-dark-200 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
}

function SectionCard({ title, children }: SectionCardProps) {
  return (
    <div className="card p-4">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-dark-500">
        {title}
      </h4>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const balance = useAuthStore((s) => s.user?.balance);
  const addToast = useToastStore((s) => s.addToast);

  const [dailyStats, setDailyStats] = useState<DailyUsageStats[]>([]);
  const [allTimeCost, setAllTimeCost] = useState<number | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const start = new Date(end);
    start.setFullYear(start.getFullYear() - 1);

    setStatsLoading(true);

    Promise.all([
      usageApi.dailyStats(dateToStr(start), dateToStr(end)),
      usageApi.myUsage(0, 500),
    ])
      .then(([statsRes, usageRes]) => {
        if (cancelled) return;
        setDailyStats(statsRes.data ?? []);

        const logs = usageRes.data.logs ?? [];
        const totalCost = logs.reduce((sum, l) => sum + (l.totalCost ?? 0), 0);
        setAllTimeCost(totalCost);
      })
      .catch(() => {
        if (!cancelled) {
          addToast({ type: 'error', message: '加载统计数据失败' });
        }
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });

    return () => { cancelled = true; };
  }, [addToast]);

  const aggregate = useMemo(() => {
    if (dailyStats.length === 0) return null;

    let totalTokens = 0;
    let totalCalls = 0;
    let activeDays = 0;

    for (const s of dailyStats) {
      totalTokens += (s.inputTokens ?? 0) + (s.outputTokens ?? 0) + (s.cacheReadTokens ?? 0);
      totalCalls += s.callCount ?? 0;
      if ((s.callCount ?? 0) > 0) activeDays++;
    }

    const avgDailyCalls = totalCalls / (activeDays || 1);
    const avgDailyTokens = totalTokens / (activeDays || 1);

    return { totalTokens, totalCalls, activeDays, avgDailyCalls, avgDailyTokens };
  }, [dailyStats]);

  const loadingVal = statsLoading ? '...' : null;

  return (
    <div className="space-y-4">
      {/* 4-section stat grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* 账户数据 */}
        <SectionCard title="账户数据">
          <StatRow
            icon="dollar"
            iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
            label="当前余额"
            value={balance != null ? `⚡${balance.toFixed(2)}` : '—'}
          />
          <StatRow
            icon="creditCard"
            iconColor="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
            label="历史消耗"
            value={loadingVal ?? (allTimeCost != null ? `⚡${allTimeCost.toFixed(2)}` : '—')}
          />
        </SectionCard>

        {/* 使用统计 */}
        <SectionCard title="使用统计">
          <StatRow
            icon="chartBar"
            iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            label="请求次数"
            value={loadingVal ?? (aggregate ? aggregate.totalCalls.toLocaleString() : '—')}
          />
          <StatRow
            icon="clipboard"
            iconColor="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
            label="统计次数"
            value={loadingVal ?? (aggregate ? aggregate.activeDays.toLocaleString() : '—')}
          />
        </SectionCard>

        {/* 资源消耗 */}
        <SectionCard title="资源消耗">
          <StatRow
            icon="trendingUp"
            iconColor="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
            label="统计额度"
            value={loadingVal ?? (allTimeCost != null ? `⚡${allTimeCost.toFixed(2)}` : '—')}
          />
          <StatRow
            icon="sparkles"
            iconColor="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
            label="总 Tokens"
            value={loadingVal ?? (aggregate ? formatTokens(aggregate.totalTokens) : '—')}
          />
        </SectionCard>

        {/* 性能指标 */}
        <SectionCard title="性能指标">
          <StatRow
            icon="server"
            iconColor="bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400"
            label="日均请求"
            value={loadingVal ?? (aggregate ? aggregate.avgDailyCalls.toFixed(1) : '—')}
          />
          <StatRow
            icon="globe"
            iconColor="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
            label="日均 Tokens"
            value={loadingVal ?? (aggregate ? formatTokens(aggregate.avgDailyTokens) : '—')}
          />
        </SectionCard>
      </div>

      {/* Token usage chart */}
      <TokenUsageChart title="Token 用量趋势" />
    </div>
  );
}
