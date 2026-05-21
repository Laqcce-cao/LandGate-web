import { useEffect, useState, useCallback } from 'react';
import { adminApiKeysApi, type AdminApiKey, type CreateApiKeyAdminRequest, type UpdateApiKeyAdminRequest } from '../../api/admin/api-keys';
import { groupsApi, type Group } from '../../api/admin/groups';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Icon } from '../../components/ui/Icon';
import { DataTable } from '../../components/ui/DataTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Toggle } from '../../components/ui/Toggle';
import { useToastStore } from '../../stores/toastStore';

interface FormState {
  name: string;
  groupId: string;
  quota: string;
  rateLimit5h: string;
  rateLimit1d: string;
  rateLimit7d: string;
  ipWhitelist: string;
  ipBlacklist: string;
  expiresAt: string;
  status: string;
}

const defaultForm: FormState = {
  name: '',
  groupId: '',
  quota: '',
  rateLimit5h: '',
  rateLimit1d: '',
  rateLimit7d: '',
  ipWhitelist: '',
  ipBlacklist: '',
  expiresAt: '',
  status: 'ACTIVE',
};

function buildCreatePayload(f: FormState): CreateApiKeyAdminRequest {
  const payload: CreateApiKeyAdminRequest = { name: f.name.trim() };
  if (f.groupId) payload.groupId = Number(f.groupId);
  if (f.quota) payload.quota = Number(f.quota);
  if (f.rateLimit5h) payload.rateLimit5h = Number(f.rateLimit5h);
  if (f.rateLimit1d) payload.rateLimit1d = Number(f.rateLimit1d);
  if (f.rateLimit7d) payload.rateLimit7d = Number(f.rateLimit7d);
  if (f.ipWhitelist.trim()) payload.ipWhitelist = f.ipWhitelist.trim();
  if (f.ipBlacklist.trim()) payload.ipBlacklist = f.ipBlacklist.trim();
  if (f.expiresAt) payload.expiresAt = new Date(f.expiresAt).toISOString();
  if (f.status) payload.status = f.status;
  return payload;
}

function buildUpdatePayload(f: FormState): UpdateApiKeyAdminRequest {
  const payload: UpdateApiKeyAdminRequest = {};
  if (f.name.trim()) payload.name = f.name.trim();
  if (f.groupId) payload.groupId = Number(f.groupId);
  if (f.quota) payload.quota = Number(f.quota);
  if (f.rateLimit5h) payload.rateLimit5h = Number(f.rateLimit5h);
  if (f.rateLimit1d) payload.rateLimit1d = Number(f.rateLimit1d);
  if (f.rateLimit7d) payload.rateLimit7d = Number(f.rateLimit7d);
  if (f.ipWhitelist.trim()) payload.ipWhitelist = f.ipWhitelist.trim();
  if (f.ipBlacklist.trim()) payload.ipBlacklist = f.ipBlacklist.trim();
  if (f.expiresAt) payload.expiresAt = new Date(f.expiresAt).toISOString();
  if (f.status) payload.status = f.status;
  return payload;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('zh-CN', { hour12: false });
}

