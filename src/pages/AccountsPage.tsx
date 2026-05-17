import { useEffect, useState, useCallback } from 'react';
import { accountsApi, type Account } from '../api/admin/accounts';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Toggle } from '../components/ui/Toggle';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DataTable } from '../components/ui/DataTable';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Icon } from '../components/ui/Icon';
import { useToastStore } from '../stores/toastStore';

// ---------------------------------------------------------------------------
// 每种认证类型对应的凭证字段定义
// ---------------------------------------------------------------------------
interface CredField {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
  /** 字段类型，用于渲染 textarea（长文本）或 input */
  type?: 'textarea';
}

const CRED_FIELDS_MAP: Record<string, CredField[]> = {
  api_key: [
    { key: 'api_key', label: 'API Key', placeholder: 'sk-xxx...', required: true },
  ],
  oauth: [
    { key: 'client_id', label: 'Client ID', placeholder: 'OAuth 应用的 Client ID', required: true },
    { key: 'client_secret', label: 'Client Secret', placeholder: 'OAuth 应用的 Client Secret', required: true },
    { key: 'refresh_token', label: 'Refresh Token', placeholder: '用于刷新 access_token（可选）', required: false },
    { key: 'access_token', label: 'Access Token', placeholder: '已有 access_token 可直接填入（可选）', required: false },
  ],
  setup_token: [
    { key: 'access_token', label: 'Access Token', placeholder: 'Setup Token / API Key', required: true },
  ],
  upstream: [
    { key: 'api_key', label: 'API Key', placeholder: '上游 API Key', required: true },
  ],
  bedrock: [
    { key: 'access_key_id', label: 'Access Key ID', placeholder: 'AWS Access Key ID', required: true },
    { key: 'secret_access_key', label: 'Secret Access Key', placeholder: 'AWS Secret Access Key', required: true },
    { key: 'region', label: 'Region', placeholder: 'us-east-1（可选）', required: false },
  ],
  service_account: [
    { key: 'service_account_json', label: 'Service Account JSON', placeholder: '粘贴 GCP 服务账号的完整 JSON', required: true, type: 'textarea' },
  ],
};

function getCredFields(type: string): CredField[] {
  return CRED_FIELDS_MAP[type] ?? [{ key: 'credentials', label: '凭证内容', placeholder: '{}', required: true, type: 'textarea' }];
}

function buildEmptyCredValues(type: string): Record<string, string> {
  const init: Record<string, string> = {};
  getCredFields(type).forEach((f) => { init[f.key] = ''; });
  return init;
}

