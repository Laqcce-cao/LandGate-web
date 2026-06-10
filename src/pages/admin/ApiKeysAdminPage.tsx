import { useEffect, useState, useCallback } from 'react';
import { adminApiKeysApi, type AdminApiKey, type CreateApiKeyAdminRequest, type UpdateApiKeyAdminRequest } from '../../api/admin/api-keys';
import { groupsApi, type Group } from '../../api/admin/groups';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Icon } from '../../components/ui/Icon';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Toggle } from '../../components/ui/Toggle';
import { useToastStore } from '../../stores/toastStore';
import {
  buildCcSwitchImportDeeplink,
  CLAUDE_CC_SWITCH_MODEL,
  OPENAI_CC_SWITCH_CODEX_MODEL,
  type CcSwitchApp,
} from '../../utils/ccswitchImport';

/* ── Helpers ── */

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 12) return `${key.slice(0, 4)}***`;
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

function formatTime(val: unknown): string {
  if (!val) return '—';
  const d = new Date(String(val));
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatRelativeTime(val: unknown): string {
  if (!val) return '—';
  const d = new Date(String(val));
  if (isNaN(d.getTime())) return '—';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHr < 24) return `${diffHr}小时前`;
  if (diffDay < 30) return `${diffDay}天前`;
  return formatTime(val);
}

