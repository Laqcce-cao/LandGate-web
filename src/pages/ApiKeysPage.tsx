import { useEffect, useState, useCallback } from 'react';
import { authApi, type ApiKey, type UpdateApiKeyRequest } from '../api/auth';
import { groupsApi, type Group } from '../api/admin/groups';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Icon } from '../components/ui/Icon';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useToastStore } from '../stores/toastStore';

function maskKey(key: string): string {
  if (key.length <= 12) return key;
  return key.slice(0, 7) + '••••••••' + key.slice(-4);
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [quota, setQuota] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<ApiKey | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiKey | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editGroupId, setEditGroupId] = useState('');
  const [editQuota, setEditQuota] = useState('');
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [revealedKeys, setRevealedKeys] = useState<Set<number>>(new Set());
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
        quota: quota ? Number(quota) : undefined,
      });
      setKeys((prev) => [data, ...prev]);
      setNewKey(data);
      addToast({ type: 'success', message: 'API Key 创建成功' });
      setName('');
      setGroupId('');
      setQuota('');
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

  const openEdit = async (key: ApiKey) => {
    try {
      const { data } = await groupsApi.list();
      setGroups(data.groups ?? []);
    } catch { /* ignore */ }
    setEditTarget(key);
    setEditName(key.name ?? '');
    setEditGroupId(key.groupId != null ? String(key.groupId) : '');
    setEditQuota(key.quota ? String(key.quota) : '');
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const payload: UpdateApiKeyRequest = {};
      if (editName.trim()) payload.name = editName.trim();
      if (editGroupId) payload.groupId = Number(editGroupId);
      if (editQuota) payload.quota = Number(editQuota);
      else if (editQuota === '') payload.quota = 0;
      const { data } = await authApi.updateApiKey(editTarget.id, payload);
      setKeys((prev) => prev.map((k) => (k.id === data.id ? data : k)));
      addToast({ type: 'success', message: 'API Key 更新成功' });
      setEditOpen(false);
      setEditTarget(null);
    } catch {
      addToast({ type: 'error', message: '更新失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast({ type: 'success', message: '已复制到剪贴板' });
    } catch {
      addToast({ type: 'error', message: '复制失败' });
    }
  };

  const toggleReveal = (id: number) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  const renderKeyCard = (key: ApiKey) => {
    const isRevealed = revealedKeys.has(key.id);
    const quotaPercent = key.quota > 0 ? Math.min((key.quotaUsed / key.quota) * 100, 100) : 0;
    const isNearLimit = key.quota > 0 && key.quotaUsed >= key.quota * 0.9;

    return (
      <div
        key={key.id}
        className="card flex flex-col gap-3 p-5 transition-colors hover:border-gray-300 dark:hover:border-dark-600"
      >
        {/* Header: name + status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">{key.name}</span>
            <StatusBadge status={key.status ?? 'ACTIVE'} />
          </div>
          <div className="flex items-center gap-0.5 ml-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => openEdit(key)} title="编辑">
              <Icon name="edit" size="sm" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(key)} title="删除">
              <Icon name="trash" size="sm" />
            </Button>
          </div>
        </div>

        {/* Key value */}
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-dark-800">
          <code className="flex-1 truncate text-xs text-gray-600 dark:text-dark-300 select-all">
            {isRevealed ? key.key : maskKey(key.key)}
          </code>
          <button
            onClick={() => toggleReveal(key.id)}
            className="shrink-0 rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-dark-200"
            title={isRevealed ? '隐藏' : '显示'}
          >
            <Icon name={isRevealed ? 'eyeOff' : 'eye'} size="xs" />
          </button>
          <button
            onClick={() => handleCopy(key.key)}
            className="shrink-0 rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-dark-200"
            title="复制"
          >
            <Icon name="copy" size="xs" />
          </button>
        </div>

        {/* Quota progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-dark-400">
              {key.quota > 0 ? '已用额度' : '额度限制'}
            </span>
            <span className={`tabular-nums font-medium ${isNearLimit ? 'text-rose-600 dark:text-rose-400' : 'text-gray-700 dark:text-dark-200'}`}>
              {key.quota > 0
                ? `$${(key.quotaUsed ?? 0).toFixed(2)} / $${key.quota.toFixed(2)} (${quotaPercent.toFixed(0)}%)`
                : '不限制'}
            </span>
          </div>
          {key.quota > 0 && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-dark-700">
              <div
                className={`h-full rounded-full transition-all duration-300 ${isNearLimit ? 'bg-rose-500' : quotaPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${quotaPercent}%` }}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-dark-400">管理您的 API 密钥</p>
        </div>
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
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : keys.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-800">
            <Icon name="key" size="xl" className="text-gray-300 dark:text-dark-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500 dark:text-dark-400">暂无 API Key</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-dark-500">
              创建一个 API Key 以开始调用 API
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {keys.map(renderKeyCard)}
        </div>
      )}

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
                <Button size="sm" onClick={() => handleCopy(newKey.key)}>
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
            </div>
            <Input
              label="配额 (USD)"
              type="number"
              placeholder="0 = 不限制"
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
              hint="自行限制该 Key 的总花费上限"
            />
          </div>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditTarget(null); }}
        title="编辑 API Key"
        width="normal"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setEditOpen(false); setEditTarget(null); }}>取消</Button>
            <Button onClick={handleEditSave} loading={saving}>保存</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="名称"
            placeholder="输入 API Key 名称"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
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
              value={editGroupId}
              onChange={setEditGroupId}
              placeholder="选择分组..."
              searchable
              emptyText="暂无可用分组"
            />
          </div>
          <Input
            label="配额 (USD)"
            type="number"
            placeholder="0 = 不限制"
            value={editQuota}
            onChange={(e) => setEditQuota(e.target.value)}
          />
        </div>
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