// ---------------------------------------------------------------------------

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const addToast = useToastStore((s) => s.addToast);

  // ---- 基础字段 ----
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('openai');
  const [type, setType] = useState('api_key');
  const [statusForm, setStatusForm] = useState('ACTIVE');
  const [concurrency, setConcurrency] = useState(3);
  const [priority, setPriority] = useState(50);
  const [rateMultiplier, setRateMultiplier] = useState('1.0');

  // ---- 凭证 & extra ----
  const [credValues, setCredValues] = useState<Record<string, string>>(buildEmptyCredValues('api_key'));
  const [extraBaseUrl, setExtraBaseUrl] = useState('');

  // ---- 当类型切换时重置凭证字段 ----
  const handleTypeChange = (newType: string) => {
    setType(newType);
    setCredValues(buildEmptyCredValues(newType));
  };

  const fetchAccounts = useCallback(async () => {
    try {
      const { data } = await accountsApi.list();
      setAccounts(data.accounts ?? []);
    } catch {
      addToast({ type: 'error', message: '加载账号失败' });
    }
  }, [addToast]);

  useEffect(() => {
    fetchAccounts().finally(() => setLoading(false));
  }, [fetchAccounts]);

  const openEdit = (account: Account) => {
    setEditTarget(account);
    setName(account.name);
    setPlatform(account.platform);
    setType(account.type);
    setStatusForm(account.status);

    // 解析已有 credentials 对象到表单字段
    const fields = getCredFields(account.type);
    const vals: Record<string, string> = {};
    const creds = account.credentials ?? {};
    fields.forEach((f) => {
      const v = (creds as Record<string, unknown>)[f.key];
      vals[f.key] = typeof v === 'string' ? v : (v ? JSON.stringify(v) : '');
    });
    setCredValues(vals);

    // 解析 extra.base_url
    const extra = account.extra ?? {};
    setExtraBaseUrl(typeof (extra as Record<string, unknown>).base_url === 'string' ? (extra as Record<string, unknown>).base_url as string : '');

    setConcurrency(account.concurrency ?? 3);
    setPriority(account.priority ?? 50);
    setRateMultiplier(String(account.rateMultiplier ?? 1.0));
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      // 只保留非空的凭证字段
      const creds: Record<string, string> = {};
      Object.entries(credValues).forEach(([k, v]) => {
        if (v.trim()) creds[k] = v.trim();
      });

      // 构建 extra
      const extra: Record<string, string> = {};
      if (extraBaseUrl.trim()) extra.base_url = extraBaseUrl.trim();

      const payload = {
        name: name.trim(),
        platform,
        type,
        status: statusForm,
        credentials: JSON.stringify(creds),
        extra: JSON.stringify(extra),
        concurrency,
        priority,
        rateMultiplier: Number(rateMultiplier) || 1.0,
      };
      if (editTarget) {
        await accountsApi.update(editTarget.id, payload);
        addToast({ type: 'success', message: '账号已更新' });
      } else {
        await accountsApi.create(payload);
        addToast({ type: 'success', message: '账号已创建' });
      }
      setModalOpen(false);
      fetchAccounts();
    } catch {
      addToast({ type: 'error', message: '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSchedulable = async (account: Account) => {
    const newSchedulable = !account.schedulable;
    try {
      await accountsApi.setSchedulable(account.id, newSchedulable);
      // 同步更新状态：可调度 → ACTIVE，不可调度 → DISABLED
      const newStatus = newSchedulable ? 'ACTIVE' : 'DISABLED';
      await accountsApi.updateStatus(account.id, newStatus);
      addToast({ type: 'success', message: '调度状态已更新' });
      fetchAccounts();
    } catch {
      addToast({ type: 'error', message: '更新失败' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await accountsApi.delete(deleteTarget.id);
      addToast({ type: 'success', message: '账号已删除' });
      setDeleteTarget(null);
      fetchAccounts();
    } catch {
      addToast({ type: 'error', message: '删除失败' });
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: '名称' },
    { key: 'platform', label: '平台' },
    { key: 'type', label: '类型' },
    {
      key: 'status',
      label: '状态',
      formatter: (val: unknown) => <StatusBadge status={String(val ?? 'ACTIVE')} />,
    },
    {
      key: 'schedulable',
      label: '可调度',
      formatter: (_: unknown, row: Account) => (
        <Toggle
          checked={row.schedulable}
          onChange={() => handleToggleSchedulable(row)}
        />
      ),
    },
    {
      key: 'actions',
      label: '操作',
      formatter: (_: unknown, row: Account) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
            <Icon name="edit" size="sm" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(row)}>
            <Icon name="trash" size="sm" className="text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  const platformOptions = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic Claude' },
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'antigravity', label: 'Antigravity' },
  ];

  const typeOptions = [
    { value: 'api_key', label: 'API Key' },
    { value: 'oauth', label: 'OAuth' },
    { value: 'setup_token', label: 'Setup Token' },
    { value: 'upstream', label: '上游代理转发' },
    { value: 'bedrock', label: 'AWS Bedrock' },
    { value: 'service_account', label: 'GCP Service Account' },
  ];

  const credFields = getCredFields(type);

  return (
    <div>
      <div className="card">
        <DataTable columns={columns} data={accounts} loading={loading} />
      </div>

      {/* Create/Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? '编辑账号' : '添加账号'}
        width="normal"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={handleSave} loading={saving}>保存</Button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* 基本信息 */}
          <Input label="名称" value={name} onChange={(e) => setName(e.target.value)} placeholder="输入账号名称" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">平台</label>
              <Select options={platformOptions} value={platform} onChange={setPlatform} />
            </div>
            <div>
              <label className="input-label">类型</label>
              <Select options={typeOptions} value={type} onChange={handleTypeChange} />
            </div>
          </div>

          {/* 调度参数 */}
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="并发上限"
              type="number"
              value={String(concurrency)}
              onChange={(e) => setConcurrency(Number(e.target.value) || 1)}
            />
            <Input
              label="优先级"
              type="number"
              value={String(priority)}
              onChange={(e) => setPriority(Number(e.target.value) || 0)}
            />
            <Input
              label="费率系数"
              type="number"
              value={rateMultiplier}
              onChange={(e) => setRateMultiplier(e.target.value)}
              placeholder="1.0"
            />
          </div>

          {/* 凭证字段 —— 按类型动态渲染 */}
          <fieldset className="border border-gray-200 dark:border-dark-600 rounded-lg p-4">
            <legend className="text-sm font-medium text-gray-700 dark:text-dark-300 px-1">
              凭证 <span className="text-gray-400 font-normal">— {typeOptions.find((o) => o.value === type)?.label}</span>
            </legend>
            <div className="space-y-3 mt-1">
              {credFields.map((f) => (
                <div key={f.key}>
                  <label className="input-label">
                    {f.label}
                    {f.required && <span className="text-red-500 ml-0.5">*</span>}
                    {!f.required && <span className="text-gray-400 font-normal ml-1">（可选）</span>}
                  </label>
                  {f.type === 'textarea' ? (
                    <textarea
                      className="input"
                      rows={5}
                      value={credValues[f.key] ?? ''}
                      onChange={(e) => setCredValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                    />
                  ) : (
                    <Input
                      value={credValues[f.key] ?? ''}
                      onChange={(e) => setCredValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>
          </fieldset>

          {/* Extra 配置 */}
          <fieldset className="border border-gray-200 dark:border-dark-600 rounded-lg p-4">
            <legend className="text-sm font-medium text-gray-700 dark:text-dark-300 px-1">
              额外配置 <span className="text-gray-400 font-normal">— 可选</span>
            </legend>
            <div className="mt-1 space-y-3">
              <Input
                label="Base URL"
                value={extraBaseUrl}
                onChange={(e) => setExtraBaseUrl(e.target.value)}
                placeholder="https://custom-api.example.com（留空则使用默认地址）"
              />
              <p className="text-xs text-gray-400">覆盖默认的 API 上游地址。例如 Anthropic 的 https://api.anthropic.com，留空则走官方默认。</p>
            </div>
          </fieldset>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="删除账号"
        message={`确定要删除账号 "${deleteTarget?.name}" 吗？`}
        confirmText="删除"
        variant="danger"
      />
    </div>
  );
}