export default function ApiKeysAdminPage() {
  const [keys, setKeys] = useState<AdminApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState<AdminApiKey | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminApiKey | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const addToast = useToastStore((s) => s.addToast);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApiKeysApi.list();
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
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const { data } = await adminApiKeysApi.create(buildCreatePayload(form));
      setKeys((prev) => [data, ...prev]);
      setNewKey(data);
      addToast({ type: 'success', message: 'API Key 创建成功' });
    } catch {
      addToast({ type: 'error', message: '创建失败' });
    } finally {
      setSaving(false);
    }
  };

  const [editTarget, setEditTarget] = useState<AdminApiKey | null>(null);

  const handleEditSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const { data } = await adminApiKeysApi.update(editTarget.id, buildUpdatePayload(form));
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

  const handleCloseCreate = () => {
    setCreateOpen(false);
    setNewKey(null);
    setForm({ ...defaultForm });
  };

  const openCreate = async () => {
    try {
      const { data } = await groupsApi.list();
      setGroups(data.groups ?? []);
    } catch { /* ignore */ }
    setForm({ ...defaultForm });
    setNewKey(null);
    setCreateOpen(true);
  };

  const openEdit = async (key: AdminApiKey) => {
    try {
      const { data } = await groupsApi.list();
      setGroups(data.groups ?? []);
    } catch { /* ignore */ }
    setEditTarget(key);
    setForm({
      name: key.name ?? '',
      groupId: key.groupId != null ? String(key.groupId) : '',
      quota: key.quota ? String(key.quota) : '',
      rateLimit5h: key.rateLimit5h ? String(key.rateLimit5h) : '',
      rateLimit1d: key.rateLimit1d ? String(key.rateLimit1d) : '',
      rateLimit7d: key.rateLimit7d ? String(key.rateLimit7d) : '',
      ipWhitelist: key.ipWhitelist ?? '',
      ipBlacklist: key.ipBlacklist ?? '',
      expiresAt: key.expiresAt ? new Date(key.expiresAt).toISOString().slice(0, 16) : '',
      status: key.status ?? 'ACTIVE',
    });
    setEditOpen(true);
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
      await adminApiKeysApi.delete(deleteTarget.id);
      setKeys((prev) => prev.filter((k) => k.id !== deleteTarget.id));
      addToast({ type: 'success', message: 'API Key 已删除' });
      setDeleteTarget(null);
    } catch {
      addToast({ type: 'error', message: '删除失败' });
    } finally {
      setDeleting(false);
    }
  };

  const updateFormField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const renderFormFields = (showRequiredStar: boolean) => (
    <div className="space-y-4">
      <Input
        label={showRequiredStar ? '名称 *' : '名称'}
        placeholder="输入 API Key 名称"
        value={form.name}
        onChange={(e) => updateFormField('name', e.target.value)}
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
          value={form.groupId}
          onChange={(v) => updateFormField('groupId', v)}
          placeholder="选择分组..."
          searchable
          emptyText="暂无可用分组"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="配额 (USD)"
          type="number"
          placeholder="0 = 不限制"
          value={form.quota}
          onChange={(e) => updateFormField('quota', e.target.value)}
        />
        <Input
          label="过期时间"
          type="datetime-local"
          value={form.expiresAt}
          onChange={(e) => updateFormField('expiresAt', e.target.value)}
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Input
          label="5小时速率限制"
          type="number"
          placeholder="0 = 不限制"
          value={form.rateLimit5h}
          onChange={(e) => updateFormField('rateLimit5h', e.target.value)}
        />
        <Input
          label="1天速率限制"
          type="number"
          placeholder="0 = 不限制"
          value={form.rateLimit1d}
          onChange={(e) => updateFormField('rateLimit1d', e.target.value)}
        />
        <Input
          label="7天速率限制"
          type="number"
          placeholder="0 = 不限制"
          value={form.rateLimit7d}
          onChange={(e) => updateFormField('rateLimit7d', e.target.value)}
        />
      </div>
      <Input
        label="IP 白名单"
        placeholder="JSON 数组, 如: [&quot;1.2.3.4&quot;]"
        value={form.ipWhitelist}
        onChange={(e) => updateFormField('ipWhitelist', e.target.value)}
      />
      <Input
        label="IP 黑名单"
        placeholder="JSON 数组, 如: [&quot;5.6.7.8&quot;]"
        value={form.ipBlacklist}
        onChange={(e) => updateFormField('ipBlacklist', e.target.value)}
      />
      <div>
        <label className="input-label">状态</label>
        <div className="flex items-center gap-3 mt-1">
          <Toggle
            checked={form.status === 'ACTIVE'}
            onChange={(on) => updateFormField('status', on ? 'ACTIVE' : 'DISABLED')}
            label={form.status === 'ACTIVE' ? '启用' : '禁用'}
          />
        </div>
      </div>
    </div>
  );

  const columns = [
    { key: 'id', label: 'ID', formatter: (val: unknown) => <span className="text-xs text-gray-500">#{String(val)}</span> },
    { key: 'name', label: '名称' },
    {
      key: 'key',
      label: 'Key',
      formatter: (val: unknown) => (
        <div className="flex items-center gap-1.5 max-w-[200px]">
          <code className="code text-xs truncate">{String(val ?? '')}</code>
          <button
            onClick={() => handleCopy(String(val ?? ''))}
            className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-dark-700"
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
      key: 'quota',
      label: '配额',
      formatter: (_: unknown, row: AdminApiKey) => (
        <span className="text-xs">
          {row.quota > 0 ? `$${row.quota.toFixed(2)} / $${row.quotaUsed.toFixed(2)}` : '-'}
        </span>
      ),
    },
    {
      key: 'expiresAt',
      label: '过期时间',
      formatter: (_: unknown, row: AdminApiKey) => (
        <span className="text-xs">{formatDateTime(row.expiresAt)}</span>
      ),
    },
    {
      key: 'actions',
      label: '操作',
      formatter: (_: unknown, row: AdminApiKey) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
            <Icon name="edit" size="sm" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(row)}>
            <Icon name="trash" size="sm" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-dark-400">管理您的 API 密钥，支持配额、速率限制、IP 黑白名单等高级配置</p>
        <Button onClick={openCreate}>
          <Icon name="plus" size="sm" />
          创建 API Key
        </Button>
      </div>

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
              <Button onClick={handleCreate} loading={saving}>创建</Button>
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
          renderFormFields(true)
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
        {renderFormFields(false)}
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
