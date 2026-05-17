import { useEffect, useState, useCallback } from 'react';
import { usageApi, type UsageLog } from '../api/admin/usage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { DataTable } from '../components/ui/DataTable';
import { Icon } from '../components/ui/Icon';
import { useToastStore } from '../stores/toastStore';

type FilterType = 'all' | 'user' | 'key' | 'account';

export default function AdminUsagePage() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterId, setFilterId] = useState('');
  const addToast = useToastStore((s) => s.addToast);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      const size = 20;
      const id = Number(filterId);

      switch (filterType) {
        case 'user':
          res = id ? await usageApi.byUser(id, page, size) : await usageApi.list(page, size);
          break;
        case 'key':
          res = id ? await usageApi.byApiKey(id, page, size) : await usageApi.list(page, size);
          break;
        case 'account':
          res = id ? await usageApi.byAccount(id, page, size) : await usageApi.list(page, size);
          break;
        default:
          res = await usageApi.list(page, size);
      }

      setLogs(res.data.logs ?? []);
      setTotal(res.data.total ?? 0);
    } catch {
      addToast({ type: 'error', message: '加载用量日志失败' });
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterId, addToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = () => {
    setPage(0);
    fetchLogs();
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'userId', label: '用户 ID' },
    { key: 'apiKeyId', label: 'API Key ID' },
    { key: 'accountId', label: '账号 ID' },
    { key: 'model', label: '模型' },
    { key: 'platform', label: '平台' },
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

  const filterOptions: { value: FilterType; label: string; placeholder: string }[] = [
    { value: 'all', label: '全部', placeholder: '' },
    { value: 'user', label: '用户 ID', placeholder: '输入用户 ID' },
    { value: 'key', label: 'API Key ID', placeholder: '输入 API Key ID' },
    { value: 'account', label: '账号 ID', placeholder: '输入账号 ID' },
  ];

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-dark-800">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filterType === opt.value
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-dark-700 dark:text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-dark-400 dark:hover:text-white'
              }`}
              onClick={() => { setFilterType(opt.value); setFilterId(''); setPage(0); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {filterType !== 'all' && (
          <Input
            placeholder={filterOptions.find((o) => o.value === filterType)?.placeholder}
            value={filterId}
            onChange={(e) => setFilterId(e.target.value)}
            className="w-48"
          />
        )}
        {filterType !== 'all' && (
          <Button onClick={handleSearch}>
            <Icon name="search" size="sm" />
            查询
          </Button>
        )}
      </div>

      <div className="card">
        <DataTable columns={columns} data={logs} loading={loading} />

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 dark:border-dark-700">
            <span className="text-sm text-gray-500 dark:text-dark-400">
              共 {total} 条记录，第 {page + 1}/{totalPages} 页
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                上一页
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                下一页
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
