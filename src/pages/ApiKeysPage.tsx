import { useEffect, useState, useCallback } from 'react';
import { authApi, type ApiKey } from '../api/auth';
import { groupsApi, type Group } from '../api/admin/groups';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Icon } from '../components/ui/Icon';
import { DataTable } from '../components/ui/DataTable';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useToastStore } from '../stores/toastStore';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<ApiKey | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const addToast = useToastStore((s) => s.addToast);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await authApi.listApiKeys();
      setKeys(Array.isArray(data) ? data : []);
    } catch {
      addToast({ type: 'error', message: '加载 API Key 列表失败' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { data } = await authApi.createApiKey({
        name: name.trim(),
        groupId: groupId ? Number(groupId) : undefined,
      });
      setKeys((prev) => [data, ...prev]);
      setNewKey(data);
      addToast({ type: 'success', message: 'API Key 创建成功' });
      setName('');
      setGroupId('');
    } catch {
      addToast({ type: 'error', message: '创建失败' });
    } finally {
      setCreating(false);
    }
  };

  const handleCloseCreate = () => {
    setCreateOpen(false);
    setNewKey(null);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast({ type: 'success', message: '已复制到剪贴板' });
    } catch {
      addToast({ type: 'error', message: '复制失败' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await authApi.deleteApiKey(deleteTarget.id);
      setKeys((prev) => prev.filter((k) => k.id !== deleteTarget.id));
      addToast({ type: 'success', message: 'API Key 已删除' });
      setDeleteTarget(null);
    } catch {
      addToast({ type: 'error', message: '删除失败' });
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: '名称' },
    {
      key: 'key',
      label: 'Key',
      formatter: (val: unknown, _row: ApiKey) => (
        <div className="flex items-center gap-2">
          <code className="code text-xs">{String(val ?? '')}</code>
          <button
            onClick={() => handleCopy(String(val ?? ''))}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-dark-700"
            title="复制"
          >
            <Icon name="copy" size="xs" />
          </button>
        </div>
      ),
    },
    {
      key: 'status',
      label: '状态',
      formatter: (val: unknown) => <StatusBadge status={String(val ?? 'ACTIVE')} />,
    },
    {
      key: 'actions',
      label: '操作',
      formatter: (_: unknown, row: ApiKey) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteTarget(row)}
        >
          <Icon name="trash" size="sm" />
          删除
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="API Keys"
        description="管理您的 API 密钥"
        actions={
          <Button onClick={async () => {
            try {
              const { data } = await groupsApi.list();
              setGroups(data.groups ?? []);
            } catch { /* ignore */ }
            setCreateOpen(true);
          }}>
            <Icon name="plus" size="sm" />
            创建 API Key
          </Button>
        }
      />

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <DataTable columns={columns} data={keys} />
        )}
      </div>

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={handleCloseCreate}
        title="创建 API Key"
        width="normal"
        footer={
          newKey ? (
            <Button variant="secondary" onClick={handleCloseCreate}>关闭</Button>
          ) : (
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={handleCloseCreate}>取消</Button>
              <Button onClick={handleCreate} loading={creating}>创建</Button>
            </div>
          )
        }
      >
        {newKey ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
              <p className="mb-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                API Key 创建成功
              </p>
              <p className="mb-3 text-xs text-emerald-600 dark:text-emerald-500">
                请立即保存此 Key，关闭后将无法再次查看完整 Key。
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded-lg bg-white px-3 py-2 text-sm font-mono text-gray-900 dark:bg-dark-900 dark:text-white">
                  {newKey.key}
                </code>
                <Button
                  size="sm"
                  onClick={() => handleCopy(newKey.key)}
                >
                  <Icon name="copy" size="sm" />
                  复制
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label="名称"
              placeholder="输入 API Key 名称"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div>
              <label className="input-label">分组</label>
              <Select
                options={[
                  { value: '', label: '不指定（默认分组）' },
                  ...groups.map((g) => ({
                    value: String(g.id),
                    label: `${g.name} (ID:${g.id})`,
                  })),
                ]}
                value={groupId}
                onChange={setGroupId}
                placeholder="选择分组..."
                searchable
                emptyText="暂无可用分组"
              />
              <p className="mt-1 text-xs text-gray-400">不指定则使用系统默认分组</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="删除 API Key"
        message={`确定要删除 API Key "${deleteTarget?.name}" 吗？此操作不可撤销。`}
        confirmText="删除"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
