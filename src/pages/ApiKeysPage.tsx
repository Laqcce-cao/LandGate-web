import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { authApi, type ApiKey, type UpdateApiKeyRequest } from '../api/auth';
import { groupsApi, type Group } from '../api/admin/groups';
import { usageApi } from '../api/admin/usage';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Icon } from '../components/ui/Icon';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useToastStore } from '../stores/toastStore';
import {
  buildCcSwitchImportDeeplink,
  OPENAI_CC_SWITCH_CODEX_MODEL,
  type CcSwitchApp,
} from '../utils/ccswitchImport';

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

function dateToStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface KeyUsage {
  todayCost: number;
  monthCost: number;
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

function UseKeyModal({ open, onClose, apiKey }: { open: boolean; onClose: () => void; apiKey: ApiKey | null }) {
  const [copied, setCopied] = useState<string | null>(null);
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

  const usageScript = `({
    request: {
      url: "{{baseUrl}}/v1/usage",
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
      model: app === 'codex' ? OPENAI_CC_SWITCH_CODEX_MODEL : undefined,
      usageScript,
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

        {/* API Endpoints */}
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

        {/* API Key */}
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

        {/* Codex */}
        <div>
          <label className="input-label">Codex 配置</label>
          <p className="mb-2 text-xs text-gray-500 dark:text-dark-400">
            在终端中运行以下命令，或添加到 shell 配置文件（~/.zshrc 或 ~/.bashrc）中：
          </p>
          {codeBlock(
            `export OPENAI_BASE_URL="${codexBaseUrl}"\nexport OPENAI_API_KEY="${apiKey.key}"`,
            'codex'
          )}
        </div>

        {/* OpenAI SDK */}
        <div>
          <label className="input-label">OpenAI SDK (Python)</label>
          {codeBlock(
            `from openai import OpenAI\n\nclient = OpenAI(\n    base_url="${codexBaseUrl}",\n    api_key="${apiKey.key}"\n)\n\nprompt = "Hello"\n\nresponse = client.chat.completions.create(\n    model="gpt-5.5",\n    messages=[\n        {"role": "user", "content": prompt}\n    ],\n    temperature=0,\n    stream=False,\n)\n\nprint(response.choices[0].message.content)`,
            'openai-python'
          )}
        </div>

        {/* Claude Code */}
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

        {/* curl */}
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

/* ── Group Detail Panel ── */

function GroupDetailPanel({ group }: { group: Group }) {
  const rateMultiplier = group.rateMultiplier != null ? Number(group.rateMultiplier) : 1;
  const imageRateMultiplier = group.imageRateMultiplier != null ? Number(group.imageRateMultiplier) : 1;

  const [supportedModels, setSupportedModels] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSupportedModels(null);
    groupsApi.getSupportedModels(group.id)
      .then(({ data }) => {
        if (cancelled) return;
        try {
          const parsed = JSON.parse(data.supportedModels);
          setSupportedModels(Array.isArray(parsed) ? parsed : []);
        } catch { setSupportedModels([]); }
      })
      .catch(() => { if (!cancelled) setSupportedModels([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [group.id]);

  const isWildcard = supportedModels?.includes('*');

  return (
    <div className="mt-2 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-4 dark:border-violet-800/50 dark:from-violet-900/10 dark:to-indigo-900/10">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500">
          <Icon name="check" size="xs" className="text-white" />
        </div>
        <span className="text-sm font-semibold text-violet-800 dark:text-violet-300">已选择：{group.name}</span>
        {group.isExclusive && (
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">独占</span>
        )}
      </div>

      {group.description && (
        <p className="mb-3 text-xs text-gray-600 dark:text-dark-400">{group.description}</p>
      )}

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-lg bg-white/70 px-3 py-2 dark:bg-dark-800/50">
          <p className="text-[10px] text-gray-400 dark:text-dark-500">倍率</p>
          <p className="text-sm font-semibold text-gray-800 dark:text-dark-200">{rateMultiplier.toFixed(2)}x</p>
        </div>
        {group.rpmLimit != null && group.rpmLimit > 0 && (
          <div className="rounded-lg bg-white/70 px-3 py-2 dark:bg-dark-800/50">
            <p className="text-[10px] text-gray-400 dark:text-dark-500">RPM 限制</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-dark-200">{group.rpmLimit}</p>
          </div>
        )}
        {group.dailyLimitUsd != null && Number(group.dailyLimitUsd) > 0 && (
          <div className="rounded-lg bg-white/70 px-3 py-2 dark:bg-dark-800/50">
            <p className="text-[10px] text-gray-400 dark:text-dark-500">日限额</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-dark-200">${Number(group.dailyLimitUsd).toFixed(0)}</p>
          </div>
        )}
        {group.allowImageGeneration && (
          <div className="rounded-lg bg-white/70 px-3 py-2 dark:bg-dark-800/50">
            <p className="text-[10px] text-gray-400 dark:text-dark-500">图片倍率</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-dark-200">{imageRateMultiplier.toFixed(2)}x</p>
          </div>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-dark-500">支持的模型</p>
        {loading ? (
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
            <span className="text-[10px] text-gray-400">加载中...</span>
          </div>
        ) : isWildcard ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            所有模型（无限制）
          </span>
        ) : supportedModels && supportedModels.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {supportedModels.map((m) => (
              <span key={m} className="rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-dark-800/60 dark:text-dark-300">{m}</span>
            ))}
          </div>
        ) : (
          <span className="text-[10px] text-gray-400 dark:text-dark-500">暂无可用模型</span>
        )}
      </div>
    </div>
  );
}

/* ── Group Selector ── */

interface GroupSelectorProps {
  groups: Group[];
  value: string;
  onChange: (val: string) => void;
  groupModels?: Map<number, string[]>;
}

function GroupSelector({ groups, value, onChange, groupModels }: GroupSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const ddRef = useRef<HTMLDivElement>(null);
  const selected = groups.find((g) => String(g.id) === value);

  useEffect(() => {
    if (open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4 + window.scrollY, left: r.left + window.scrollX, width: Math.max(r.width, 380) });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node) || ddRef.current?.contains(e.target as Node)) return;
      setOpen(false); setSearch('');
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const filtered = search
    ? groups.filter((g) => g.name?.toLowerCase().includes(search.toLowerCase()) || g.description?.toLowerCase().includes(search.toLowerCase()))
    : groups;

  return (
    <div>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          className="input flex items-center justify-between text-left"
          onClick={() => setOpen(!open)}
        >
          {selected ? (
            <span className="truncate text-gray-900 dark:text-white">{selected.name}</span>
          ) : (
            <span className="text-gray-400 dark:text-dark-400">不指定（默认分组）</span>
          )}
          <svg className="h-4 w-4 shrink-0 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {open && createPortal(
          <div className="fixed inset-0 z-50" onClick={() => { setOpen(false); setSearch(''); }}>
            <div
              ref={ddRef}
              className="absolute max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl dark:border-dark-600 dark:bg-dark-800"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-3 py-2 dark:border-dark-700 dark:bg-dark-800">
                <input
                  className="input py-1.5 text-xs"
                  placeholder="搜索分组..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <button
                type="button"
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-dark-700 ${value === '' ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
                onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-dark-700">
                  <Icon name="users" size="xs" className="text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-700 dark:text-dark-200">默认分组</p>
                  <p className="text-xs text-gray-400 dark:text-dark-500">不指定特定分组</p>
                </div>
              </button>

              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-dark-500">
                  {search ? '未找到匹配的分组' : '暂无可用分组'}
                </div>
              ) : filtered.map((g) => {
                const isSelected = value === String(g.id);
                const models = groupModels?.get(g.id);
                const isWildcard = models?.includes('*');
                const modelCount = models?.filter((m) => m !== '*').length ?? 0;
                return (
                  <button
                    key={g.id}
                    type="button"
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-dark-700 ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
                    onClick={() => { onChange(String(g.id)); setOpen(false); setSearch(''); }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                      <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
                        {g.name?.slice(0, 2).toUpperCase() || 'G'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{g.name}</p>
                        {g.isExclusive && (
                          <span className="inline-block rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">独占</span>
                        )}
                      </div>
                      {g.description && (
                        <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-dark-400">{g.description}</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {g.rateMultiplier != null && Number(g.rateMultiplier) !== 1 && (
                          <span className="inline-block rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-dark-700 dark:text-dark-300">
                            {Number(g.rateMultiplier).toFixed(2)}x
                          </span>
                        )}
                        {g.rpmLimit != null && g.rpmLimit > 0 && (
                          <span className="inline-block rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-dark-700 dark:text-dark-300">
                            {g.rpmLimit} RPM
                          </span>
                        )}
                        {isWildcard ? (
                          <span className="inline-block rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">所有模型</span>
                        ) : modelCount > 0 ? (
                          <span className="inline-block rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">{modelCount} 个模型</span>
                        ) : null}
                      </div>
                    </div>
                    {isSelected && <Icon name="check" size="sm" className="mt-1 shrink-0 text-primary-500" />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
      </div>
      {selected && <GroupDetailPanel group={selected} />}
    </div>
  );
}

/* ── Main Page ── */

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
  const [groupModels, setGroupModels] = useState<Map<number, string[]>>(new Map());
  const [keyUsage, setKeyUsage] = useState<Map<number, KeyUsage>>(new Map());
  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null);
  const [useKeyTarget, setUseKeyTarget] = useState<ApiKey | null>(null);
  const addToast = useToastStore((s) => s.addToast);

  const groupMap = new Map(groups.map((g) => [g.id, g]));

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

  const fetchGroups = useCallback(async () => {
    try {
      const { data } = await groupsApi.list();
      const groupsList = data.groups ?? [];
      setGroups(groupsList);
      const modelsMap = new Map<number, string[]>();
      await Promise.allSettled(
        groupsList.map(async (g) => {
          try {
            const res = await groupsApi.getSupportedModels(g.id);
            const parsed = JSON.parse(res.data.supportedModels);
            if (Array.isArray(parsed)) modelsMap.set(g.id, parsed);
          } catch { /* ignore */ }
        })
      );
      setGroupModels(modelsMap);
    } catch { /* ignore */ }
  }, []);

  const fetchUsage = useCallback(async () => {
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      const allLogs: { apiKeyId?: number; totalCost?: number; createdAt?: string }[] = [];
      let p = 0;
      while (true) {
        const res = await usageApi.myUsage(p, 500, dateToStr(start), dateToStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)));
        const batch = res.data.logs ?? [];
        allLogs.push(...batch);
        if (batch.length < 500 || allLogs.length >= (res.data.total ?? 0)) break;
        p++;
      }
      const todayStr = dateToStr(now);
      const usageMap = new Map<number, KeyUsage>();
      for (const log of allLogs) {
        const kid = log.apiKeyId;
        if (!kid) continue;
        const existing = usageMap.get(kid) ?? { todayCost: 0, monthCost: 0 };
        existing.monthCost += log.totalCost ?? 0;
        if (log.createdAt && String(log.createdAt).startsWith(todayStr)) existing.todayCost += log.totalCost ?? 0;
        usageMap.set(kid, existing);
      }
      setKeyUsage(usageMap);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchKeys();
    fetchGroups();
    fetchUsage();
  }, [fetchKeys, fetchGroups, fetchUsage]);

  /* ── Actions ── */

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
      setName(''); setGroupId(''); setQuota('');
    } catch { addToast({ type: 'error', message: '创建失败' }); }
    finally { setCreating(false); }
  };

  const openEdit = (key: ApiKey) => {
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
      setEditOpen(false); setEditTarget(null);
    } catch { addToast({ type: 'error', message: '更新失败' }); }
    finally { setSaving(false); }
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
    } catch { addToast({ type: 'error', message: '复制失败' }); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await authApi.deleteApiKey(deleteTarget.id);
      setKeys((prev) => prev.filter((k) => k.id !== deleteTarget.id));
      addToast({ type: 'success', message: 'API Key 已删除' });
      setDeleteTarget(null);
    } catch { addToast({ type: 'error', message: '删除失败' }); }
    finally { setDeleting(false); }
  };

  /* ── Row renderer ── */

  const renderKeyRow = (key: ApiKey) => {
    const group = key.groupId ? groupMap.get(key.groupId) : undefined;
    const usage = keyUsage.get(key.id);
    const rateMultiplier = group?.rateMultiplier != null ? Number(group.rateMultiplier) : 1;
    const rpmLimit = group?.rpmLimit;
    const sc = statusConfig[key.status] ?? statusConfig.ACTIVE;
    const isCopied = copiedKeyId === key.id;
    const isExpired = key.expiresAt && new Date(String(key.expiresAt)) < new Date();

    return (
      <tr
        key={key.id}
        className="border-b border-gray-100 transition-colors hover:bg-gray-50/80 dark:border-dark-700/50 dark:hover:bg-dark-800/30"
      >
        {/* 名称 */}
        <td className="whitespace-nowrap px-4 py-3">
          <span className="text-sm font-medium text-gray-900 dark:text-white">{key.name}</span>
        </td>

        {/* API 密钥 */}
        <td className="whitespace-nowrap px-3 py-3">
          <div className="flex items-center gap-2">
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-600 dark:bg-dark-700 dark:text-dark-300">
              {maskKey(key.key)}
            </code>
            <button
              onClick={() => handleCopy(key.key, key.id)}
              className={`rounded-lg p-1 transition-colors ${
                isCopied
                  ? 'text-emerald-500'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-dark-700 dark:hover:text-gray-300'
              }`}
              title={isCopied ? '已复制' : '复制密钥'}
            >
              <Icon name={isCopied ? 'check' : 'copy'} size="sm" />
            </button>
          </div>
        </td>

        {/* 分组 */}
        <td className="whitespace-nowrap px-3 py-3">
          {group ? (
            <div className="flex items-center gap-1.5">
              <span className="inline-block rounded-md bg-violet-50 px-1.5 py-0.5 text-xs font-medium text-violet-600 dark:bg-violet-900/20 dark:text-violet-400">
                {group.name}
              </span>
              {rateMultiplier !== 1 && (
                <span className="text-[10px] text-gray-400 dark:text-dark-500">{rateMultiplier.toFixed(1)}x</span>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-400 dark:text-dark-500">无分组</span>
          )}
        </td>

        {/* 用量 */}
        <td className="px-3 py-3">
          <div className="text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 dark:text-gray-400">今日:</span>
              <span className="font-medium text-gray-900 dark:text-white tabular-nums">
                ${(usage?.todayCost ?? 0).toFixed(4)}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="text-gray-500 dark:text-gray-400">总计:</span>
              <span className="font-medium text-gray-900 dark:text-white tabular-nums">
                ${(usage?.monthCost ?? 0).toFixed(4)}
              </span>
            </div>
            {key.quota > 0 && (
              <div className="mt-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 dark:text-gray-400">配额:</span>
                  <span className={`font-medium tabular-nums ${
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
            )}
          </div>
        </td>

        {/* 速率限制 */}
        <td className="whitespace-nowrap px-3 py-3">
          {rpmLimit && rpmLimit > 0 ? (
            <span className="text-sm text-gray-700 dark:text-dark-200">{rpmLimit} RPM</span>
          ) : (
            <span className="text-sm text-gray-400 dark:text-dark-500">-</span>
          )}
        </td>

        {/* 过期时间 */}
        <td className="whitespace-nowrap px-3 py-3">
          <span className={`text-sm ${isExpired ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-dark-400'}`}>
            {formatExpiry(key.expiresAt)}
          </span>
        </td>

        {/* 状态 */}
        <td className="whitespace-nowrap px-3 py-3">
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${sc.cls}`}>
            {sc.label}
          </span>
        </td>

        {/* 上次使用 */}
        <td className="whitespace-nowrap px-3 py-3">
          <span className="text-sm text-gray-500 dark:text-dark-400">{formatRelativeTime(key.lastUsedAt)}</span>
        </td>

        {/* 创建时间 */}
        <td className="whitespace-nowrap px-3 py-3">
          <span className="text-sm text-gray-500 dark:text-dark-400">{formatTime(key.createdAt)}</span>
        </td>

        {/* 操作 */}
        <td className="whitespace-nowrap px-3 py-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setUseKeyTarget(key)}
              className="flex flex-col items-center gap-0.5 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 dark:hover:text-green-400"
              title="使用密钥"
            >
              <Icon name="externalLink" size="sm" />
              <span className="text-xs">使用</span>
            </button>
            <button
              onClick={() => handleCopy(key.key, key.id)}
              className="flex flex-col items-center gap-0.5 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
              title="复制密钥"
            >
              <Icon name="copy" size="sm" />
              <span className="text-xs">复制</span>
            </button>
            <button
              onClick={() => openEdit(key)}
              className="flex flex-col items-center gap-0.5 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-dark-700 dark:hover:text-primary-400"
              title="编辑"
            >
              <Icon name="edit" size="sm" />
              <span className="text-xs">编辑</span>
            </button>
            <button
              onClick={() => setDeleteTarget(key)}
              className="flex flex-col items-center gap-0.5 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              title="删除"
            >
              <Icon name="trash" size="sm" />
              <span className="text-xs">删除</span>
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
          onClick={() => { fetchKeys(); fetchUsage(); }}
          disabled={loading}
          className="btn btn-secondary"
          title="刷新"
        >
          <Icon name="refresh" size="md" className={loading ? 'animate-spin' : ''} />
        </button>
        <Button onClick={() => setCreateOpen(true)}>
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
            <p className="mt-1 text-xs text-gray-400 dark:text-dark-500">
              创建一个 API Key 以开始调用 LandGate API
            </p>
          </div>
          <Button variant="secondary" onClick={() => setCreateOpen(true)}>
            <Icon name="plus" size="sm" />
            创建第一个 Key
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100/80 bg-white dark:border-dark-700/50 dark:bg-dark-800">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="border-b border-gray-100/60 bg-gray-50/50 text-xs font-medium uppercase tracking-wide text-gray-400 dark:border-dark-700/40 dark:bg-dark-800/30 dark:text-dark-500">
                <th className="px-4 py-2.5 text-left">名称</th>
                <th className="px-3 py-2.5 text-left">API 密钥</th>
                <th className="px-3 py-2.5 text-left">分组</th>
                <th className="px-3 py-2.5 text-left">用量</th>
                <th className="px-3 py-2.5 text-left">速率限制</th>
                <th className="px-3 py-2.5 text-left">过期时间</th>
                <th className="px-3 py-2.5 text-left">状态</th>
                <th className="px-3 py-2.5 text-left">上次使用</th>
                <th className="px-3 py-2.5 text-left">创建时间</th>
                <th className="px-3 py-2.5 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(renderKeyRow)}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Use Key modal */}
      <UseKeyModal
        open={!!useKeyTarget}
        onClose={() => setUseKeyTarget(null)}
        apiKey={useKeyTarget}
      />

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setNewKey(null); }}
        title="创建 API Key"
        width="normal"
        footer={
          newKey ? (
            <Button variant="secondary" onClick={() => { setCreateOpen(false); setNewKey(null); }}>关闭</Button>
          ) : (
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setCreateOpen(false); setNewKey(null); }}>取消</Button>
              <Button onClick={handleCreate} loading={creating} disabled={!name.trim()}>创建</Button>
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
            <p className="mb-3 text-xs text-emerald-600 dark:text-emerald-500">
              请立即保存此 Key，关闭后将无法再次查看完整 Key。
            </p>
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
          <div className="space-y-5">
            <Input
              label="名称"
              placeholder="为 API Key 起一个名字"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div>
              <label className="input-label">分组</label>
              <p className="mb-2 text-xs text-gray-400 dark:text-dark-500">选择分组以使用特定的模型和倍率配置</p>
              <GroupSelector groups={groups} value={groupId} onChange={setGroupId} groupModels={groupModels} />
            </div>
            <Input
              label="配额 (USD)"
              type="number"
              placeholder="0 = 不限制"
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
              hint="设置该 Key 的总花费上限"
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
        <div className="space-y-5">
          <Input label="名称" placeholder="输入 API Key 名称" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <div>
            <label className="input-label">分组</label>
            <p className="mb-2 text-xs text-gray-400 dark:text-dark-500">选择分组以使用特定的模型和倍率配置</p>
            <GroupSelector groups={groups} value={editGroupId} onChange={setEditGroupId} groupModels={groupModels} />
          </div>
          <Input label="配额 (USD)" type="number" placeholder="0 = 不限制" value={editQuota} onChange={(e) => setEditQuota(e.target.value)} />
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
