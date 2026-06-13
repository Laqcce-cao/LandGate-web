import { useEffect, useState, useCallback } from 'react';
import { groupsApi, type Group } from '../api/admin/groups';
import { accountsApi, type Account } from '../api/admin/accounts';
import { modelPricesApi } from '../api/admin/model-prices';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Drawer } from '../components/ui/Drawer';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Icon } from '../components/ui/Icon';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useToastStore } from '../stores/toastStore';

/* ─────────────────── helpers ─────────────────── */

const subTypeOpts = [
  { value: 'standard', label: '标准版（按量计费）' },
  { value: 'subscription', label: '订阅版（按月/年）' },
];

const platformBadge: Record<string, string> = {
  openai: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  openai_responses: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  anthropic: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  gemini: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  antigravity: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const providerAccent: Record<string, string> = {
  openai: '#10B981',
  openai_responses: '#14B8A6',
  anthropic: '#F59E0B',
  gemini: '#3B82F6',
  antigravity: '#8B5CF6',
};

const accountDotColor: Record<string, string> = {
  openai: 'bg-emerald-500',
  openai_responses: 'bg-teal-500',
  anthropic: 'bg-amber-500',
  gemini: 'bg-blue-500',
  antigravity: 'bg-purple-500',
};

const PROVIDER_OPTIONS = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'antigravity', label: 'Antigravity' },
];

const PROTOCOL_OPTIONS = [
  { value: 'chat_completions', label: 'Chat Completions' },
  { value: 'responses', label: 'Responses' },
  { value: 'messages', label: 'Messages' },
];

