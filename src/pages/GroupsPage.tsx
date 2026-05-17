import { useEffect, useState, useCallback, useMemo } from 'react';
import { groupsApi, type Group } from '../api/admin/groups';
import { modelPricesApi, type ModelPrice } from '../api/admin/model-prices';
import { accountsApi, type Account } from '../api/admin/accounts';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Icon } from '../components/ui/Icon';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useToastStore } from '../stores/toastStore';

/* ─────────────────── helpers ─────────────────── */

const platformOpts = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'antigravity', label: 'Antigravity' },
];

const subTypeOpts = [
  { value: 'standard', label: '标准版（按量计费）' },
  { value: 'subscription', label: '订阅版（按月/年）' },
];

const platformBadge: Record<string, string> = {
  openai: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  anthropic: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  gemini: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  antigravity: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

type EditTarget =
  | { type: 'group'; group: Group }
  | { type: 'price'; price: ModelPrice; groupId: number | null }
  | { type: 'price-create'; groupId: number | null };

export default function GroupsPage() {
  const addToast = useToastStore((s) => s.addToast);

  /* ─── data ─── */
  const [groups, setGroups] = useState<Group[]>([]);
  const [prices, setPrices] = useState<ModelPrice[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  // accountId -> set of groupIds
  const [bindings, setBindings] = useState<Map<number, Set<number>>>(new Map());
  const [loading, setLoading] = useState(true);

  /* ─── expand state ─── */
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  /* ─── delete confirm ─── */
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);

  /* ─── modals ─── */
  const [groupModal, setGroupModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Group | null>(null); // null = create
  const [saving, setSaving] = useState(false);

  const [priceModal, setPriceModal] = useState(false);
  const [priceEdit, setPriceEdit] = useState<EditTarget | null>(null);
  const [priceSaving, setPriceSaving] = useState(false);

  const [bindModal, setBindModal] = useState(false);
  const [bindGroupId, setBindGroupId] = useState<number | null>(null);
  const [bindAccountId, setBindAccountId] = useState('');
  const [bindPriority, setBindPriority] = useState('50');
  const [binding, setBinding] = useState(false);

  /* ─── group form ─── */
  const [gfName, setGfName] = useState('');
  const [gfPlatform, setGfPlatform] = useState('openai');
  const [gfDesc, setGfDesc] = useState('');
  const [gfRate, setGfRate] = useState('1.0');
  const [gfSubType, setGfSubType] = useState('standard');
  const [gfRpm, setGfRpm] = useState(0);
  const [gfValidity, setGfValidity] = useState(30);

  /* ─── price form ─── */
  const [pfModel, setPfModel] = useState('');
  const [pfPlatform, setPfPlatform] = useState('anthropic');
  const [pfInput, setPfInput] = useState('0');
  const [pfOutput, setPfOutput] = useState('0');
  const [pfCacheWrite, setPfCacheWrite] = useState('0');
  const [pfCacheRead, setPfCacheRead] = useState('0');
  const [pfEnabled, setPfEnabled] = useState(true);
  const [pfNotes, setPfNotes] = useState('');

  /* ─── fetch ─── */
  const fetchAll = useCallback(async () => {
    try {
      const [grpRes, priceRes, accRes] = await Promise.all([
        groupsApi.list(),
        modelPricesApi.list(0, 500),
        accountsApi.list(),
      ]);
      const grps = grpRes.data.groups ?? [];
      const prcs = priceRes.data.prices ?? [];
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
      setPrices(prcs);
      setAccounts(accs);
      setBindings(map);
    } catch {
      addToast({ type: 'error', message: '加载数据失败' });
    }
  }, [addToast]);

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  /* ─── derive ─── */
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const pricesByGroup = useMemo(() => {
    const map = new Map<number | null, ModelPrice[]>();
    map.set(null, []);
    for (const p of prices) {
      const key = p.groupId ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [prices]);

  const globalPrices = pricesByGroup.get(null) ?? [];

  const accountsOfGroup = useCallback(
    (groupId: number) =>
      accounts.filter((a) => bindings.get(a.id)?.has(groupId)),
    [accounts, bindings],
  );

  /* ─── group CRUD ─── */
  const openCreateGroup = () => {
    setEditTarget(null);
    setGfName('');
    setGfPlatform('openai');
    setGfDesc('');
    setGfRate('1.0');
    setGfSubType('standard');
    setGfRpm(0);
    setGfValidity(30);
    setGroupModal(true);
  };

  const openEditGroup = (g: Group) => {
    setEditTarget(g);
    setGfName(g.name);
    setGfPlatform(g.platform ?? 'openai');
    setGfDesc(g.description ?? '');
    setGfRate(String(g.rateMultiplier ?? 1.0));
    setGfSubType(g.subscriptionType ?? 'standard');
    setGfRpm(g.rpmLimit ?? 0);
    setGfValidity(g.defaultValidityDays ?? 30);
    setGroupModal(true);
  };

  const saveGroup = async () => {
    if (!gfName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: gfName.trim(),
        platform: gfPlatform,
        description: gfDesc,
        rateMultiplier: Number(gfRate) || 1.0,
        subscriptionType: gfSubType,
        rpmLimit: gfRpm,
        defaultValidityDays: gfValidity,
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

  /* ─── price CRUD ─── */
  const openCreatePrice = (groupId: number | null) => {
    setPriceEdit({ type: 'price-create', groupId });
    setPfModel('');
    setPfPlatform('anthropic');
    setPfInput('0');
    setPfOutput('0');
    setPfCacheWrite('0');
    setPfCacheRead('0');
    setPfEnabled(true);
    setPfNotes('');
    setPriceModal(true);
  };

  const openEditPrice = (price: ModelPrice) => {
    setPriceEdit({ type: 'price', price, groupId: price.groupId ?? null });
    setPfModel(price.model);
    setPfPlatform(price.platform);
    setPfInput(String(price.inputPrice ?? 0));
    setPfOutput(String(price.outputPrice ?? 0));
    setPfCacheWrite(String(price.cacheWritePrice ?? 0));
    setPfCacheRead(String(price.cacheReadPrice ?? 0));
    setPfEnabled(price.enabled ?? true);
    setPfNotes(price.notes ?? '');
    setPriceModal(true);
  };

  const savePrice = async () => {
    if (!pfModel.trim()) return;
    if (!priceEdit) return;
    setPriceSaving(true);
    const payload: Partial<ModelPrice> = {
      model: pfModel.trim(),
      platform: pfPlatform,
      inputPrice: Number(pfInput) || 0,
      outputPrice: Number(pfOutput) || 0,
      cacheWritePrice: Number(pfCacheWrite) || 0,
      cacheReadPrice: Number(pfCacheRead) || 0,
      enabled: pfEnabled,
      notes: pfNotes || undefined,
    };
    if (priceEdit.type === 'price-create') {
      payload.groupId = priceEdit.groupId;
    }
    try {
      if (priceEdit.type === 'price') {
        await modelPricesApi.update(priceEdit.price.id, payload);
        addToast({ type: 'success', message: '价格已更新' });
      } else {
        await modelPricesApi.create(payload);
        addToast({ type: 'success', message: '价格已创建' });
      }
      setPriceModal(false);
      fetchAll();
    } catch {
      addToast({ type: 'error', message: '保存失败' });
    } finally {
      setPriceSaving(false);
    }
  };

  const deletePrice = async (p: ModelPrice) => {
    try {
      await modelPricesApi.delete(p.id);
      addToast({ type: 'success', message: '价格已删除' });
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

  /* ─── render ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div>
      {/* header */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-dark-400">
          共 {groups.length} 个分组 · {prices.length} 个价格 · {accounts.length} 个上游账号
        </p>
        <Button onClick={openCreateGroup}>
          <Icon name="plus" size="sm" /> 新建分组
        </Button>
      </div>

      {/* tree */}
      <div className="space-y-2">
        {groups.map((g) => {
          const open = expanded.has(g.id);
          const gPrices = pricesByGroup.get(g.id) ?? [];
          const gAccounts = accountsOfGroup(g.id);
          const allPrices = [...globalPrices, ...gPrices];

          return (
            <div key={g.id} className="card overflow-hidden">
              {/* ── group header ── */}
              <button
                type="button"
                onClick={() => toggle(g.id)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-gray-50/50 dark:hover:bg-dark-800/50 transition-colors"
              >
                <Icon
                  name={open ? 'chevronDown' : 'chevronRight'}
                  size="sm"
                  className="shrink-0 text-gray-400"
                />
                <span className="font-semibold text-gray-900 dark:text-white">{g.name}</span>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${platformBadge[g.platform ?? ''] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {g.platform ?? '—'}
                </span>
                <span className="text-xs text-gray-400 dark:text-dark-500">
                  倍率 ×{g.rateMultiplier ?? 1}
                </span>
                <span className="text-xs text-gray-400 dark:text-dark-500">
                  {gPrices.length + globalPrices.length} 价格 · {gAccounts.length} 账号
                </span>
                <StatusBadge status={g.status ?? 'ACTIVE'} />
                <div className="ml-auto flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" onClick={() => openEditGroup(g)}>
                    <Icon name="edit" size="xs" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(g)}>
                    <Icon name="trash" size="xs" className="text-red-500" />
                  </Button>
                </div>
              </button>

              {/* ── group children ── */}
              {open && (
                <div className="border-t border-gray-100 dark:border-dark-700">
                  {/* ---- model prices ---- */}
                  <div className="px-5 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-500">
                        💰 模型价格
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => openCreatePrice(g.id)}>
                        <Icon name="plus" size="xs" /> 添加
                      </Button>
                    </div>
                    {allPrices.length === 0 ? (
                      <p className="py-2 text-center text-xs text-gray-300 dark:text-dark-600">
                        暂无 — 点击"添加"或从全局继承
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {allPrices.map((p) => (
                          <div
                            key={p.id}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                              p.groupId === g.id
                                ? 'bg-gray-50 dark:bg-dark-800'
                                : 'bg-gray-50/30 dark:bg-dark-800/30'
                            }`}
                          >
                            <span className="font-medium text-gray-800 dark:text-dark-200 min-w-0 truncate flex-1">
                              {p.model}
                              {p.groupId !== g.id && (
                                <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                                  全局
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-dark-500 w-20 text-right tabular-nums">
                              in ${Number(p.inputPrice ?? 0).toFixed(2)}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-dark-500 w-20 text-right tabular-nums">
                              out ${Number(p.outputPrice ?? 0).toFixed(2)}
                            </span>
                            {p.enabled === false && (
                              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-600">禁用</span>
                            )}
                            {p.groupId === g.id && (
                              <div className="flex items-center gap-1 shrink-0">
                                <Button variant="ghost" size="sm" onClick={() => openEditPrice(p)}>
                                  <Icon name="edit" size="xs" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => deletePrice(p)}>
                                  <Icon name="trash" size="xs" className="text-red-500" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mx-5 border-t border-gray-100 dark:border-dark-700" />

                  {/* ---- accounts ---- */}
                  <div className="px-5 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-500">
                        🖥 上游账号
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => openBind(g.id)}>
                        <Icon name="plus" size="xs" /> 绑定
                      </Button>
                    </div>
                    {gAccounts.length === 0 ? (
                      <p className="py-2 text-center text-xs text-gray-300 dark:text-dark-600">
                        暂无 — 点击"绑定"关联上游账号
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {gAccounts.map((a) => (
                          <div key={a.id} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-dark-800">
                            <span className="font-medium text-gray-800 dark:text-dark-200 min-w-0 truncate flex-1">
                              {a.name}
                            </span>
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${platformBadge[a.platform] ?? 'bg-gray-100 text-gray-600'}`}>
                              {a.platform}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-dark-500">
                              {a.type} · 并发 {a.concurrency ?? 3}
                            </span>
                            <StatusBadge status={a.status} />
                            <Button variant="ghost" size="sm" onClick={() => unbindAccount(g.id, a.id)}>
                              <Icon name="x" size="xs" className="text-red-400" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
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
        <div className="space-y-4">
          <Input label="名称" value={gfName} onChange={(e) => setGfName(e.target.value)} placeholder="输入分组名称" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">平台</label>
              <Select options={platformOpts} value={gfPlatform} onChange={setGfPlatform} />
            </div>
            <div>
              <label className="input-label">订阅类型</label>
              <Select options={subTypeOpts} value={gfSubType} onChange={setGfSubType} />
            </div>
          </div>
          <Input label="描述" value={gfDesc} onChange={(e) => setGfDesc(e.target.value)} placeholder="可选" />
          <div className="grid grid-cols-3 gap-3">
            <Input label="费率系数" type="number" value={gfRate} onChange={(e) => setGfRate(e.target.value)} placeholder="1.0" />
            <Input label="RPM 限制" type="number" value={String(gfRpm)} onChange={(e) => setGfRpm(Number(e.target.value) || 0)} placeholder="0" />
            <Input label="默认有效期(天)" type="number" value={String(gfValidity)} onChange={(e) => setGfValidity(Number(e.target.value) || 1)} placeholder="30" />
          </div>
        </div>
      </Modal>

      {/* ═══ Price Create/Edit Modal ═══ */}
      <Modal
        open={priceModal}
        onClose={() => setPriceModal(false)}
        title={priceEdit?.type === 'price' ? '编辑模型价格' : '添加模型价格'}
        width="normal"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setPriceModal(false)}>取消</Button>
            <Button onClick={savePrice} loading={priceSaving}>保存</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="模型标识" value={pfModel} onChange={(e) => setPfModel(e.target.value)} placeholder="例如 claude-sonnet-4-20250514" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">平台</label>
              <Select options={platformOpts} value={pfPlatform} onChange={setPfPlatform} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={pfEnabled} onChange={(e) => setPfEnabled(e.target.checked)} className="checkbox" />
                <span className="text-sm text-gray-600 dark:text-dark-400">启用</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="输入价格 ($/M tokens)" type="number" value={pfInput} onChange={(e) => setPfInput(e.target.value)} placeholder="0" />
            <Input label="输出价格 ($/M tokens)" type="number" value={pfOutput} onChange={(e) => setPfOutput(e.target.value)} placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Cache 写入 ($/M)" type="number" value={pfCacheWrite} onChange={(e) => setPfCacheWrite(e.target.value)} placeholder="0" />
            <Input label="Cache 读取 ($/M)" type="number" value={pfCacheRead} onChange={(e) => setPfCacheRead(e.target.value)} placeholder="0" />
          </div>
          <Input label="备注" value={pfNotes} onChange={(e) => setPfNotes(e.target.value)} placeholder="可选" />
        </div>
      </Modal>

      {/* ═══ Bind Account Modal ═══ */}
      <Modal
        open={bindModal}
        onClose={() => setBindModal(false)}
        title="绑定上游账号"
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
              placeholder="选择要绑定的上游账号..."
              searchable
              emptyText="暂无可绑定的账号"
            />
          </div>
          <Input label="优先级" type="number" value={bindPriority} onChange={(e) => setBindPriority(e.target.value)} placeholder="数字越小优先级越高，默认 50" />
        </div>
      </Modal>

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