function formatExpiry(val: unknown): string {
  if (!val) return '永久有效';
  const d = new Date(String(val));
  if (isNaN(d.getTime())) return '永久有效';
  if (d < new Date()) return '已过期';
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: '活跃', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  DISABLED: { label: '已禁用', cls: 'bg-gray-100 text-gray-600 dark:bg-dark-700 dark:text-dark-400' },
  EXPIRED: { label: '已过期', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  ERROR: { label: '异常', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
};

const CODEX_API_BASE_URL = 'https://laqcce-cao.com/v1';
const CLAUDE_CODE_API_BASE_URL = 'https://laqcce-cao.com';

/* ── Use Key Modal ── */

function UseKeyModal({ open, onClose, apiKey }: { open: boolean; onClose: () => void; apiKey: AdminApiKey | null }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [codexModel, setCodexModel] = useState(OPENAI_CC_SWITCH_CODEX_MODEL);
  const [claudeModel, setClaudeModel] = useState(CLAUDE_CC_SWITCH_MODEL);
  const addToast = useToastStore((s) => s.addToast);

  if (!apiKey) return null;

  const codexBaseUrl = CODEX_API_BASE_URL;
  const claudeCodeBaseUrl = CLAUDE_CODE_API_BASE_URL;

  const handleCopy = async (text: string, label: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch { addToast({ type: 'error', message: '复制失败' }); }
  };

  const codeBlock = (code: string, label: string) => (
    <div className="group/code relative">
      <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs leading-relaxed text-gray-200 dark:bg-dark-950">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => handleCopy(code, label)}
        className="absolute right-2 top-2 rounded-md bg-gray-700 p-1.5 text-gray-400 opacity-0 transition-all hover:bg-gray-600 hover:text-white group-hover/code:opacity-100"
      >
        <Icon name={copied === label ? 'check' : 'copy'} size="xs" />
      </button>
    </div>
  );

  const buildUsageScript = (usagePath: string) => `({
    request: {
      url: "{{baseUrl}}${usagePath}",
      method: "GET",
      headers: { "Authorization": "Bearer {{apiKey}}" }
    },
    extractor: function(response) {
      const remaining = response?.remaining ?? response?.quota?.remaining ?? response?.balance;
      const unit = response?.unit ?? response?.quota?.unit ?? "USD";
      return {
        isValid: response?.is_active ?? response?.isValid ?? true,
        remaining,
        unit
      };
    }
  })`;

  const handleCcSwitchImport = (app: CcSwitchApp) => {
    const endpoint = app === 'codex' ? codexBaseUrl : claudeCodeBaseUrl;
    const deeplink = buildCcSwitchImportDeeplink({
      app,
      endpoint,
      homepage: claudeCodeBaseUrl,
      providerName: 'LandGate',
      apiKey: apiKey.key,
      model: app === 'codex'
        ? (codexModel.trim() || OPENAI_CC_SWITCH_CODEX_MODEL)
        : (claudeModel.trim() || CLAUDE_CC_SWITCH_MODEL),
      usageScript: buildUsageScript('/v1/usage'),
    });

    try {
      window.open(deeplink, '_self');
      window.setTimeout(() => {
        if (document.hasFocus()) {
          addToast({ type: 'error', message: '未检测到 cc switch，请先安装后重试' });
        }
      }, 100);
    } catch {
      addToast({ type: 'error', message: '未检测到 cc switch，请先安装后重试' });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="使用 API Key" width="wide">
      <div className="space-y-5">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-900/10">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white">
              <Icon name="download" size="sm" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">一键导入 cc switch</p>
              <p className="mt-0.5 text-xs text-blue-700 dark:text-blue-300">
                自动写入 Provider、Endpoint 和 API Key，无需手动复制环境变量。
              </p>
            </div>
          </div>
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <Input
              label="Claude 默认模型"
              value={claudeModel}
              onChange={(e) => setClaudeModel(e.target.value)}
              placeholder={CLAUDE_CC_SWITCH_MODEL}
            />
            <Input
              label="Codex 默认模型"
              value={codexModel}
              onChange={(e) => setCodexModel(e.target.value)}
              placeholder={OPENAI_CC_SWITCH_CODEX_MODEL}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => handleCcSwitchImport('claude')}>
              <Icon name="externalLink" size="sm" />
              导入 Claude Code
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleCcSwitchImport('codex')}>
              <Icon name="externalLink" size="sm" />
              导入 Codex
            </Button>
          </div>
        </div>

        <div>
          <label className="input-label">Codex / OpenAI SDK API 端点</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-mono text-gray-800 dark:bg-dark-700 dark:text-dark-200">
              {codexBaseUrl}
            </code>
            <button
              onClick={() => handleCopy(codexBaseUrl, 'codex-endpoint')}
              className={`rounded-lg p-2 transition-colors ${
                copied === 'codex-endpoint' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-dark-700 dark:text-dark-400 dark:hover:bg-dark-600'
              }`}
            >
              <Icon name={copied === 'codex-endpoint' ? 'check' : 'copy'} size="sm" />
            </button>
          </div>
        </div>

        <div>
          <label className="input-label">Claude Code API 端点</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-mono text-gray-800 dark:bg-dark-700 dark:text-dark-200">
              {claudeCodeBaseUrl}
            </code>
            <button
              onClick={() => handleCopy(claudeCodeBaseUrl, 'claude-endpoint')}
              className={`rounded-lg p-2 transition-colors ${
                copied === 'claude-endpoint' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-dark-700 dark:text-dark-400 dark:hover:bg-dark-600'
              }`}
            >
              <Icon name={copied === 'claude-endpoint' ? 'check' : 'copy'} size="sm" />
            </button>
          </div>
        </div>

        <div>
          <label className="input-label">API 密钥</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-mono text-gray-800 dark:bg-dark-700 dark:text-dark-200">
              {apiKey.key}
            </code>
            <button
              onClick={() => handleCopy(apiKey.key, 'key')}
              className={`rounded-lg p-2 transition-colors ${
                copied === 'key' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-dark-700 dark:text-dark-400 dark:hover:bg-dark-600'
              }`}
            >
              <Icon name={copied === 'key' ? 'check' : 'copy'} size="sm" />
            </button>
          </div>
        </div>

        <div>
          <label className="input-label">Codex 配置</label>
          <p className="mb-2 text-xs text-gray-500 dark:text-dark-400">
            在终端中运行以下命令，或添加到 shell 配置文件中：
          </p>
          {codeBlock(
            `export OPENAI_BASE_URL="${codexBaseUrl}"\nexport OPENAI_API_KEY="${apiKey.key}"`,
            'codex'
          )}
        </div>

        <div>
          <label className="input-label">OpenAI SDK (Python)</label>
          {codeBlock(
            `from openai import OpenAI\n\nclient = OpenAI(\n    base_url="${codexBaseUrl}",\n    api_key="${apiKey.key}"\n)\n\nprompt = "Hello"\n\nresponse = client.chat.completions.create(\n    model="gpt-5.5",\n    messages=[\n        {"role": "user", "content": prompt}\n    ],\n    temperature=0,\n    stream=False,\n)\n\nprint(response.choices[0].message.content)`,
            'openai-python'
          )}
        </div>

        <div>
          <label className="input-label">Claude Code 配置</label>
          <p className="mb-2 text-xs text-gray-500 dark:text-dark-400">
            Claude Code 使用不带 /v1 的 API 端点：
          </p>
          {codeBlock(
            `export ANTHROPIC_BASE_URL="${claudeCodeBaseUrl}"\nexport ANTHROPIC_AUTH_TOKEN="${apiKey.key}"`,
            'claude-code'
          )}
        </div>

        <div>
          <label className="input-label">cURL 示例</label>
          {codeBlock(
            `curl ${codexBaseUrl}/chat/completions \\\n  -H "Authorization: Bearer ${apiKey.key}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model":"gpt-5.5","messages":[{"role":"user","content":"Hello"}]}'`,
            'curl'
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ── Form ── */

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
  name: '', groupId: '', quota: '',
  rateLimit5h: '', rateLimit1d: '', rateLimit7d: '',
  ipWhitelist: '', ipBlacklist: '', expiresAt: '',
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

/* ── Main Page ── */

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
  const [editTarget, setEditTarget] = useState<AdminApiKey | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null);
  const [useKeyTarget, setUseKeyTarget] = useState<AdminApiKey | null>(null);
  const addToast = useToastStore((s) => s.addToast);

  const groupMap = new Map(groups.map((g) => [g.id, g]));

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

  const fetchGroups = useCallback(async () => {
    try {
      const { data } = await groupsApi.list();
      setGroups(data.groups ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchKeys();
    fetchGroups();
  }, [fetchKeys, fetchGroups]);

  /* ── Actions ── */

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

  const openEdit = async (key: AdminApiKey) => {
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

  const handleEditSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const { data } = await adminApiKeysApi.update(editTarget.id, buildUpdatePayload(form));
      setKeys((prev) => prev.map((k) => (k.id === data.id ? data : k)));
      addToast({ type: 'success', message: 'API Key 更新成功' });
      setEditOpen(false); setEditTarget(null);
    } catch {
      addToast({ type: 'error', message: '更新失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (text: string, keyId: number) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedKeyId(keyId);
      setTimeout(() => setCopiedKeyId(null), 2000);
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

  const renderFormFields = () => (
    <div className="space-y-4">
      <Input
        label="名称 *"
        placeholder="输入 API Key 名称"
        value={form.name}
        onChange={(e) => updateFormField('name', e.target.value)}
      />
      <div>
        <label className="input-label">分组</label>
        <Select
          options={[
            { value: '', label: '不指定（默认分组）' },
            ...groups.map((g) => ({ value: String(g.id), label: `${g.name} (ID:${g.id})` })),
          ]}
          value={form.groupId}
          onChange={(v) => updateFormField('groupId', v)}
          placeholder="选择分组..."
          searchable
          emptyText="暂无可用分组"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="配额 (USD)" type="number" placeholder="0 = 不限制" value={form.quota} onChange={(e) => updateFormField('quota', e.target.value)} />
        <Input label="过期时间" type="datetime-local" value={form.expiresAt} onChange={(e) => updateFormField('expiresAt', e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Input label="5小时限制" type="number" placeholder="0 = 不限制" value={form.rateLimit5h} onChange={(e) => updateFormField('rateLimit5h', e.target.value)} />
        <Input label="1天限制" type="number" placeholder="0 = 不限制" value={form.rateLimit1d} onChange={(e) => updateFormField('rateLimit1d', e.target.value)} />
        <Input label="7天限制" type="number" placeholder="0 = 不限制" value={form.rateLimit7d} onChange={(e) => updateFormField('rateLimit7d', e.target.value)} />
      </div>
      <Input label="IP 白名单" placeholder='JSON 数组, 如: ["1.2.3.4"]' value={form.ipWhitelist} onChange={(e) => updateFormField('ipWhitelist', e.target.value)} />
      <Input label="IP 黑名单" placeholder='JSON 数组, 如: ["5.6.7.8"]' value={form.ipBlacklist} onChange={(e) => updateFormField('ipBlacklist', e.target.value)} />
      <div>
        <label className="input-label">状态</label>
        <div className="mt-1 flex items-center gap-3">
          <Toggle checked={form.status === 'ACTIVE'} onChange={(on) => updateFormField('status', on ? 'ACTIVE' : 'DISABLED')} label={form.status === 'ACTIVE' ? '启用' : '禁用'} />
        </div>
      </div>
    </div>
  );

  /* ── Row renderer ── */

  const renderKeyRow = (key: AdminApiKey) => {
    const group = key.groupId ? groupMap.get(key.groupId) : undefined;
    const sc = statusConfig[key.status] ?? statusConfig.ACTIVE;
    const isCopied = copiedKeyId === key.id;
    const isExpired = key.expiresAt && new Date(key.expiresAt) < new Date();

    return (
      <tr
        key={key.id}
        className="border-b border-gray-100 transition-colors hover:bg-gray-50/80 dark:border-dark-700/50 dark:hover:bg-dark-800/30"
      >
        <td className="whitespace-nowrap px-2 py-3">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-gray-900 dark:text-white">{key.name}</span>
            {(key.ipWhitelist || key.ipBlacklist) && (
              <Icon name="lock" size="xs" className="text-blue-500" />
            )}
          </div>
        </td>

        <td className="whitespace-nowrap px-2 py-3">
          <div className="flex items-center gap-2">
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-600 dark:bg-dark-700 dark:text-dark-300">
              {maskKey(key.key)}
            </code>
            <button
              onClick={() => handleCopy(key.key, key.id)}
              className={`rounded-lg p-1 transition-colors ${
                isCopied ? 'text-emerald-500' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-dark-700 dark:hover:text-gray-300'
              }`}
              title={isCopied ? '已复制' : '复制密钥'}
            >
              <Icon name={isCopied ? 'check' : 'copy'} size="sm" />
            </button>
          </div>
        </td>

        <td className="whitespace-nowrap px-2 py-3">
          {group ? (
            <span className="inline-block rounded-md bg-violet-50 px-1.5 py-0.5 text-xs font-medium text-violet-600 dark:bg-violet-900/20 dark:text-violet-400">
              {group.name}
            </span>
          ) : (
            <span className="text-sm text-gray-400 dark:text-dark-500">无分组</span>
          )}
        </td>

        <td className="whitespace-nowrap px-2 py-3">
          {key.quota > 0 ? (
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`font-medium tabular-nums text-sm ${
                  key.quotaUsed >= key.quota ? 'text-red-500' :
                  key.quotaUsed >= key.quota * 0.8 ? 'text-yellow-500' :
                  'text-gray-900 dark:text-white'
                }`}>
                  ${key.quotaUsed?.toFixed(2) || '0.00'} / ${key.quota?.toFixed(2)}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-dark-600">
                <div
                  className={`h-full rounded-full transition-all ${
                    key.quotaUsed >= key.quota ? 'bg-red-500' :
                    key.quotaUsed >= key.quota * 0.8 ? 'bg-yellow-500' :
                    'bg-primary-500'
                  }`}
                  style={{ width: `${Math.min((key.quotaUsed / key.quota) * 100, 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <span className="text-sm text-gray-400 dark:text-dark-500">—</span>
          )}
        </td>

        <td className="whitespace-nowrap px-2 py-3">
          {key.rateLimit5h > 0 || key.rateLimit1d > 0 || key.rateLimit7d > 0 ? (
            <div className="space-y-0.5 text-xs">
              {key.rateLimit5h > 0 && <div className="text-gray-600 dark:text-dark-300">5h: ${key.usage5h?.toFixed(2) || '0.00'}/${key.rateLimit5h}</div>}
              {key.rateLimit1d > 0 && <div className="text-gray-600 dark:text-dark-300">1d: ${key.usage1d?.toFixed(2) || '0.00'}/${key.rateLimit1d}</div>}
              {key.rateLimit7d > 0 && <div className="text-gray-600 dark:text-dark-300">7d: ${key.usage7d?.toFixed(2) || '0.00'}/${key.rateLimit7d}</div>}
            </div>
          ) : (
            <span className="text-sm text-gray-400 dark:text-dark-500">—</span>
          )}
        </td>

        <td className="whitespace-nowrap px-2 py-3">
          <span className={`text-sm ${isExpired ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-dark-400'}`}>
            {formatExpiry(key.expiresAt)}
          </span>
        </td>

        <td className="whitespace-nowrap px-2 py-3">
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${sc.cls}`}>
            {sc.label}
          </span>
        </td>

        <td className="whitespace-nowrap px-2 py-3">
          <span className="text-sm text-gray-500 dark:text-dark-400">{formatRelativeTime(key.lastUsedAt)}</span>
        </td>

        <td className="whitespace-nowrap px-2 py-3">
          <span className="text-sm text-gray-500 dark:text-dark-400">{formatTime(key.createdAt)}</span>
        </td>

        <td className="whitespace-nowrap px-2 py-3">
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setUseKeyTarget(key)}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 dark:hover:text-green-400"
              title="使用密钥"
            >
              <Icon name="externalLink" size="sm" />
            </button>
            <button
              onClick={() => handleCopy(key.key, key.id)}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
              title="复制密钥"
            >
              <Icon name="copy" size="sm" />
            </button>
            <button
              onClick={() => openEdit(key)}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-dark-700 dark:hover:text-primary-400"
              title="编辑"
            >
              <Icon name="edit" size="sm" />
            </button>
            <button
              onClick={() => setDeleteTarget(key)}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              title="删除"
            >
              <Icon name="trash" size="sm" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center justify-end gap-3">
        <button
          onClick={() => { fetchKeys(); fetchGroups(); }}
          disabled={loading}
          className="btn btn-secondary"
          title="刷新"
        >
          <Icon name="refresh" size="md" className={loading ? 'animate-spin' : ''} />
        </button>
        <Button onClick={() => { setForm({ ...defaultForm }); setNewKey(null); setCreateOpen(true); }}>
          <Icon name="plus" size="sm" />
          创建 API Key
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : keys.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-gray-100/80 bg-white py-20 dark:border-dark-700/50 dark:bg-dark-800">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/20 dark:to-indigo-900/20">
            <Icon name="key" size="xl" className="text-violet-400 dark:text-violet-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 dark:text-dark-300">暂无 API Key</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-dark-500">创建一个 API Key 以开始调用 LandGate API</p>
          </div>
          <Button variant="secondary" onClick={() => { setForm({ ...defaultForm }); setNewKey(null); setCreateOpen(true); }}>
            <Icon name="plus" size="sm" />
            创建第一个 Key
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100/80 bg-white dark:border-dark-700/50 dark:bg-dark-800">
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100/60 bg-gray-50/50 text-xs font-medium uppercase tracking-wide text-gray-400 dark:border-dark-700/40 dark:bg-dark-800/30 dark:text-dark-500">
                  <th className="px-3 py-2.5 text-left">名称</th>
                  <th className="px-2 py-2.5 text-left">API 密钥</th>
                  <th className="px-2 py-2.5 text-left">分组</th>
                  <th className="px-2 py-2.5 text-left">用量</th>
                  <th className="px-2 py-2.5 text-left">速率限制</th>
                  <th className="px-2 py-2.5 text-left">过期时间</th>
                  <th className="px-2 py-2.5 text-left">状态</th>
                  <th className="px-2 py-2.5 text-left">上次使用</th>
                  <th className="px-2 py-2.5 text-left">创建时间</th>
                  <th className="px-2 py-2.5 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {keys.map(renderKeyRow)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <UseKeyModal
        open={!!useKeyTarget}
        onClose={() => setUseKeyTarget(null)}
        apiKey={useKeyTarget}
      />

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setNewKey(null); setForm({ ...defaultForm }); }}
        title="创建 API Key"
        width="normal"
        footer={
          newKey ? (
            <Button variant="secondary" onClick={() => { setCreateOpen(false); setNewKey(null); setForm({ ...defaultForm }); }}>关闭</Button>
          ) : (
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setCreateOpen(false); setNewKey(null); setForm({ ...defaultForm }); }}>取消</Button>
              <Button onClick={handleCreate} loading={saving} disabled={!form.name.trim()}>创建</Button>
            </div>
          )
        }
      >
        {newKey ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
                <Icon name="check" size="xs" className="text-white" />
              </div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">API Key 创建成功</p>
            </div>
            <p className="mb-3 text-xs text-emerald-600 dark:text-emerald-500">请立即保存此 Key，关闭后将无法再次查看完整 Key。</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded-lg bg-white px-3 py-2.5 text-sm font-mono text-gray-900 dark:bg-dark-900 dark:text-white">
                {newKey.key}
              </code>
              <Button size="sm" onClick={() => handleCopy(newKey.key, newKey.id)}>
                <Icon name="copy" size="sm" />
                复制
              </Button>
            </div>
          </div>
        ) : (
          renderFormFields()
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
        {renderFormFields()}
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
