import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { accountsApi, type Account } from '../api/admin/accounts';
import { groupsApi } from '../api/admin/groups';
import { modelPricesApi } from '../api/admin/model-prices';
import { oauthApi } from '../api/admin/oauth';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Drawer } from '../components/ui/Drawer';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Toggle } from '../components/ui/Toggle';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Icon } from '../components/ui/Icon';
import { useToastStore } from '../stores/toastStore';
import { parseAccountUsageStatus, type CodexUsageWindow } from './accountUsage';

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------
const parseJsonSafe = (raw: unknown): Record<string, unknown> => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return {};
};

// ---- Rate Limit 相关 ----

function AccountUsageBars({ windows }: { windows: CodexUsageWindow[] }) {
  if (windows.length === 0) {
    return <p className="truncate text-xs text-[#657871] dark:text-dark-400">无用量窗口</p>;
  }

  return (
    <div className="space-y-1.5">
      {windows.slice(0, 2).map((window) => {
        const remaining = window.usedPercent == null ? null : window.remainingPercent ?? Math.max(0, 100 - window.usedPercent);
        const width = remaining == null ? 0 : Math.min(Math.max(remaining, 0), 100);
        const barColor = remaining == null
          ? 'bg-gray-300 dark:bg-dark-600'
          : remaining <= 10
            ? 'bg-red-500'
            : remaining <= 30
              ? 'bg-amber-500'
              : 'bg-[#00A6B2]';

        return (
          <div key={`${window.label}-${window.scope}`} className="grid grid-cols-[2.3rem_1fr_2.5rem] items-center gap-2">
            <span className="truncate text-[11px] font-semibold text-[#52665F] dark:text-dark-400">{window.label}</span>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#DDE9E3] dark:bg-white/10">
              <div
                className={`h-full rounded-full transition-[width,background-color] duration-500 ${barColor}`}
                style={{ width: `${width}%` }}
              />
            </div>
            <span className="text-right text-[11px] font-mono font-semibold text-[#203830] dark:text-dark-200">
              {remaining == null ? '未知' : `${remaining}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 每种认证类型对应的凭证字段定义
// ---------------------------------------------------------------------------
interface CredField {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
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

const PLATFORM_COLORS: Record<string, string> = {
  openai: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  anthropic: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  gemini: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  antigravity: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

function FormSection({
  icon,
  tone = 'gray',
  title,
  description,
  children,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  tone?: 'gray' | 'violet' | 'emerald' | 'amber' | 'blue';
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const toneClass = {
    gray: 'bg-gray-100 text-gray-500 dark:bg-dark-800 dark:text-dark-300',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  }[tone];

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-dark-700 dark:bg-dark-900">
      <div className="mb-4 flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon name={icon} size="sm" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          {description && <p className="mt-1 text-xs text-gray-500 dark:text-dark-400">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

const PLATFORM_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'antigravity', label: 'Antigravity' },
];

const PROTOCOL_OPTIONS = [
  { value: 'chat_completions', label: 'Chat Completions' },
  { value: 'responses', label: 'Responses' },
  { value: 'messages', label: 'Messages' },
  { value: 'gemini', label: 'Gemini' },
];

const parseProtocolsArray = (raw: string | undefined): string[] => {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const normalizePlatform = (raw: string | undefined): string => {
  if (raw === 'openai_responses') return 'openai';
  return raw || 'openai';
};

const platformLabel = (raw: string | undefined): string => {
  const normalized = normalizePlatform(raw);
  return PLATFORM_OPTIONS.find((option) => option.value === normalized)?.label ?? normalized;
};

const protocolOptionsFor = (platformValue: string, typeValue: string) => {
  if (platformValue === 'openai' && typeValue === 'api_key') {
    return PROTOCOL_OPTIONS.filter((p) => p.value === 'chat_completions' || p.value === 'responses');
  }
  if (platformValue === 'openai' && typeValue === 'oauth') {
    return PROTOCOL_OPTIONS.filter((p) => p.value === 'responses');
  }
  if (platformValue === 'anthropic') {
    return PROTOCOL_OPTIONS.filter((p) => p.value === 'messages');
  }
  if (platformValue === 'gemini') {
    return PROTOCOL_OPTIONS.filter((p) => p.value === 'gemini');
  }
  return PROTOCOL_OPTIONS;
};

const defaultProtocolFor = (platformValue: string, typeValue: string): string => {
  if (platformValue === 'openai' && typeValue === 'api_key') return 'responses';
  if (platformValue === 'openai' && typeValue === 'oauth') return 'responses';
  if (platformValue === 'anthropic') return 'messages';
  if (platformValue === 'gemini') return 'gemini';
  return '';
};

const PROTOCOL_COLORS: Record<string, string> = {
  chat_completions: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  responses: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400',
  messages: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  gemini: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
};

const TYPE_OPTIONS = [
  { value: 'api_key', label: 'API Key' },
  { value: 'oauth', label: 'OAuth' },
  { value: 'setup_token', label: 'Setup Token' },
  { value: 'upstream', label: '上游代理转发' },
  { value: 'bedrock', label: 'AWS Bedrock' },
  { value: 'service_account', label: 'GCP Service Account' },
];

// ---------------------------------------------------------------------------

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [drawerAccount, setDrawerAccount] = useState<Account | null>(null);
  const [bulkModelModal, setBulkModelModal] = useState(false);
  const [bulkModel, setBulkModel] = useState('');
  const [bulkMode, setBulkMode] = useState<'append' | 'replace'>('append');
  const [bulkAccountIds, setBulkAccountIds] = useState<Set<number>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [modelInputs, setModelInputs] = useState<Record<number, string>>({});
  const [baselineModels, setBaselineModels] = useState<Record<number, string[]>>({});
  const [modelOptions, setModelOptions] = useState<{ value: string; label: string }[]>([]);
  const addToast = useToastStore((s) => s.addToast);

  // ---- 筛选 ----
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // ---- 基础字段 ----
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('openai');
  const [type, setType] = useState('api_key');
  const [statusForm, setStatusForm] = useState('ACTIVE');
  const [concurrency, setConcurrency] = useState(3);
  const [priority, setPriority] = useState(50);

  // ---- 凭证 & extra ----
  const [credValues, setCredValues] = useState<Record<string, string>>(buildEmptyCredValues('api_key'));
  const [extraBaseUrl, setExtraBaseUrl] = useState('');

  // ---- 协议 & 混合调度 ----
  const [accountProtocol, setAccountProtocol] = useState('responses');
  const [mixedScheduling, setMixedScheduling] = useState(false);

  // ---- OAuth 授权 ----
  const [oauthModalOpen, setOauthModalOpen] = useState(false);
  const [oauthPlatform, setOauthPlatform] = useState('anthropic');
  const [oauthAuthorizing, setOauthAuthorizing] = useState(false);
  const [oauthAuthUrl, setOauthAuthUrl] = useState('');
  const [oauthError, setOauthError] = useState('');

  const [oauthDeviceData, setOauthDeviceData] = useState<{
    deviceAuthId: string;
    userCode: string;
    verificationUri: string;
    expiresIn: number;
    interval: number;
  } | null>(null);
  const [oauthPollStatus, setOauthPollStatus] = useState<string>('PENDING');
  const [oauthPollCount, setOauthPollCount] = useState(0);
  const oauthPollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleTypeChange = (newType: string) => {
    setType(newType);
    setCredValues(buildEmptyCredValues(newType));
    const allowed = protocolOptionsFor(platform, newType);
    if (!allowed.some((p) => p.value === accountProtocol)) {
      setAccountProtocol(defaultProtocolFor(platform, newType));
    }
  };

  const handlePlatformChange = (newPlatform: string) => {
    const normalized = normalizePlatform(newPlatform);
    setPlatform(normalized);
    const allowed = protocolOptionsFor(normalized, type);
    if (!allowed.some((p) => p.value === accountProtocol)) {
      setAccountProtocol(defaultProtocolFor(normalized, type));
    }
  };

  const oauthPopupRef = useRef<Window | null>(null);

  // ---- OAuth 授权流程 ----
  const clearOAuthPolling = () => {
    if (oauthPollTimerRef.current) {
      clearInterval(oauthPollTimerRef.current);
      oauthPollTimerRef.current = null;
    }
  };

  const handleOpenOAuthModal = () => {
    setOauthPlatform('anthropic');
    setOauthAuthUrl('');
    setOauthError('');
    setOauthDeviceData(null);
    setOauthPollStatus('PENDING');
    setOauthPollCount(0);
    clearOAuthPolling();
    setOauthModalOpen(true);
  };

  const handleAuthCodeAuthorize = async () => {
    setOauthAuthorizing(true);
    setOauthError('');
    try {
      const redirectUri = `${window.location.origin}/admin/oauth/callback`;
      const { data } = await oauthApi.authorize({ platform: oauthPlatform, redirectUri });
      setOauthAuthUrl(data.authorizeUrl);
      const popup = window.open(data.authorizeUrl, 'oauth-authorize', 'width=800,height=700');
      if (popup) oauthPopupRef.current = popup;
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        '获取授权 URL 失败';
      setOauthError(msg);
    } finally {
      setOauthAuthorizing(false);
    }
  };

  const handleDeviceCodeInitiate = async () => {
    setOauthAuthorizing(true);
    setOauthError('');
    try {
      const { data } = await oauthApi.initiateDeviceCode({ platform: oauthPlatform });
      setOauthDeviceData(data);
      setOauthPollStatus('PENDING');
      setOauthPollCount(0);
      startPolling(data.deviceAuthId, data.userCode, data.interval, data.expiresIn);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        '获取设备码失败';
      setOauthError(msg);
    } finally {
      setOauthAuthorizing(false);
    }
  };

  const startPolling = (deviceAuthId: string, userCode: string, interval: number, expiresIn: number) => {
    clearOAuthPolling();
    const maxPolls = Math.ceil(expiresIn / interval);
    let count = 0;
    oauthPollTimerRef.current = setInterval(async () => {
      count++;
      setOauthPollCount(count);
      try {
        const { data } = await oauthApi.pollDeviceCode({ deviceAuthId, userCode });
        if (data.status === 'SUCCESS') {
          clearOAuthPolling();
          setOauthPollStatus('SUCCESS');
          addToast({ type: 'success', message: `OAuth 账号 "${data.account?.name ?? '未知'}" 创建成功` });
          fetchAccounts();
          setTimeout(() => setOauthModalOpen(false), 1500);
        } else if (data.status === 'EXPIRED') {
          clearOAuthPolling();
          setOauthPollStatus('EXPIRED');
          setOauthError('设备码已过期，请重新发起授权');
        }
      } catch { /* Poll failed, keep trying until max */ }
      if (count >= maxPolls) {
        clearOAuthPolling();
        setOauthPollStatus('EXPIRED');
        setOauthError('授权超时，请重新发起授权');
      }
    }, interval * 1000);
  };

  const handleOAuthAuthorize = () => {
    if (oauthPlatform === 'openai') {
      handleDeviceCodeInitiate();
    } else {
      handleAuthCodeAuthorize();
    }
  };

  const handleRefreshToken = async (account: Account) => {
    try {
      await oauthApi.refreshToken(account.id);
      addToast({ type: 'success', message: 'Token 已刷新' });
      fetchAccounts();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        '刷新 Token 失败';
      addToast({ type: 'error', message: msg });
    }
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
    modelPricesApi.list(0, 500).then(({ data }) => {
      const seen = new Set<string>();
      const opts: { value: string; label: string }[] = [];
      (data.prices ?? []).forEach((p) => {
        if (!seen.has(p.model)) {
          seen.add(p.model);
          opts.push({ value: p.model, label: p.model });
        }
      });
      setModelOptions(opts);
    }).catch(() => { /* 非关键请求，静默失败 */ });
  }, [fetchAccounts]);

  // ---- 监听 OAuth 回调 ----
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== 'OAUTH_CALLBACK_SUCCESS') return;
      addToast({ type: 'success', message: `OAuth 账号 "${e.data.data?.name ?? '未知'}" 创建成功` });
      fetchAccounts();
      oauthPopupRef.current?.close();
      oauthPopupRef.current = null;
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [fetchAccounts, addToast]);

  useEffect(() => {
    if (!oauthModalOpen) {
      clearOAuthPolling();
      setOauthDeviceData(null);
      setOauthPollStatus('PENDING');
      setOauthPollCount(0);
    }
    return () => clearOAuthPolling();
  }, [oauthModalOpen]);

  const openCreate = () => {
    setEditTarget(null);
    setName('');
    setPlatform('openai');
    setType('api_key');
    setStatusForm('ACTIVE');
    setCredValues(buildEmptyCredValues('api_key'));
    setExtraBaseUrl('');
    setConcurrency(3);
    setPriority(50);
    setAccountProtocol('responses');
    setMixedScheduling(false);
    setModalOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditTarget(account);
    setName(account.name);
    const normalizedPlatform = normalizePlatform(account.platform);
    setPlatform(normalizedPlatform);
    setType(account.type);
    setStatusForm(account.status);
    const fields = getCredFields(account.type);
    const vals: Record<string, string> = {};
    const creds = parseJsonSafe(account.credentials);
    fields.forEach((f) => {
      const v = (creds as Record<string, unknown>)[f.key];
      vals[f.key] = typeof v === 'string' ? v : (v ? JSON.stringify(v) : '');
    });
    setCredValues(vals);
    const extra = parseJsonSafe(account.extra) as Record<string, unknown>;
    setExtraBaseUrl(typeof extra.base_url === 'string' ? extra.base_url as string : '');
    setConcurrency(account.concurrency ?? 3);
    setPriority(account.priority ?? 50);
    const protocols = parseProtocolsArray(account.supportedProtocols);
    const allowed = protocolOptionsFor(normalizedPlatform, account.type);
    const selected = protocols.find((proto) => allowed.some((p) => p.value === proto));
    setAccountProtocol(selected || defaultProtocolFor(normalizedPlatform, account.type));
    setMixedScheduling(account.mixedScheduling ?? false);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const originalCreds = editTarget ? parseJsonSafe(editTarget.credentials) as Record<string, string> : {};
      const creds: Record<string, string> = { ...originalCreds };
      Object.entries(credValues).forEach(([k, v]) => {
        if (v.trim()) creds[k] = v.trim();
      });
      const originalExtra = editTarget ? parseJsonSafe(editTarget.extra) as Record<string, unknown> : {};
      const extra: Record<string, unknown> = { ...originalExtra };
      if (extraBaseUrl.trim()) {
        extra.base_url = extraBaseUrl.trim();
      } else {
        delete extra.base_url;
      }
      delete extra.openai_responses_supported;
      delete extra.openai_responses_mode;
      delete extra.openai_passthrough;
      const selectedProtocol = accountProtocol || defaultProtocolFor(platform, type);
      const payload = {
        name: name.trim(),
        platform,
        type,
        status: statusForm,
        credentials: JSON.stringify(creds),
        extra: JSON.stringify(extra),
        concurrency,
        priority,
        supportedProtocols: JSON.stringify(selectedProtocol ? [selectedProtocol] : []),
        mixedScheduling,
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
      const { data } = await groupsApi.list();
      const groups = data.groups ?? [];
      await Promise.all(
        groups.map(async (group) => {
          try {
            await groupsApi.unbindAccount(group.id, deleteTarget.id);
          } catch {
            // Ignore missing bindings; delete still proceeds.
          }
        }),
      );
      await accountsApi.delete(deleteTarget.id);
      addToast({ type: 'success', message: '账号已删除，相关分组绑定已同步清理' });
      setDeleteTarget(null);
      fetchAccounts();
    } catch {
      addToast({ type: 'error', message: '删除失败' });
    }
  };

  const openBulkModel = () => {
    setBulkModel('');
    setBulkMode('append');
    setBulkAccountIds(new Set(accounts.map((account) => account.id)));
    setBulkModelModal(true);
  };

  const toggleBulkAccount = (id: number) => {
    setBulkAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveBulkModel = async () => {
    const model = bulkModel.trim();
    const targets = accounts.filter((account) => bulkAccountIds.has(account.id));
    if (!model || targets.length === 0) return;
    setBulkSaving(true);
    const previous = new Map(targets.map((account) => [account.id, account.supportedModels]));
    try {
      await Promise.all(targets.map((account) => {
        const current = parseSupportedModels(account);
        const next = model === '*'
          ? ['*']
          : bulkMode === 'replace'
          ? [model]
          : current.includes('*') || current.includes(model)
            ? current
            : [...current, model];
        return accountsApi.update(account.id, { supportedModels: JSON.stringify(next) });
      }));
      setAccounts((prev) => prev.map((account) => {
        if (!bulkAccountIds.has(account.id)) return account;
        const current = parseSupportedModels(account);
        const next = model === '*'
          ? ['*']
          : bulkMode === 'replace'
          ? [model]
          : current.includes('*') || current.includes(model)
            ? current
            : [...current, model];
        return { ...account, supportedModels: JSON.stringify(next) };
      }));
      addToast({ type: 'success', message: `已同步模型到 ${targets.length} 个账号` });
      setBulkModelModal(false);
    } catch {
      setAccounts((prev) => prev.map((account) => (
        previous.has(account.id)
          ? { ...account, supportedModels: previous.get(account.id) ?? undefined }
          : account
      )));
      addToast({ type: 'error', message: '批量同步失败' });
    } finally {
      setBulkSaving(false);
    }
  };

  /* ─── 模型白名单管理 ─── */
  const parseSupportedModels = (a: Account): string[] => {
    try {
      if (!a.supportedModels) return [];
      const arr = JSON.parse(a.supportedModels);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  };

  const addSupportedModel = async (accountId: number, model: string) => {
    const trimmed = model.trim();
    if (!trimmed) return;
    const a = accounts.find((acc) => acc.id === accountId);
    if (!a) return;
    const current = parseSupportedModels(a);
    if (current.includes(trimmed)) return;

    if (trimmed === '*') {
      const baseline = current.filter((m) => m !== '*');
      setBaselineModels((prev) => ({ ...prev, [accountId]: baseline }));
      const updated = JSON.stringify(['*']);
      setAccounts((prev) =>
        prev.map((acc) => (acc.id === accountId ? { ...acc, supportedModels: updated } : acc)),
      );
      setModelInputs((prev) => ({ ...prev, [accountId]: '' }));
      try {
        await accountsApi.update(accountId, { supportedModels: updated });
        addToast({ type: 'success', message: '已切换为支持所有模型' });
      } catch {
        setAccounts((prev) =>
          prev.map((acc) => (acc.id === accountId ? { ...acc, supportedModels: a.supportedModels ?? undefined } : acc)),
        );
        setBaselineModels((prev) => {
          const next = { ...prev };
          delete next[accountId];
          return next;
        });
        addToast({ type: 'error', message: '操作失败' });
      }
      return;
    }

    if (current.includes('*')) {
      const baseline = baselineModels[accountId] ?? [];
      if (baseline.includes(trimmed)) return;
      setBaselineModels((prev) => ({ ...prev, [accountId]: [...baseline, trimmed] }));
      setModelInputs((prev) => ({ ...prev, [accountId]: '' }));
      addToast({ type: 'success', message: `已暂存模型: ${trimmed}（移除"全部"后生效）` });
      return;
    }

    const updated = JSON.stringify([...current, trimmed]);
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === accountId ? { ...acc, supportedModels: updated } : acc)),
    );
    setModelInputs((prev) => ({ ...prev, [accountId]: '' }));
    try {
      await accountsApi.update(accountId, { supportedModels: updated });
      addToast({ type: 'success', message: `已添加支持模型: ${trimmed}` });
    } catch {
      setAccounts((prev) =>
        prev.map((acc) => (acc.id === accountId ? { ...acc, supportedModels: a.supportedModels ?? undefined } : acc)),
      );
      addToast({ type: 'error', message: '操作失败' });
    }
  };

  const removeSupportedModel = async (accountId: number, model: string) => {
    const a = accounts.find((acc) => acc.id === accountId);
    if (!a) return;
    const current = parseSupportedModels(a);

    if (model === '*') {
      const baseline = baselineModels[accountId] ?? [];
      const updated = JSON.stringify(baseline);
      const previousSupported = a.supportedModels;
      setAccounts((prev) =>
        prev.map((acc) => (acc.id === accountId ? { ...acc, supportedModels: updated } : acc)),
      );
      setBaselineModels((prev) => {
        const next = { ...prev };
        delete next[accountId];
        return next;
      });
      try {
        await accountsApi.update(accountId, { supportedModels: updated });
        addToast({ type: 'success', message: baseline.length > 0 ? '已恢复具体模型' : '已移除通配符' });
      } catch {
        setAccounts((prev) =>
          prev.map((acc) => (acc.id === accountId ? { ...acc, supportedModels: previousSupported ?? undefined } : acc)),
        );
        addToast({ type: 'error', message: '操作失败' });
      }
      return;
    }

    if (current.includes('*')) {
      const baseline = baselineModels[accountId] ?? [];
      setBaselineModels((prev) => ({ ...prev, [accountId]: baseline.filter((m) => m !== model) }));
      addToast({ type: 'success', message: `已移除暂存模型: ${model}` });
      return;
    }

    const updated = JSON.stringify(current.filter((m) => m !== model));
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === accountId ? { ...acc, supportedModels: updated } : acc)),
    );
    try {
      await accountsApi.update(accountId, { supportedModels: updated });
      addToast({ type: 'success', message: `已移除支持模型: ${model}` });
    } catch {
      setAccounts((prev) =>
        prev.map((acc) => (acc.id === accountId ? { ...acc, supportedModels: a.supportedModels ?? undefined } : acc)),
      );
      addToast({ type: 'error', message: '操作失败' });
    }
  };

  const credFields = getCredFields(type);

  /* ─── 筛选逻辑 ─── */
  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterPlatform && normalizePlatform(a.platform) !== filterPlatform) return false;
      if (filterType && a.type !== filterType) return false;
      if (filterStatus && a.status !== filterStatus) return false;
      return true;
    });
  }, [accounts, search, filterPlatform, filterType, filterStatus]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') setSearch(searchInput.trim());
  };

  const hasFilters = search || filterPlatform || filterType || filterStatus;

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setFilterPlatform('');
    setFilterType('');
    setFilterStatus('');
  };

  return (
    <div className="flex h-[calc(100vh-15rem)] min-h-[600px] flex-col gap-4 overflow-hidden">
      <div className="shrink-0 rounded-[1.1rem] border border-[#D4E2DC] bg-[#F7FAF6] p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            <div className="relative md:w-64">
              <Icon
                name="search"
                size="sm"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-400"
              />
              <input
                className="input w-full pl-9"
                placeholder="搜索账号名称..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
            </div>
            <Button onClick={() => setSearch(searchInput.trim())} size="sm">搜索</Button>
            <Select
              options={[{ value: '', label: '全部平台' }, ...PLATFORM_OPTIONS]}
              value={filterPlatform}
              onChange={setFilterPlatform}
              className="md:w-40"
            />
            <Select
              options={[{ value: '', label: '全部类型' }, ...TYPE_OPTIONS]}
              value={filterType}
              onChange={setFilterType}
              className="md:w-40"
            />
            <Select
              options={[
                { value: '', label: '全部状态' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'DISABLED', label: 'Disabled' },
              ]}
              value={filterStatus}
              onChange={setFilterStatus}
              className="md:w-36"
            />
          </div>
          <div className="flex items-center justify-between gap-3 xl:justify-end">
            <span className="text-sm whitespace-nowrap text-gray-500 dark:text-dark-400">
              共 {filteredAccounts.length} 个账号
            </span>
            {hasFilters && (
              <button
                className="text-sm font-semibold text-[#007C86] transition-colors hover:text-[#005F66] dark:text-cyan-300 dark:hover:text-cyan-200"
                onClick={clearFilters}
              >
                清除筛选
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.2rem] border border-[#D4E2DC] bg-[#FBFDF9] shadow-sm dark:border-white/10 dark:bg-[#101A18]">
        <div className="border-b border-[#DCE8E2] bg-[#F1F7F3] px-5 py-4 dark:border-white/10 dark:bg-white/[0.035]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-[#10251F] dark:text-white">账号列表</h2>
              <p className="mt-0.5 text-xs text-[#657871] dark:text-dark-400">查看账号状态、模型配置和调度参数。</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[#D4E2DC] bg-white px-2.5 py-1 text-xs font-semibold text-[#52665F] dark:border-white/10 dark:bg-white/[0.04] dark:text-dark-300">
                {filteredAccounts.length} / {accounts.length}
              </span>
              <Button variant="secondary" size="sm" onClick={handleOpenOAuthModal}>
                <Icon name="externalLink" size="xs" /> OAuth 授权
              </Button>
              <Button variant="secondary" size="sm" onClick={openBulkModel}>
                <Icon name="sparkles" size="xs" /> 批量模型
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Icon name="plus" size="xs" /> 添加账号
              </Button>
            </div>
          </div>
        </div>

        {/* ── 横向账号列表 ── */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <LoadingSpinner size="xl" />
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-gray-400 dark:text-dark-500">
            <Icon name="server" size="xl" className="text-gray-200 dark:text-dark-700" />
            <p className="text-sm">{hasFilters ? '没有匹配的账号' : '暂无账号，点击右上角"添加账号"开始'}</p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <div className="divide-y divide-gray-100 dark:divide-dark-700">
              {filteredAccounts.map((a) => {
                const supportedModels = parseSupportedModels(a);
                const protocols = parseProtocolsArray(a.supportedProtocols);
                const usage = parseAccountUsageStatus(a.sessionWindowStatus);
                const codexWindows = usage?.kind === 'codex' ? usage.windows : [];
                const modelLabel = supportedModels.length === 0
                  ? '未配置'
                  : supportedModels[0] === '*'
                    ? '全部模型'
                    : `${supportedModels[0]}${supportedModels.length > 1 ? ` +${supportedModels.length - 1}` : ''}`;

                return (
                  <div
                    key={a.id}
                    className="grid grid-cols-1 gap-3 border-l-[3px] border-l-transparent px-4 py-4 transition-[background-color,border-color] hover:border-l-[#00A6B2] hover:bg-[#F3F8F4] dark:hover:bg-white/[0.035] md:grid-cols-2 xl:grid-cols-[minmax(260px,1.3fr)_minmax(150px,0.8fr)_minmax(210px,1fr)_minmax(150px,0.7fr)_minmax(210px,auto)] xl:items-center xl:gap-4 xl:px-5 xl:py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <h3 className="truncate text-sm font-black text-[#10251F] dark:text-white">{a.name}</h3>
                        <span className="shrink-0 text-[11px] font-mono text-gray-400 dark:text-dark-500">#{a.id}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PLATFORM_COLORS[normalizePlatform(a.platform)] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                          {platformLabel(a.platform)}
                        </span>
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-dark-800 dark:text-dark-300">
                          {a.type}
                        </span>
                        <StatusBadge status={a.status ?? 'ACTIVE'} />
                      </div>
                    </div>

                    <div className="text-xs text-[#657871] dark:text-dark-400">
                      <p><span className="font-semibold text-[#203830] dark:text-dark-200">并发</span> {a.concurrency ?? 3}</p>
                      <p className="mt-1"><span className="font-semibold text-[#203830] dark:text-dark-200">优先级</span> {a.priority ?? 50}</p>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[#203830] dark:text-dark-200">{modelLabel}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {protocols.length === 0 ? (
                          <span className="text-xs text-gray-400 dark:text-dark-500">协议不限</span>
                        ) : protocols.map((proto) => (
                          <span
                            key={proto}
                            className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium ${PROTOCOL_COLORS[proto] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                          >
                            {proto}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="min-w-0 text-xs text-[#657871] dark:text-dark-400">
                      {usage?.kind === 'legacy' ? (
                        <p className="truncate text-xs text-[#657871] dark:text-dark-400">Legacy 用量</p>
                      ) : (
                        <AccountUsageBars windows={codexWindows} />
                      )}
                      <p className="mt-1 truncate">最近 {a.lastUsedAt ? new Date(a.lastUsedAt).toLocaleString() : '暂无记录'}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:col-span-2 xl:col-span-1 xl:justify-end">
                      <div className="mr-1 flex items-center gap-2">
                        <span className={`text-xs font-medium ${a.schedulable ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-dark-500'}`}>
                          {a.schedulable ? '可调度' : '停用'}
                        </span>
                        <Toggle checked={a.schedulable} onChange={() => handleToggleSchedulable(a)} ariaLabel={`${a.name} 调度状态`} />
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => setDrawerAccount(a)}>
                        <Icon name="cog" size="xs" /> 模型
                      </Button>
                      {a.type === 'oauth' && (
                        <Button variant="ghost" size="sm" onClick={() => handleRefreshToken(a)} aria-label={`刷新 ${a.name} Token`}>
                          <Icon name="refresh" size="xs" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => openEdit(a)} aria-label={`编辑账号 ${a.name}`}>
                        <Icon name="edit" size="xs" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(a)} aria-label={`删除账号 ${a.name}`}>
                        <Icon name="trash" size="xs" className="text-red-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Create/Edit Modal ═══ */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? '编辑账号' : '添加账号'}
        width="wide"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={handleSave} loading={saving}>保存</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-900/40 dark:bg-violet-900/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 text-white shadow-sm">
                <Icon name="edit" size="md" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-violet-800 dark:text-violet-300">
                  {editTarget ? `编辑 ${editTarget.name}` : '添加上游账号'}
                </p>
                <p className="mt-0.5 text-xs text-violet-600/70 dark:text-violet-400/70">
                  按配置项分组填写，保存后立即应用到调度系统。
                </p>
              </div>
            </div>
          </div>

          <FormSection icon="userCircle" tone="violet" title="基础信息" description="定义账号的名称、平台、认证类型和当前状态。">
            <div className="space-y-4">
              <Input label="名称" value={name} onChange={(e) => setName(e.target.value)} placeholder="输入账号名称" />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="input-label">平台</label>
                  <Select options={PLATFORM_OPTIONS} value={platform} onChange={handlePlatformChange} />
                </div>
                <div>
                  <label className="input-label">类型</label>
                  <Select options={TYPE_OPTIONS} value={type} onChange={handleTypeChange} />
                </div>
                <div>
                  <label className="input-label">状态</label>
                  <Select
                    options={[
                      { value: 'ACTIVE', label: 'Active' },
                      { value: 'DISABLED', label: 'Disabled' },
                    ]}
                    value={statusForm}
                    onChange={setStatusForm}
                  />
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection icon="cog" tone="amber" title="调度配置" description="控制该账号被路由选中时的并发上限和优先级。">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            </div>
          </FormSection>

          <FormSection
            icon="key"
            tone="emerald"
            title="凭证"
            description={`当前类型：${TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type}`}
          >
            <div className="space-y-3">
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
          </FormSection>

          <FormSection icon="shield" tone="blue" title="上游协议" description="每个账号必须明确选择一个实际上游 API 协议，网关按客户端协议和上游协议决定是否转换。">
            <div className="space-y-4">
              <div>
                <div className="flex flex-wrap gap-3">
                  {protocolOptionsFor(platform, type).map((p) => (
                    <label
                      key={p.value}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                        accountProtocol === p.value
                          ? 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-600 dark:bg-violet-900/20 dark:text-violet-300'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="account-protocol"
                        checked={accountProtocol === p.value}
                        onChange={() => setAccountProtocol(p.value)}
                        className="sr-only"
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-400">只能选择一个协议。OpenAI API Key 可选 Chat Completions 或 Responses；OpenAI OAuth 固定 Responses；Anthropic 固定 Messages。</p>
              </div>

              <div className="rounded-lg border border-gray-200 p-4 dark:border-dark-600">
                <Toggle
                  checked={mixedScheduling}
                  onChange={setMixedScheduling}
                  label="允许跨 Provider 混合调度"
                />
                <p className="mt-1 text-xs text-gray-400">开启后此账号可被不同 Provider 的分组调度使用。</p>
              </div>
            </div>
          </FormSection>

          <FormSection icon="server" tone="gray" title="额外配置" description="覆盖上游地址。协议转换与透传由客户端协议和账号上游协议自动决定。">
            <div className="space-y-4">
              <div>
                <Input
                  label="Base URL"
                  value={extraBaseUrl}
                  onChange={(e) => setExtraBaseUrl(e.target.value)}
                  placeholder="https://custom-api.example.com（留空则使用默认地址）"
                />
                <p className="mt-2 text-xs text-gray-400">覆盖默认的 API 上游地址。例如 Anthropic 的 https://api.anthropic.com，留空则走官方默认。</p>
              </div>
            </div>
          </FormSection>
        </div>
      </Modal>

      {/* ═══ Bulk Model Sync Modal ═══ */}
      <Modal
        open={bulkModelModal}
        onClose={() => setBulkModelModal(false)}
        title="批量同步模型到账号"
        width="wide"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setBulkModelModal(false)}>取消</Button>
            <Button onClick={saveBulkModel} loading={bulkSaving} disabled={!bulkModel.trim() || bulkAccountIds.size === 0}>
              同步
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px]">
            <div>
              <label className="input-label">模型</label>
              <Select
                options={[
                  { value: '*', label: '全部模型（通配符 *）' },
                  ...modelOptions,
                ]}
                value={bulkModel}
                onChange={setBulkModel}
                placeholder="选择要同步的模型..."
                searchable
                emptyText="无匹配模型"
              />
            </div>
            <div>
              <label className="input-label">写入方式</label>
              <Select
                options={[
                  { value: 'append', label: '追加到账号' },
                  { value: 'replace', label: '覆盖账号模型' },
                ]}
                value={bulkMode}
                onChange={(value) => setBulkMode(value === 'replace' ? 'replace' : 'append')}
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 dark:border-dark-700">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-dark-700">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">目标账号</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-400">已选择 {bulkAccountIds.size} / {accounts.length}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setBulkAccountIds(new Set(accounts.map((account) => account.id)))}>
                  全选
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setBulkAccountIds(new Set())}>
                  清空
                </Button>
              </div>
            </div>
            <div className="max-h-[360px] divide-y divide-gray-100 overflow-auto dark:divide-dark-700">
              {accounts.map((account) => {
                const models = parseSupportedModels(account);
                const selected = bulkAccountIds.has(account.id);
                const modelLabel = models.length === 0 ? '未配置' : models[0] === '*' ? '全部模型' : `${models.length} 个模型`;
                return (
                  <label
                    key={account.id}
                    className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-dark-800/50"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleBulkAccount(account.id)}
                      className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">{account.name}</span>
                        <span className="text-[11px] font-mono text-gray-400">#{account.id}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-dark-400">
                        {platformLabel(account.platform)} · {account.type} · {modelLabel}
                      </p>
                    </div>
                    <StatusBadge status={account.status ?? 'ACTIVE'} />
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* ═══ OAuth Authorization Modal ═══ */}
      <Modal
        open={oauthModalOpen}
        onClose={() => setOauthModalOpen(false)}
        title="OAuth 授权"
        width="normal"
        footer={(() => {
          const isAnthropicDone = !!oauthAuthUrl;
          const isOpenAIStarted = !!oauthDeviceData;
          const isOpenAIDone = oauthPollStatus === 'SUCCESS' || oauthPollStatus === 'EXPIRED';
          if (!isAnthropicDone && !isOpenAIStarted) {
            return (
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setOauthModalOpen(false)}>取消</Button>
                <Button onClick={handleOAuthAuthorize} loading={oauthAuthorizing}>开始授权</Button>
              </div>
            );
          }
          if (isOpenAIStarted && !isOpenAIDone) {
            return (
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setOauthModalOpen(false)}>取消</Button>
              </div>
            );
          }
          return (
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setOauthModalOpen(false)}>关闭</Button>
              {isOpenAIDone && oauthPollStatus === 'EXPIRED' && (
                <Button onClick={handleDeviceCodeInitiate} loading={oauthAuthorizing}>重新授权</Button>
              )}
            </div>
          );
        })()}
      >
        <div className="space-y-5">
          {!oauthAuthUrl && !oauthDeviceData && (
            <>
              <p className="text-sm text-gray-500 dark:text-dark-400">
                选择 OAuth 平台后点击"开始授权"。
                Anthropic 将跳转到授权页面完成登录；
                OpenAI 使用设备码方式，在新页面输入验证码即可完成授权。
              </p>
              <div>
                <label className="input-label">OAuth 平台</label>
                <Select
                  options={[
                    { value: 'anthropic', label: 'Anthropic Claude' },
                    { value: 'openai', label: 'OpenAI' },
                  ]}
                  value={oauthPlatform}
                  onChange={setOauthPlatform}
                />
              </div>
              {oauthPlatform === 'anthropic' && (
                <p className="text-xs text-gray-400">
                  回调地址：{window.location.origin}/admin/oauth/callback
                </p>
              )}
              {oauthError && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
                  {oauthError}
                </div>
              )}
            </>
          )}

          {oauthAuthUrl && (
            <>
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 text-center">
                <Icon name="check" size="lg" className="mx-auto mb-2 text-green-600 dark:text-green-400" />
                <p className="text-sm text-green-700 dark:text-green-300">
                  授权页面已打开，请在弹出的窗口中完成 Anthropic 账号授权。
                </p>
              </div>
              {oauthPopupRef.current === null && (
                <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-4">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                    弹窗可能被浏览器拦截，请手动点击下方链接打开授权页面：
                  </p>
                  <a
                    href={oauthAuthUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-violet-600 dark:text-violet-400 underline break-all hover:text-violet-700"
                  >
                    {oauthAuthUrl}
                  </a>
                </div>
              )}
              <p className="text-center text-xs text-gray-400">
                授权完成后账号将自动出现在列表中。
              </p>
            </>
          )}

          {oauthDeviceData && oauthPollStatus !== 'SUCCESS' && (
            <>
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">
                  请按以下步骤完成 OpenAI 授权：
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700 dark:text-blue-300">
                  <li>
                    打开验证页面：
                    <a
                      href={oauthDeviceData.verificationUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 text-violet-600 dark:text-violet-400 underline hover:text-violet-700"
                    >
                      {oauthDeviceData.verificationUri}
                    </a>
                  </li>
                  <li>
                    输入以下验证码：
                    <span className="ml-1 font-mono text-lg font-bold tracking-widest text-gray-900 dark:text-white select-all">
                      {oauthDeviceData.userCode}
                    </span>
                  </li>
                  <li>在 OpenAI 页面确认授权</li>
                </ol>
              </div>
              {oauthPollStatus === 'PENDING' && (
                <div className="flex items-center justify-center gap-3 text-sm text-gray-500 dark:text-dark-400">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                  等待授权中（已轮询 {oauthPollCount} 次）...
                </div>
              )}
              {oauthPollStatus === 'EXPIRED' && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
                  {oauthError || '设备码已过期，请点击下方"重新授权"按钮'}
                </div>
              )}
              {oauthError && oauthPollStatus !== 'EXPIRED' && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
                  {oauthError}
                </div>
              )}
            </>
          )}

          {oauthDeviceData && oauthPollStatus === 'SUCCESS' && (
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 text-center">
              <Icon name="check" size="lg" className="mx-auto mb-2 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-700 dark:text-green-300">
                OpenAI 授权成功！账号已自动创建，此窗口即将关闭。
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* ═══ Model Management Drawer ═══ */}
      <Drawer
        open={!!drawerAccount}
        onClose={() => setDrawerAccount(null)}
        title={drawerAccount ? `模型管理 — ${drawerAccount.name}` : ''}
        width="lg"
      >
        {drawerAccount && (() => {
          const a = drawerAccount;
          const supportedModels = parseSupportedModels(a);

          return (
            <div className="space-y-5">
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-dark-700 dark:bg-dark-900">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">当前策略</h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-dark-400">决定该账号会匹配哪些模型请求。</p>
                  </div>
                  {supportedModels.length > 0 && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-dark-800 dark:text-dark-300">
                      {supportedModels[0] === '*' ? '全部' : `${supportedModels.length} 个模型`}
                    </span>
                  )}
                </div>

                {(() => {
                  const raw = a.supportedModels;
                  if (raw == null || raw === '' || raw === '[]') {
                    return (
                      <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/60 px-5 py-4 dark:border-amber-900/40 dark:bg-amber-900/10">
                        <div className="flex gap-3">
                          <Icon name="exclamationCircle" size="md" className="mt-0.5 text-amber-500" />
                          <div>
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">尚未配置支持模型</p>
                            <p className="mt-1 text-xs text-amber-700/70 dark:text-amber-400/70">该账号不会被选中路由，请添加 “*” 支持所有模型或添加具体模型名。</p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  if (supportedModels.length === 1 && supportedModels[0] === '*') {
                    const baseline = baselineModels[a.id] ?? [];
                    return (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 dark:border-blue-800 dark:bg-blue-900/10">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white shadow-sm">
                              <Icon name="sparkles" size="md" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-blue-800 dark:text-blue-300">匹配所有模型</p>
                              <p className="text-xs text-blue-600/70 dark:text-blue-400/70">当前账号对所有模型请求开放。</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSupportedModel(a.id, '*')}
                              className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:border-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                            >
                              取消通配
                            </button>
                          </div>
                        </div>
                        {baseline.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">待恢复模型</p>
                            <div className="divide-y divide-gray-100 rounded-xl border border-dashed border-gray-200 dark:divide-dark-700 dark:border-dark-600">
                              {baseline.map((m) => (
                                <div key={m} className="flex items-center justify-between px-4 py-2.5">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">{m}</span>
	                                  <button
	                                    type="button"
	                                    onClick={() => setBaselineModels((prev) => ({ ...prev, [a.id]: (prev[a.id] ?? []).filter((x) => x !== m) }))}
	                                    className="text-gray-300 transition-colors hover:text-red-500"
                                      aria-label={`移除待恢复模型 ${m}`}
	                                  >
                                    <Icon name="x" size="xs" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-dark-700 dark:border-dark-600">
                      {supportedModels.map((m, i) => (
                        <div key={m} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50/50 dark:hover:bg-dark-800/50">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <span className="text-xs font-bold">{i + 1}</span>
                          </div>
                          <span className="flex-1 truncate text-sm font-medium text-gray-700 dark:text-dark-300">{m}</span>
	                          <button
	                            type="button"
	                            onClick={() => removeSupportedModel(a.id, m)}
	                            className="shrink-0 rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                              aria-label={`移除支持模型 ${m}`}
	                          >
                            <Icon name="trash" size="xs" />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-dark-700 dark:bg-dark-900">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">添加模型</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-dark-400">选择具体模型，或选择通配符 “*” 让账号支持全部模型。</p>
                </div>
                <div className="flex gap-2">
                  <Select
                    options={[
                      { value: '*', label: '✦ 全部模型（通配符 *）' },
                      ...modelOptions.filter((o) => !supportedModels.includes(o.value)),
                    ]}
                    value={modelInputs[a.id] ?? ''}
                    onChange={(v) => setModelInputs((prev) => ({ ...prev, [a.id]: v }))}
                    placeholder="搜索并选择模型..."
                    searchable
                    emptyText="无匹配模型"
                    className="flex-1"
                  />
                  <Button variant="secondary" onClick={() => addSupportedModel(a.id, modelInputs[a.id] ?? '')}>
                    <Icon name="plus" size="sm" /> 添加
                  </Button>
                </div>
              </div>

            </div>
          );
        })()}
      </Drawer>

      {/* ═══ Delete Confirm ═══ */}
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
