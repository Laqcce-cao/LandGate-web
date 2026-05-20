import { useEffect, useState, useCallback, useRef } from 'react';
import { accountsApi, type Account } from '../api/admin/accounts';
import { oauthApi } from '../api/admin/oauth';
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

  // ---- OAuth 授权 ----
  const [oauthModalOpen, setOauthModalOpen] = useState(false);
  const [oauthPlatform, setOauthPlatform] = useState('anthropic');
  const [oauthAuthorizing, setOauthAuthorizing] = useState(false);
  const [oauthAuthUrl, setOauthAuthUrl] = useState('');
  const [oauthError, setOauthError] = useState('');

  // Device Code Flow (OpenAI)
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

  // ---- 当类型切换时重置凭证字段 ----
  const handleTypeChange = (newType: string) => {
    setType(newType);
    setCredValues(buildEmptyCredValues(newType));
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

  // Authorization Code Flow (Anthropic)
  const handleAuthCodeAuthorize = async () => {
    setOauthAuthorizing(true);
    setOauthError('');
    try {
      const redirectUri = `${window.location.origin}/admin/oauth/callback`;
      const { data } = await oauthApi.authorize({ platform: oauthPlatform, redirectUri });
      setOauthAuthUrl(data.authorizeUrl);

      const popup = window.open(data.authorizeUrl, 'oauth-authorize', 'width=800,height=700');
      if (popup) {
        oauthPopupRef.current = popup;
      }
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

  // Device Code Flow (OpenAI)
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
          addToast({
            type: 'success',
            message: `OAuth 账号 "${data.account?.name ?? '未知'}" 创建成功`,
          });
          fetchAccounts();
          setTimeout(() => setOauthModalOpen(false), 1500);
        } else if (data.status === 'EXPIRED') {
          clearOAuthPolling();
          setOauthPollStatus('EXPIRED');
          setOauthError('设备码已过期，请重新发起授权');
        }
        // PENDING: continue polling
      } catch {
        // Poll failed, keep trying until max
      }
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

  // ---- 手动刷新 OAuth Token ----
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
  }, [fetchAccounts]);

  // ---- 监听 OAuth 回调窗口的 postMessage ----
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

  // Cleanup polling when modal closes or component unmounts
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
    setRateMultiplier('1.0');
    setModalOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditTarget(account);
    setName(account.name);
    setPlatform(account.platform);
    setType(account.type);
    setStatusForm(account.status);

    // 解析已有 credentials JSON 字符串到表单字段
    const fields = getCredFields(account.type);
    const vals: Record<string, string> = {};
    const creds = parseJsonSafe(account.credentials);
    fields.forEach((f) => {
      const v = (creds as Record<string, unknown>)[f.key];
      vals[f.key] = typeof v === 'string' ? v : (v ? JSON.stringify(v) : '');
    });
    setCredValues(vals);

    // 解析 extra.base_url（extra 也是 JSON 字符串）
    const extra = parseJsonSafe(account.extra);
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
      // 编辑时从原始凭证开始，只覆盖用户修改过的非空字段，避免丢失未修改的凭证
      const originalCreds = editTarget ? parseJsonSafe(editTarget.credentials) as Record<string, string> : {};
      const creds: Record<string, string> = { ...originalCreds };
      Object.entries(credValues).forEach(([k, v]) => {
        if (v.trim()) creds[k] = v.trim();
      });

      // 构建 extra：编辑时保留原始 extra，只覆盖 base_url
      const originalExtra = editTarget ? parseJsonSafe(editTarget.extra) as Record<string, string> : {};
      const extra: Record<string, string> = { ...originalExtra };
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
          {row.type === 'oauth' && (
            <Button variant="ghost" size="sm" onClick={() => handleRefreshToken(row)} title="刷新 Token">
              <Icon name="refresh" size="sm" />
            </Button>
          )}
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
      {/* header */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-dark-400">
          共 {accounts.length} 个上游账号
        </p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleOpenOAuthModal}>
            <Icon name="externalLink" size="sm" /> OAuth 授权
          </Button>
          <Button onClick={openCreate}>
            <Icon name="plus" size="sm" /> 添加账号
          </Button>
        </div>
      </div>

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

      {/* OAuth Authorization modal */}
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
          {/* ---- Initial: select platform ---- */}
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

          {/* ---- Anthropic: popup opened ---- */}
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

          {/* ---- OpenAI: Device Code Flow ---- */}
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

          {/* ---- OpenAI: Success ---- */}
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
