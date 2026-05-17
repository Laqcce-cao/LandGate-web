import { useEffect, useState, useCallback } from 'react';
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

const PLATFORM_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'antigravity', label: 'Antigravity' },
];

const platformBadge: Record<string, string> = {
  openai: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  anthropic: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  gemini: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  antigravity: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function ModelPricesPage() {
  const [prices, setPrices] = useState<ModelPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ModelPrice | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ModelPrice | null>(null);
  const addToast = useToastStore((s) => s.addToast);

  // Form
  const [formModel, setFormModel] = useState('');
  const [formPlatform, setFormPlatform] = useState('anthropic');
  const [formInputPrice, setFormInputPrice] = useState('0');
  const [formOutputPrice, setFormOutputPrice] = useState('0');
  const [formCacheWritePrice, setFormCacheWritePrice] = useState('0');
  const [formCacheReadPrice, setFormCacheReadPrice] = useState('0');
  const [formGroupId, setFormGroupId] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);
  const [formNotes, setFormNotes] = useState('');

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

  const openCreate = () => {
    setEditTarget(null);
    setFormModel('');
    setFormPlatform('anthropic');
    setFormInputPrice('0');
    setFormOutputPrice('0');
    setFormCacheWritePrice('0');
    setFormCacheReadPrice('0');
    setFormGroupId('');
    setFormEnabled(true);
    setFormNotes('');
    setModalOpen(true);
  };

  const openEdit = (p: ModelPrice) => {
    setEditTarget(p);
    setFormModel(p.model);
    setFormPlatform(p.platform);
    setFormInputPrice(String(p.inputPrice ?? 0));
    setFormOutputPrice(String(p.outputPrice ?? 0));
    setFormCacheWritePrice(String(p.cacheWritePrice ?? 0));
    setFormCacheReadPrice(String(p.cacheReadPrice ?? 0));
    setFormGroupId(p.groupId != null ? String(p.groupId) : '');
    setFormEnabled(p.enabled ?? true);
    setFormNotes(p.notes ?? '');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formModel.trim()) return;
    setSaving(true);
    try {
      const payload = {
        model: formModel.trim(),
        platform: formPlatform,
        inputPrice: Number(formInputPrice) || 0,
        outputPrice: Number(formOutputPrice) || 0,
        cacheWritePrice: Number(formCacheWritePrice) || 0,
        cacheReadPrice: Number(formCacheReadPrice) || 0,
        groupId: formGroupId ? Number(formGroupId) : null,
        enabled: formEnabled,
        notes: formNotes || undefined,
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

  const fmtPrice = (val: unknown) => {
    const n = Number(val ?? 0);
    if (n === 0) return <span className="text-gray-300 dark:text-dark-600">—</span>;
    return <span className="tabular-nums">${n.toFixed(2)}</span>;
  };

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
          共 {prices.length} 个模型价格
        </p>
        <Button onClick={openCreate}>
          <Icon name="plus" size="sm" /> 新增价格
        </Button>
      </div>

      {/* table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-dark-700">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-500">
                  模型
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-500">
                  平台
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-500">
                  分组
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-500">
                  输入 <span className="font-normal text-gray-300 dark:text-dark-600">$/M</span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-500">
                  输出 <span className="font-normal text-gray-300 dark:text-dark-600">$/M</span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-500">
                  缓存写 <span className="font-normal text-gray-300 dark:text-dark-600">$/M</span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-500">
                  缓存读 <span className="font-normal text-gray-300 dark:text-dark-600">$/M</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-500">
                  备注
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-500 w-16">
                  启用
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-500 w-20">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {prices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-16 text-center">
                    <Icon name="grid" size="xl" className="mx-auto mb-3 text-gray-200 dark:text-dark-700" />
                    <p className="text-sm text-gray-400 dark:text-dark-500">暂无模型价格</p>
                  </td>
                </tr>
              ) : (
                prices.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-50 dark:border-dark-800/50 hover:bg-gray-50/50 dark:hover:bg-dark-800/30 transition-colors"
                  >
                    {/* 模型 */}
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-gray-900 dark:text-white">{p.model}</span>
                    </td>

                    {/* 平台 */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${platformBadge[p.platform] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                      >
                        {p.platform}
                      </span>
                    </td>

                    {/* 分组 */}
                    <td className="px-4 py-3.5">
                      {p.groupId != null ? (
                        <span className="text-xs text-gray-500 dark:text-dark-400">ID:{p.groupId}</span>
                      ) : (
                        <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                          全局
                        </span>
                      )}
                    </td>

                    {/* 输入价格 */}
                    <td className="px-4 py-3.5 text-right">{fmtPrice(p.inputPrice)}</td>

                    {/* 输出价格 */}
                    <td className="px-4 py-3.5 text-right">{fmtPrice(p.outputPrice)}</td>

                    {/* 缓存写 */}
                    <td className="px-4 py-3.5 text-right">{fmtPrice(p.cacheWritePrice)}</td>

                    {/* 缓存读 */}
                    <td className="px-4 py-3.5 text-right">{fmtPrice(p.cacheReadPrice)}</td>

                    {/* 备注 */}
                    <td className="px-4 py-3.5 max-w-[120px]">
                      <span className="truncate block text-xs text-gray-400 dark:text-dark-500">
                        {p.notes || '—'}
                      </span>
                    </td>

                    {/* 启用 */}
                    <td className="px-4 py-3.5">
                      <div className="flex justify-center">
                        <Toggle checked={p.enabled ?? true} onChange={() => handleToggleEnabled(p)} />
                      </div>
                    </td>

                    {/* 操作 */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                          <Icon name="edit" size="xs" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(p)}>
                          <Icon name="trash" size="xs" className="text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ Create/Edit Modal ═══ */}
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
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="模型名称" value={formModel} onChange={(e) => setFormModel(e.target.value)} placeholder="如 gpt-4o, claude-sonnet-4" />
            <div>
              <label className="input-label">平台</label>
              <Select options={PLATFORM_OPTIONS} value={formPlatform} onChange={setFormPlatform} />
            </div>
          </div>

          <Input label="分组 ID" type="number" value={formGroupId} onChange={(e) => setFormGroupId(e.target.value)} placeholder="留空 = 全局价格" />

          <div className="grid grid-cols-2 gap-3">
            <Input label="输入价格 ($/M tokens)" type="number" value={formInputPrice} onChange={(e) => setFormInputPrice(e.target.value)} placeholder="0" />
            <Input label="输出价格 ($/M tokens)" type="number" value={formOutputPrice} onChange={(e) => setFormOutputPrice(e.target.value)} placeholder="0" />
            <Input label="缓存写入 ($/M tokens)" type="number" value={formCacheWritePrice} onChange={(e) => setFormCacheWritePrice(e.target.value)} placeholder="0" />
            <Input label="缓存读取 ($/M tokens)" type="number" value={formCacheReadPrice} onChange={(e) => setFormCacheReadPrice(e.target.value)} placeholder="0" />
          </div>

          <div className="flex items-center gap-3">
            <Toggle checked={formEnabled} onChange={setFormEnabled} label="启用" />
          </div>

          <Input label="备注" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="可选" />
        </div>
      </Modal>

      {/* ═══ Delete Confirm ═══ */}
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
