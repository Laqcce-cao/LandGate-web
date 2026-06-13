import { useEffect, useState, useCallback, useMemo } from 'react';
import { modelPricesApi, type ModelPrice } from '../api/admin/model-prices';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Toggle } from '../components/ui/Toggle';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Icon } from '../components/ui/Icon';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useToastStore } from '../stores/toastStore';

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------
const BILLING_MODE_OPTIONS = [
  { value: 'token', label: 'Token 计费' },
  { value: 'per_request', label: '按次计费' },
  { value: 'image', label: '图片计费' },
];

const IMAGE_SIZE_OPTIONS = [
  { value: '', label: '不区分尺寸' },
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
];

const billingModeBadge: Record<string, string> = {
  token: 'bg-gray-50 text-gray-600 dark:bg-dark-800 dark:text-dark-400',
  per_request: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  image: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
};

const fmtPrice = (val: unknown) => {
  const n = Number(val ?? 0);
  if (n === 0) return <span className="text-gray-300 dark:text-dark-600">—</span>;
  return <span className="tabular-nums">${n.toFixed(2)}</span>;
};

// ---------------------------------------------------------------------------

export default function ModelPricesPage() {
  const [prices, setPrices] = useState<ModelPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ModelPrice | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ModelPrice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const addToast = useToastStore((s) => s.addToast);

  // ---- 表单状态 ----
  const [formModel, setFormModel] = useState('');
  const [formInputPrice, setFormInputPrice] = useState('0');
  const [formOutputPrice, setFormOutputPrice] = useState('0');
  const [formCacheWritePrice, setFormCacheWritePrice] = useState('0');
  const [formCacheReadPrice, setFormCacheReadPrice] = useState('0');
  const [formCacheWrite5mPrice, setFormCacheWrite5mPrice] = useState('0');
  const [formCacheWrite1hPrice, setFormCacheWrite1hPrice] = useState('0');
  const [formSupportsCacheBreakdown, setFormSupportsCacheBreakdown] = useState(false);
  const [formEnabled, setFormEnabled] = useState(true);
  const [formNotes, setFormNotes] = useState('');
  const [formCacheExpanded, setFormCacheExpanded] = useState(false);
  const [formBillingMode, setFormBillingMode] = useState('token');
  const [formWildcardMatch, setFormWildcardMatch] = useState(false);
  const [formImageSize, setFormImageSize] = useState('');

  const fetchPrices = useCallback(async () => {
    try {
      const { data } = await modelPricesApi.list(0, 500);
      setPrices(data.prices ?? []);
    } catch {
      addToast({ type: 'error', message: '加载模型价格失败' });
    }
  }, [addToast]);

  useEffect(() => {
    fetchPrices().finally(() => setLoading(false));
  }, [fetchPrices]);

  // ---- 客户端过滤 ----
  const filteredPrices = useMemo(() => {
    return prices.filter((p) => {
      if (searchQuery && !p.model.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [prices, searchQuery]);

  // ---- 判断是否有缓存价格需要展示 ----
  const hasCachePrice = (p: ModelPrice) => {
    return (p.cacheWritePrice ?? 0) !== 0
      || (p.cacheReadPrice ?? 0) !== 0
      || (p.cacheWrite5mPrice ?? 0) !== 0
      || (p.cacheWrite1hPrice ?? 0) !== 0;
  };

  // ---- CRUD 操作 ----
  const openCreate = () => {
    setEditTarget(null);
    setFormModel('');
    setFormInputPrice('0');
    setFormOutputPrice('0');
    setFormCacheWritePrice('0');
    setFormCacheReadPrice('0');
    setFormCacheWrite5mPrice('0');
    setFormCacheWrite1hPrice('0');
    setFormSupportsCacheBreakdown(false);
    setFormEnabled(true);
    setFormNotes('');
    setFormCacheExpanded(false);
    setFormBillingMode('token');
    setFormWildcardMatch(false);
    setFormImageSize('');
    setModalOpen(true);
  };

  const openEdit = (p: ModelPrice) => {
    setEditTarget(p);
    setFormModel(p.model);
    setFormInputPrice(String(p.inputPrice ?? 0));
    setFormOutputPrice(String(p.outputPrice ?? 0));
    setFormCacheWritePrice(String(p.cacheWritePrice ?? 0));
    setFormCacheReadPrice(String(p.cacheReadPrice ?? 0));
    setFormCacheWrite5mPrice(String(p.cacheWrite5mPrice ?? 0));
    setFormCacheWrite1hPrice(String(p.cacheWrite1hPrice ?? 0));
    setFormSupportsCacheBreakdown(p.supportsCacheBreakdown ?? false);
    setFormEnabled(p.enabled ?? true);
    setFormNotes(p.notes ?? '');
    setFormBillingMode(p.billingMode ?? 'token');
    setFormWildcardMatch(p.wildcardMatch ?? false);
    setFormImageSize(p.imageSize ?? '');
    // 如果编辑的价格有缓存数据，默认展开缓存区域
    setFormCacheExpanded(
      (p.cacheWritePrice ?? 0) !== 0 || (p.cacheReadPrice ?? 0) !== 0
      || (p.cacheWrite5mPrice ?? 0) !== 0 || (p.cacheWrite1hPrice ?? 0) !== 0
    );
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formModel.trim()) return;
    setSaving(true);
    try {
      const payload = {
        model: formModel.trim(),
        inputPrice: Number(formInputPrice) || 0,
        outputPrice: Number(formOutputPrice) || 0,
        cacheWritePrice: Number(formCacheWritePrice) || 0,
        cacheReadPrice: Number(formCacheReadPrice) || 0,
        cacheWrite5mPrice: Number(formCacheWrite5mPrice) || 0,
        cacheWrite1hPrice: Number(formCacheWrite1hPrice) || 0,
        supportsCacheBreakdown: formSupportsCacheBreakdown,
        enabled: formEnabled,
        notes: formNotes || undefined,
        billingMode: formBillingMode,
        wildcardMatch: formWildcardMatch,
        imageSize: formImageSize || undefined,
      };
      if (editTarget) {
        await modelPricesApi.update(editTarget.id, payload);
        addToast({ type: 'success', message: '价格已更新' });
      } else {
        await modelPricesApi.create(payload);
        addToast({ type: 'success', message: '价格已创建' });
      }
      setModalOpen(false);
      fetchPrices();
    } catch {
      addToast({ type: 'error', message: '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (price: ModelPrice) => {
    try {
      await modelPricesApi.update(price.id, { enabled: !price.enabled });
      addToast({ type: 'success', message: '状态已更新' });
      fetchPrices();
    } catch {
      addToast({ type: 'error', message: '更新失败' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await modelPricesApi.delete(deleteTarget.id);
      addToast({ type: 'success', message: '价格已删除' });
      setDeleteTarget(null);
      fetchPrices();
    } catch {
      addToast({ type: 'error', message: '删除失败' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-x-hidden">
      {/* ── header ── */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="shrink-0 text-sm font-medium text-[#6D737C] dark:text-dark-400">
          共 {filteredPrices.length} 个模型价格
        </p>
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索模型名称..."
          />
        </div>
        <Button onClick={openCreate}>
          <Icon name="plus" size="sm" /> 新增价格
        </Button>
      </div>

      {/* ── mobile rows ── */}
      <div className="space-y-2 md:hidden">
        {filteredPrices.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 py-16 text-center">
            <Icon name="grid" size="xl" className="text-gray-200 dark:text-dark-700" />
            <p className="text-sm text-gray-400 dark:text-dark-500">
              {searchQuery ? '无匹配的模型价格' : '暂无模型价格'}
            </p>
          </div>
        ) : filteredPrices.map((p) => {
          const showCache = hasCachePrice(p);
          return (
            <div key={p.id} className="rounded-[1.1rem] border border-[#D8D5CC] bg-white/78 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="max-w-full truncate text-left text-sm font-semibold text-gray-900 transition-colors hover:text-violet-600 dark:text-white"
                  >
                    {p.model}
                  </button>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${billingModeBadge[p.billingMode ?? 'token'] ?? billingModeBadge.token}`}>
                      {p.billingMode === 'image' ? `图片${p.imageSize ? ` ${p.imageSize}` : ''}` : p.billingMode === 'per_request' ? '按次' : 'Token'}
                    </span>
                    {p.wildcardMatch && (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                        通配
                      </span>
                    )}
                  </div>
                </div>
                <Toggle checked={p.enabled ?? true} onChange={() => handleToggleEnabled(p)} ariaLabel={`${p.model} 启用状态`} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-dark-800">
                  <p className="text-gray-400 dark:text-dark-500">输入</p>
                  <p className="mt-1 font-semibold text-gray-800 dark:text-dark-200">{fmtPrice(p.inputPrice)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-dark-800">
                  <p className="text-gray-400 dark:text-dark-500">输出</p>
                  <p className="mt-1 font-semibold text-gray-800 dark:text-dark-200">{fmtPrice(p.outputPrice)}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-dark-400">
                {showCache ? (
                  <>
                    <span>缓存写 {fmtPrice(p.cacheWritePrice)}</span>
                    <span>缓存读 {fmtPrice(p.cacheReadPrice)}</span>
                    {(p.cacheWrite5mPrice ?? 0) !== 0 && <span>5m {fmtPrice(p.cacheWrite5mPrice)}</span>}
                    {(p.cacheWrite1hPrice ?? 0) !== 0 && <span>1h {fmtPrice(p.cacheWrite1hPrice)}</span>}
                  </>
                ) : (
                  <span className="text-gray-300 dark:text-dark-600">无缓存价格</span>
                )}
                {p.notes && <span className="min-w-0 truncate">备注: {p.notes}</span>}
              </div>

              <div className="mt-3 flex justify-end gap-1 border-t border-[#D8D5CC] pt-3 dark:border-white/10">
                <Button variant="ghost" size="sm" onClick={() => openEdit(p)} aria-label={`编辑价格 ${p.model}`}>
                  <Icon name="edit" size="xs" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(p)} aria-label={`删除价格 ${p.model}`}>
                  <Icon name="trash" size="xs" className="text-red-500" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── table ── */}
      <div className="hidden overflow-hidden rounded-[1.2rem] border border-[#D8D5CC] bg-white/78 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035] md:block">
        <div className="overflow-x-hidden">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-[#D8D5CC] dark:border-white/10">
                <th className="w-[34%] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-500">
                  模型
                </th>
                <th className="w-[18%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-500">
                  计费模式
                </th>
                <th className="w-[16%] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-500">
                  输入 <span className="font-normal text-gray-300 dark:text-dark-600">$/M</span>
                </th>
                <th className="w-[16%] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-500">
                  输出 <span className="font-normal text-gray-300 dark:text-dark-600">$/M</span>
                </th>
                <th className="w-[8%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-500">
                  启用
                </th>
                <th className="w-[8%] px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPrices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <Icon name="grid" size="xl" className="mx-auto mb-3 text-gray-200 dark:text-dark-700" />
                    <p className="text-sm text-gray-400 dark:text-dark-500">
                      {searchQuery ? '无匹配的模型价格' : '暂无模型价格'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPrices.map((p) => {
                  const showCache = hasCachePrice(p);
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-[#D8D5CC] transition-colors last:border-b-0 hover:bg-[#FAF8F2]/70 dark:border-white/10 dark:hover:bg-white/[0.035]"
                    >
                      {/* 模型 */}
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="max-w-full truncate text-left font-black text-[#101418] transition-colors hover:text-[#8A6235] dark:text-white"
                        >
                          {p.model}
                        </button>
                        <div className="mt-1 flex max-w-[520px] flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-dark-400">
                          {showCache ? (
                            <>
                              <span>缓存写 {fmtPrice(p.cacheWritePrice)}</span>
                              <span>缓存读 {fmtPrice(p.cacheReadPrice)}</span>
                              {(p.cacheWrite5mPrice ?? 0) !== 0 && <span>5m {fmtPrice(p.cacheWrite5mPrice)}</span>}
                              {(p.cacheWrite1hPrice ?? 0) !== 0 && <span>1h {fmtPrice(p.cacheWrite1hPrice)}</span>}
                              {p.supportsCacheBreakdown && (
                                <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-600 dark:bg-violet-900/20 dark:text-violet-400">
                                  分层
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-300 dark:text-dark-600">无缓存价格</span>
                          )}
                          {p.notes && (
                            <span className="truncate">备注: {p.notes}</span>
                          )}
                        </div>
                      </td>

                      {/* 计费模式 */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${billingModeBadge[p.billingMode ?? 'token'] ?? billingModeBadge.token}`}
                          >
                            {p.billingMode === 'image' ? `图片${p.imageSize ? ` ${p.imageSize}` : ''}` : p.billingMode === 'per_request' ? '按次' : 'Token'}
                          </span>
                          {p.wildcardMatch && (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                              通配
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 输入价格 */}
                      <td className="px-4 py-3.5 text-right">{fmtPrice(p.inputPrice)}</td>

                      {/* 输出价格 */}
                      <td className="px-4 py-3.5 text-right">{fmtPrice(p.outputPrice)}</td>

                      {/* 启用 */}
                      <td className="px-4 py-3.5">
                        <div className="flex justify-center">
                          <Toggle checked={p.enabled ?? true} onChange={() => handleToggleEnabled(p)} ariaLabel={`${p.model} 启用状态`} />
                        </div>
                      </td>

                      {/* 操作 */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(p)} aria-label={`编辑价格 ${p.model}`}>
                            <Icon name="edit" size="xs" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(p)} aria-label={`删除价格 ${p.model}`}>
                            <Icon name="trash" size="xs" className="text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create/Edit Modal ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? '编辑价格' : '新增价格'}
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
          <fieldset className="border border-gray-200 dark:border-dark-600 rounded-lg p-4">
            <legend className="text-sm font-medium text-gray-700 dark:text-dark-300 px-1">
              基本信息
            </legend>
            <div className="mt-1">
              <label className="input-label">模型名称</label>
              <Input value={formModel} onChange={(e) => setFormModel(e.target.value)} placeholder="如 gpt-4o, claude-sonnet-4" />
            </div>
          </fieldset>

          {/* 基础价格 */}
          <fieldset className="border border-gray-200 dark:border-dark-600 rounded-lg p-4">
            <legend className="text-sm font-medium text-gray-700 dark:text-dark-300 px-1">
              基础价格 <span className="text-gray-400 font-normal">— $/M tokens</span>
            </legend>
            <div className="mt-1 grid grid-cols-2 gap-3">
              <Input label="输入价格" type="number" value={formInputPrice} onChange={(e) => setFormInputPrice(e.target.value)} placeholder="0" />
              <Input label="输出价格" type="number" value={formOutputPrice} onChange={(e) => setFormOutputPrice(e.target.value)} placeholder="0" />
            </div>
          </fieldset>

          {/* 计费模式 */}
          <fieldset className="border border-gray-200 dark:border-dark-600 rounded-lg p-4">
            <legend className="text-sm font-medium text-gray-700 dark:text-dark-300 px-1">
              计费配置
            </legend>
            <div className="mt-1 grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">计费模式</label>
                <Select options={BILLING_MODE_OPTIONS} value={formBillingMode} onChange={setFormBillingMode} />
              </div>
              {formBillingMode === 'image' && (
                <div>
                  <label className="input-label">图片尺寸</label>
                  <Select options={IMAGE_SIZE_OPTIONS} value={formImageSize} onChange={setFormImageSize} />
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Toggle checked={formWildcardMatch} onChange={setFormWildcardMatch} label="启用通配模式" />
            </div>
            {formWildcardMatch && (
              <p className="mt-1 text-xs text-amber-500 dark:text-amber-400">
                开启后将按通配符匹配模型名（如 claude-opus-*）。关闭则为精确匹配。
              </p>
            )}
          </fieldset>

          {/* 缓存价格（可折叠） */}
          <fieldset className="border border-gray-200 dark:border-dark-600 rounded-lg p-4">
            <legend className="text-sm font-medium text-gray-700 dark:text-dark-300 px-1">
              <button
                type="button"
                onClick={() => setFormCacheExpanded(!formCacheExpanded)}
                className="flex items-center gap-1 hover:text-violet-600 transition-colors"
              >
                <Icon name={formCacheExpanded ? 'chevronDown' : 'chevronRight'} size="sm" />
                缓存价格 <span className="text-gray-400 font-normal">— 可选，主要用于 Anthropic</span>
              </button>
            </legend>
            {formCacheExpanded && (
              <div className="mt-2 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input label="缓存写入" type="number" value={formCacheWritePrice} onChange={(e) => setFormCacheWritePrice(e.target.value)} placeholder="0" />
                  <Input label="缓存读取" type="number" value={formCacheReadPrice} onChange={(e) => setFormCacheReadPrice(e.target.value)} placeholder="0" />
                  <Input label="缓存写入(5min)" type="number" value={formCacheWrite5mPrice} onChange={(e) => setFormCacheWrite5mPrice(e.target.value)} placeholder="0" />
                  <Input label="缓存写入(1h)" type="number" value={formCacheWrite1hPrice} onChange={(e) => setFormCacheWrite1hPrice(e.target.value)} placeholder="0" />
                </div>
                <div className="flex items-center gap-3">
                  <Toggle checked={formSupportsCacheBreakdown} onChange={setFormSupportsCacheBreakdown} label="支持缓存分层计费（5min/1h）" />
                </div>
              </div>
            )}
          </fieldset>

          {/* 其他 */}
          <fieldset className="border border-gray-200 dark:border-dark-600 rounded-lg p-4">
            <legend className="text-sm font-medium text-gray-700 dark:text-dark-300 px-1">
              其他
            </legend>
            <div className="mt-1 space-y-3">
              <div className="flex items-center gap-3">
                <Toggle checked={formEnabled} onChange={setFormEnabled} label="启用" />
              </div>
              <Input label="备注" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="可选" />
            </div>
          </fieldset>
        </div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="删除价格"
        message={`确定要删除模型 "${deleteTarget?.model}" 的价格配置吗？`}
        confirmText="删除"
        variant="danger"
      />
    </div>
  );
}
