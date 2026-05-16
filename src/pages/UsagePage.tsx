import { useEffect, useState, useCallback } from 'react';
import { usageApi, type UsageLog } from '../api/admin/usage';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { Icon } from '../components/ui/Icon';
import { useToastStore } from '../stores/toastStore';

export default function UsagePage() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const addToast = useToastStore((s) => s.addToast);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const size = 20;
      const res = await usageApi.list(page, size);
      setLogs(res.data.logs ?? []);
      setTotal(res.data.total ?? 0);
    } catch {
      addToast({ type: 'error', message: '加载用量日志失败' });
    } finally {
      setLoading(false);
    }
  }, [page, addToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns = [
    {
      key: 'model',
      label: '模型',
    },
    {
      key: 'platform',
      label: '平台',
    },
    {
      key: 'inputTokens',
      label: '输入 Tokens',
      formatter: (val: unknown) => Number(val ?? 0).toLocaleString(),
    },
    {
      key: 'outputTokens',
      label: '输出 Tokens',
      formatter: (val: unknown) => Number(val ?? 0).toLocaleString(),
    },
    {
      key: 'totalCost',
      label: '费用',
      formatter: (val: unknown) => `$${Number(val ?? 0).toFixed(6)}`,
    },
    {
      key: 'createdAt',
      label: '时间',
      formatter: (val: unknown) => (val ? new Date(String(val)).toLocaleString('zh-CN') : '—'),
    },
  ];

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <PageHeader title="用量统计" description="查看您的 API 调用历史和用量" />

      <div className="card">
        <DataTable columns={columns} data={logs} loading={loading} />

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 dark:border-dark-700">
            <span className="text-sm text-gray-500 dark:text-dark-400">
              共 {total} 条记录，第 {page + 1}/{totalPages} 页
            </span>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-secondary btn-sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <Icon name="chevronLeft" size="sm" />
                上一页
              </button>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                下一页
                <Icon name="chevronRight" size="sm" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