const STRATEGY_OPTIONS = [
  { value: 'hub_and_spoke', label: 'Hub & Spoke（允许协议转换）' },
  { value: 'native_only', label: 'Native Only（仅原生协议）' },
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

const providerLabel = (value?: string) =>
  PROVIDER_OPTIONS.find((option) => option.value === value)?.label ?? value ?? 'Anthropic';

const subTypeLabel = (value?: string) =>
  subTypeOpts.find((option) => option.value === value)?.label.split('（')[0] ?? '标准版';

export default function GroupsPage() {
  const addToast = useToastStore((s) => s.addToast);

  /* ─── data ─── */
  const [groups, setGroups] = useState<Group[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  // accountId -> set of groupIds
  const [bindings, setBindings] = useState<Map<number, Set<number>>>(new Map());
  const [loading, setLoading] = useState(true);

  /* ─── delete confirm ─── */
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);

  /* ─── modals ─── */
  const [groupModal, setGroupModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Group | null>(null); // null = create
  const [saving, setSaving] = useState(false);

  const [bindModal, setBindModal] = useState(false);
  const [bindGroupId, setBindGroupId] = useState<number | null>(null);
  const [bindAccountId, setBindAccountId] = useState('');
  const [bindPriority, setBindPriority] = useState('50');
  const [binding, setBinding] = useState(false);
  const [routeDrawerGroupId, setRouteDrawerGroupId] = useState<number | null>(null);

  /* ─── exclude model input per group ─── */
  const [excludeInputs, setExcludeInputs] = useState<Record<number, string>>({});
  const [modelOptions, setModelOptions] = useState<{ value: string; label: string }[]>([]);

  /* ─── group form ─── */
  const [gfName, setGfName] = useState('');
  const [gfDesc, setGfDesc] = useState('');
  const [gfRate, setGfRate] = useState('1.0');
  const [gfSubType, setGfSubType] = useState('standard');
  const [gfRpm, setGfRpm] = useState(0);
  const [gfValidity, setGfValidity] = useState(30);
  const [gfProvider, setGfProvider] = useState('anthropic');
  const [gfProtocols, setGfProtocols] = useState<Record<string, boolean>>({});
  const [gfStrategy, setGfStrategy] = useState('hub_and_spoke');

  /* ─── fetch ─── */
  const fetchAll = useCallback(async () => {
    try {
      const [grpRes, accRes] = await Promise.all([
        groupsApi.list(),
        accountsApi.list(),
      ]);
      const grps = grpRes.data.groups ?? [];
      const accs = accRes.data.accounts ?? [];

      // fetch bindings per group
      const map = new Map<number, Set<number>>();
      await Promise.all(
        grps.map(async (g) => {
          try {
            const { data } = await groupsApi.listAccounts(g.id);
            const ids = (data.accounts ?? []).map((a) => a.accountId);
            ids.forEach((aid) => {
              if (!map.has(aid)) map.set(aid, new Set());
              map.get(aid)!.add(g.id);
            });
          } catch { /* ignore */ }
        }),
      );

      setGroups(grps);
      setAccounts(accs);
      setBindings(map);
    } catch {
      addToast({ type: 'error', message: '加载数据失败' });
    }
  }, [addToast]);

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
    // 拉取模型价格列表，提取唯一模型名作为排除模型下拉选项
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
  }, [fetchAll]);

  /* ─── derive ─── */
  const accountsOfGroup = useCallback(
    (groupId: number) =>
      accounts.filter((a) => bindings.get(a.id)?.has(groupId)),
    [accounts, bindings],
  );

  /* ─── group CRUD ─── */
  const openCreateGroup = () => {
    setEditTarget(null);
    setGfName('');
    setGfDesc('');
    setGfRate('1.0');
    setGfSubType('standard');
    setGfRpm(0);
    setGfValidity(30);
    setGfProvider('anthropic');
    setGfProtocols({});
    setGfStrategy('hub_and_spoke');
    setGroupModal(true);
  };

  const openEditGroup = (g: Group) => {
    setEditTarget(g);
    setGfName(g.name);
    setGfDesc(g.description ?? '');
    setGfRate(String(g.rateMultiplier ?? 1.0));
    setGfSubType(g.subscriptionType ?? 'standard');
    setGfRpm(g.rpmLimit ?? 0);
    setGfValidity(g.defaultValidityDays ?? 30);
    setGfProvider(g.provider ?? 'anthropic');
    const protocols = parseProtocolsArray(g.supportedProtocols);
    const protoState: Record<string, boolean> = {};
    PROTOCOL_OPTIONS.forEach((p) => { protoState[p.value] = protocols.includes(p.value); });
    setGfProtocols(protoState);
    setGfStrategy(g.protocolStrategy ?? 'hub_and_spoke');
    setGroupModal(true);
  };

  const saveGroup = async () => {
    if (!gfName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: gfName.trim(),
        description: gfDesc,
        rateMultiplier: Number(gfRate) || 1.0,
        subscriptionType: gfSubType,
        rpmLimit: gfRpm,
        defaultValidityDays: gfValidity,
        provider: gfProvider,
        supportedProtocols: JSON.stringify(PROTOCOL_OPTIONS.filter((p) => gfProtocols[p.value]).map((p) => p.value)),
        protocolStrategy: gfStrategy,
      };
      if (editTarget) {
        await groupsApi.update(editTarget.id, payload);
        addToast({ type: 'success', message: '分组已更新' });
      } else {
        await groupsApi.create(payload);
        addToast({ type: 'success', message: '分组已创建' });
      }
      setGroupModal(false);
      fetchAll();
    } catch {
      addToast({ type: 'error', message: '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async () => {
    if (!deleteTarget) return;
    try {
      await groupsApi.delete(deleteTarget.id);
      addToast({ type: 'success', message: '分组已删除' });
      setDeleteTarget(null);
      fetchAll();
    } catch {
      addToast({ type: 'error', message: '删除失败' });
    }
  };

  /* ─── account bind ─── */
  const openBind = (groupId: number) => {
    setBindGroupId(groupId);
    setBindAccountId('');
    setBindPriority('50');
    setBindModal(true);
  };

  const saveBind = async () => {
    const aid = Number(bindAccountId);
    if (!aid || bindGroupId == null) return;
    setBinding(true);
    try {
      await groupsApi.bindAccount(bindGroupId, aid, Number(bindPriority) || 50);
      addToast({ type: 'success', message: '账号已绑定' });
      setBindModal(false);
      fetchAll();
    } catch {
      addToast({ type: 'error', message: '绑定失败' });
    } finally {
      setBinding(false);
    }
  };

  const unbindAccount = async (groupId: number, accountId: number) => {
    try {
      await groupsApi.unbindAccount(groupId, accountId);
      addToast({ type: 'success', message: '已解绑' });
      fetchAll();
    } catch {
      addToast({ type: 'error', message: '解绑失败' });
    }
  };

  /* ─── excluded models ─── */
  const parseExcludedModels = (g: Group): string[] => {
    try {
      if (!g.excludedModels) return [];
      const arr = JSON.parse(g.excludedModels);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  };

  const addExcludedModel = async (groupId: number, model: string) => {
    const trimmed = model.trim();
    if (!trimmed) return;
    const g = groups.find((grp) => grp.id === groupId);
    if (!g) return;
    const current = parseExcludedModels(g);
    if (current.includes(trimmed)) return;
    const updated = JSON.stringify([...current, trimmed]);
    // optimistic update
    setGroups((prev) =>
      prev.map((grp) => (grp.id === groupId ? { ...grp, excludedModels: updated } : grp)),
    );
    setExcludeInputs((prev) => ({ ...prev, [groupId]: '' }));
    try {
      await groupsApi.update(groupId, { excludedModels: updated });
      addToast({ type: 'success', message: `已排除模型: ${trimmed}` });
    } catch {
      setGroups((prev) =>
        prev.map((grp) => (grp.id === groupId ? { ...grp, excludedModels: g.excludedModels ?? undefined } : grp)),
      );
      addToast({ type: 'error', message: '操作失败' });
    }
  };

  const removeExcludedModel = async (groupId: number, model: string) => {
    const g = groups.find((grp) => grp.id === groupId);
    if (!g) return;
    const current = parseExcludedModels(g);
    const updated = JSON.stringify(current.filter((m) => m !== model));
    // optimistic update
    setGroups((prev) =>
      prev.map((grp) => (grp.id === groupId ? { ...grp, excludedModels: updated } : grp)),
    );
    try {
      await groupsApi.update(groupId, { excludedModels: updated });
      addToast({ type: 'success', message: `已移除排除: ${model}` });
    } catch {
      setGroups((prev) =>
        prev.map((grp) => (grp.id === groupId ? { ...grp, excludedModels: g.excludedModels ?? undefined } : grp)),
      );
      addToast({ type: 'error', message: '操作失败' });
    }
  };

  const routeDrawerGroup = routeDrawerGroupId == null
    ? null
    : groups.find((group) => group.id === routeDrawerGroupId) ?? null;

  /* ─── render ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      {/* header */}
      <div className="rounded-[1.1rem] border border-[#D8D5CC] bg-white/72 px-4 py-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#D8D5CC] bg-white px-2.5 py-1 text-xs font-semibold text-[#59616A] dark:border-white/10 dark:bg-white/[0.04] dark:text-dark-300">
              分组 {groups.length}
            </span>
            <span className="rounded-full border border-[#D8D5CC] bg-white px-2.5 py-1 text-xs font-semibold text-[#59616A] dark:border-white/10 dark:bg-white/[0.04] dark:text-dark-300">
              号池账号 {accounts.length}
            </span>
          </div>
          <Button onClick={openCreateGroup} size="sm">
            <Icon name="plus" size="sm" /> 新建分组
          </Button>
        </div>
      </div>

      {/* rows */}
      <div className="min-w-0 overflow-hidden rounded-[1.2rem] border border-[#D8D5CC] bg-white/78 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
        <div className="divide-y divide-[#D8D5CC] dark:divide-white/10">
        {groups.map((g) => {
          const gAccounts = accountsOfGroup(g.id);
          const excludedModels = parseExcludedModels(g);
          const provider = g.provider ?? 'anthropic';
          const providerCount = new Set(gAccounts.map((account) => account.platform)).size;

          return (
            <div
              key={g.id}
              className="w-full min-w-0 overflow-hidden border-l-[3px] px-4 py-4 transition-[background-color,border-color] hover:bg-[#FAF8F2]/70 dark:hover:bg-white/[0.035] xl:px-5 xl:py-3"
              style={{ borderLeftColor: providerAccent[provider] ?? '#00A6B2' }}
            >
              <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:gap-5">
                <div className="min-w-0 xl:flex-[1.35_1_0]">
                  <div className="flex min-w-0 items-center gap-2">
                    <h3 className="min-w-0 truncate text-sm font-black text-[#101418] dark:text-white">{g.name}</h3>
                    <span className="shrink-0 text-[11px] font-mono text-gray-400 dark:text-dark-500">#{g.id}</span>
                  </div>
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className={`inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-xs font-medium ${platformBadge[provider] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {providerLabel(provider)}
                    </span>
                    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-dark-800 dark:text-dark-300">
                      {subTypeLabel(g.subscriptionType)}
                    </span>
                    <StatusBadge status={g.status ?? 'ACTIVE'} />
                  </div>
                  {g.description && (
                    <p className="mt-1 min-w-0 truncate text-xs text-[#6D737C] dark:text-dark-400">{g.description}</p>
                  )}
                </div>

                <div className="grid min-w-0 grid-cols-3 gap-2 xl:w-[255px] xl:shrink-0">
                  <div className="min-w-0 rounded-xl border border-[#E0DED7] bg-white px-3 py-2 dark:border-white/10 dark:bg-white/[0.035]">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[#6D737C] dark:text-dark-500">倍率</p>
                    <p className="truncate text-sm font-black text-[#101418] dark:text-dark-100">×{g.rateMultiplier ?? 1}</p>
                  </div>
                  <div className="min-w-0 rounded-xl border border-[#E0DED7] bg-white px-3 py-2 dark:border-white/10 dark:bg-white/[0.035]">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[#6D737C] dark:text-dark-500">RPM</p>
                    <p className="truncate text-sm font-black text-[#101418] dark:text-dark-100">{g.rpmLimit && g.rpmLimit > 0 ? g.rpmLimit : '不限'}</p>
                  </div>
                  <div className="min-w-0 rounded-xl border border-[#E0DED7] bg-white px-3 py-2 dark:border-white/10 dark:bg-white/[0.035]">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[#6D737C] dark:text-dark-500">有效期</p>
                    <p className="truncate text-sm font-black text-[#101418] dark:text-dark-100">{g.defaultValidityDays ?? 30}天</p>
                  </div>
                </div>

                <div className="min-w-0 rounded-xl border border-[#E0DED7] bg-[#FBFBFA]/80 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.035] xl:w-[245px] xl:shrink-0">
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <p className="truncate text-xs font-semibold text-[#6D737C] dark:text-dark-500">账号池</p>
                    {excludedModels.length > 0 && (
                      <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-500 dark:bg-red-900/20 dark:text-red-400">
                        排除 {excludedModels.length}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex min-w-0 items-end justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-black text-[#101418] dark:text-dark-100">
                      {gAccounts.length > 0 ? `${gAccounts.length} 个账号` : '未绑定账号'}
                    </p>
                    <span className="shrink-0 text-xs font-semibold text-[#6D737C] dark:text-dark-500">
                      {providerCount > 0 ? `${providerCount} Provider` : '需配置'}
                    </span>
                  </div>
                  {gAccounts.length > 0 && (
                    <div className="mt-2 grid h-1.5 grid-cols-4 gap-1 overflow-hidden rounded-full">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <span
                          key={index}
                          className={index < Math.min(gAccounts.length, 4) ? 'rounded-full bg-[#00A6B2]' : 'rounded-full bg-[#DDE9E3] dark:bg-white/10'}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-2 xl:w-[170px] xl:shrink-0 xl:justify-end">
                  <Button variant="secondary" size="sm" onClick={() => setRouteDrawerGroupId(g.id)}>
                    <Icon name="cog" size="xs" /> 配置
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEditGroup(g)} aria-label={`编辑分组 ${g.name}`}>
                    <Icon name="edit" size="xs" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(g)} aria-label={`删除分组 ${g.name}`}>
                    <Icon name="trash" size="xs" className="text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {groups.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-gray-400 dark:text-dark-500">
            <Icon name="grid" size="xl" className="text-gray-200 dark:text-dark-700" />
            <p className="text-sm">暂无分组，点击右上角"新建分组"开始</p>
          </div>
        )}
        </div>
      </div>

      {/* ═══ Group Create/Edit Modal ═══ */}
      <Modal
        open={groupModal}
        onClose={() => setGroupModal(false)}
        title={editTarget ? '编辑分组' : '创建分组'}
        width="normal"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setGroupModal(false)}>取消</Button>
            <Button onClick={saveGroup} loading={saving}>保存</Button>
          </div>
        }
      >
        <div className="space-y-5">
          <Input label="名称" value={gfName} onChange={(e) => setGfName(e.target.value)} placeholder="输入分组名称" />
          <div>
            <label className="input-label">订阅类型</label>
            <Select options={subTypeOpts} value={gfSubType} onChange={setGfSubType} />
          </div>
          <Input label="描述" value={gfDesc} onChange={(e) => setGfDesc(e.target.value)} placeholder="可选" />

          <fieldset className="border border-gray-200 dark:border-dark-600 rounded-lg p-4">
            <legend className="text-sm font-medium text-gray-700 dark:text-dark-300 px-1">
              Provider 配置
            </legend>
            <div className="mt-1 space-y-3">
              <div>
                <label className="input-label">Provider 阵营</label>
                <Select options={PROVIDER_OPTIONS} value={gfProvider} onChange={setGfProvider} />
              </div>
              <div>
                <label className="input-label">支持的客户端协议</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {PROTOCOL_OPTIONS.map((p) => (
                    <label
                      key={p.value}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                        gfProtocols[p.value]
                          ? 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-600 dark:bg-violet-900/20 dark:text-violet-300'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={gfProtocols[p.value] ?? false}
                        onChange={(e) => setGfProtocols((prev) => ({ ...prev, [p.value]: e.target.checked }))}
                        className="sr-only"
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="input-label">协议转换策略</label>
                <Select options={STRATEGY_OPTIONS} value={gfStrategy} onChange={setGfStrategy} />
                <p className="mt-1 text-xs text-gray-400">Hub & Spoke 允许跨协议智能转换；Native Only 仅接受与上游原生匹配的请求。</p>
              </div>
            </div>
          </fieldset>

          <div className="grid grid-cols-3 gap-3">
            <Input label="费率系数" type="number" value={gfRate} onChange={(e) => setGfRate(e.target.value)} placeholder="1.0" />
            <Input label="RPM 限制" type="number" value={String(gfRpm)} onChange={(e) => setGfRpm(Number(e.target.value) || 0)} placeholder="0" />
            <Input label="默认有效期(天)" type="number" value={String(gfValidity)} onChange={(e) => setGfValidity(Number(e.target.value) || 1)} placeholder="30" />
          </div>
        </div>
      </Modal>

      {/* ═══ Bind Account Modal ═══ */}
      <Modal
        open={bindModal}
        onClose={() => setBindModal(false)}
        title="绑定账号到号池"
        width="normal"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setBindModal(false)}>取消</Button>
            <Button onClick={saveBind} loading={binding} disabled={!bindAccountId}>绑定</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="input-label">选择账号</label>
            <Select
              options={accounts
                .filter((a) => !bindings.get(a.id)?.has(bindGroupId!))
                .map((a) => ({ value: String(a.id), label: `${a.name} (ID:${a.id} | ${a.platform})` }))}
              value={bindAccountId}
              onChange={setBindAccountId}
              placeholder="选择要绑定的账号..."
              searchable
              emptyText="暂无可绑定的账号"
            />
          </div>
          <Input label="优先级" type="number" value={bindPriority} onChange={(e) => setBindPriority(e.target.value)} placeholder="数字越小优先级越高，默认 50" />
        </div>
      </Modal>

      {/* ═══ Route Config Drawer ═══ */}
      <Drawer
        open={!!routeDrawerGroup}
        onClose={() => setRouteDrawerGroupId(null)}
        title={routeDrawerGroup ? `路由配置 — ${routeDrawerGroup.name}` : ''}
        width="lg"
      >
        {routeDrawerGroup && (() => {
          const group = routeDrawerGroup;
          const groupAccounts = accountsOfGroup(group.id);
          const excludedModels = parseExcludedModels(group);

          return (
            <div className="space-y-5">
              <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-dark-700 dark:bg-dark-900">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">账号池</h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-dark-400">当前分组会从这些账号中调度请求。</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => openBind(group.id)}>
                    <Icon name="plus" size="xs" /> 绑定账号
                  </Button>
                </div>

                {groupAccounts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/70 px-4 py-3 text-sm font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
                    未绑定账号
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-dark-700 dark:border-dark-700">
                    {groupAccounts.map((account) => (
                      <div key={account.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${accountDotColor[account.platform] ?? 'bg-gray-300'}`} />
                            <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">{account.name}</span>
                            <span className="shrink-0 text-[11px] font-mono text-gray-400">#{account.id}</span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-dark-400">
                            {account.platform} · {account.type}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => unbindAccount(group.id, account.id)} aria-label={`从 ${group.name} 解绑 ${account.name}`}>
                          <Icon name="x" size="xs" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-dark-700 dark:bg-dark-900">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">排除模型</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-dark-400">这些模型不会被路由到该分组。</p>
                </div>

                <div className="mb-3 flex gap-2">
                  <Select
                    options={modelOptions}
                    value={excludeInputs[group.id] ?? ''}
                    onChange={(v) => setExcludeInputs((prev) => ({ ...prev, [group.id]: v }))}
                    placeholder="选择要排除的模型..."
                    searchable
                    emptyText="无匹配模型"
                    className="min-w-0 flex-1"
                  />
                  <Button variant="secondary" onClick={() => addExcludedModel(group.id, excludeInputs[group.id] ?? '')}>
                    <Icon name="plus" size="sm" /> 添加
                  </Button>
                </div>

                {excludedModels.length === 0 ? (
                  <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:bg-dark-800 dark:text-dark-400">
                    暂无排除模型
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-dark-700 dark:border-dark-700">
                    {excludedModels.map((model) => (
                      <div key={model} className="flex items-center justify-between gap-3 px-4 py-3">
                        <span className="min-w-0 truncate text-sm font-medium text-gray-700 dark:text-dark-300">{model}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeExcludedModel(group.id, model)} aria-label={`取消排除模型 ${model}`}>
                          <Icon name="x" size="xs" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          );
        })()}
      </Drawer>

      {/* ═══ Delete Group Confirm ═══ */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={deleteGroup}
        onCancel={() => setDeleteTarget(null)}
        title="删除分组"
        message={`确定要删除分组 "${deleteTarget?.name}" 吗？相关的账号绑定也会被移除。`}
        confirmText="删除"
        variant="danger"
      />
    </div>
  );
}
