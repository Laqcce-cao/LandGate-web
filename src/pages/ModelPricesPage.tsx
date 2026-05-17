import { useEffect, useState, useCallback } from 'react';
import { modelPricesApi, type ModelPrice } from '../api/admin/model-prices';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Toggle } from '../components/ui/Toggle';
import { DataTable } from '../components/ui/DataTable';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Icon } from '../components/ui/Icon';
import { useToastStore } from '../stores/toastStore';

const PLATFORM_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'antigravity', label: 'Antigravity' },
];

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
  const [formPlatform, setFormPlatform] = useState('openai');
  const [formInputPrice, setFormInputPrice] = useState('0');
  const [formOutputPrice, setFormOutputPrice] = useState('0');
  const [formCacheWritePrice, setFormCacheWritePrice] = useState('0');
  const [formCacheReadPrice, setFormCacheReadPrice] = useState('0');
  const [formGroupId, setFormGroupId] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);
  const [formNotes, setFormNotes] = useState('');

  const fetchPrices = useCallback(async () => {
    try {
      const { data } = await modelPricesApi.list();
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
    setFormPlatform('openai');
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
        notes: formNotes,
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

  const formatPrice = (val: unknown) => {
    const n = Number(val ?? 0);
    return n === 0 ? '—' : `$${n.toFixed(4)}`;
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'model', label: '模型' },
    { key: 'platform', label: '平台' },
    {
      key: 'inputPrice',
      label: '输入价格 ($/M)',
      formatter: formatPrice,
    },
    {
      key: 'outputPrice',
      label: '输出价格 ($/M)',
      formatter: formatPrice,
    },
    {
      key: 'cacheWritePrice',
      label: '缓存写入 ($/M)',
      formatter: formatPrice,
    },
    {
      key: 'cacheReadPrice',
      label: '缓存读取 ($/M)',
      formatter: formatPrice,
    },
    {
      key: 'groupId',
      label: '分组',
      formatter: (val: unknown) => (val != null ? `ID:${val}` : '全局'),
    },
    {
      key: 'enabled',
      label: '启用',
      formatter: (_: unknown, row: ModelPrice) => (
        <Toggle checked={row.enabled ?? true} onChange={() => handleToggleEnabled(row)} />
      ),
    },
    {
      key: 'actions',
      label: '操作',
      formatter: (_: unknown, row: ModelPrice) => (
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

  return (
    <div>
      <div className="card">
        <DataTable columns={columns} data={prices} loading={loading} />
      </div>

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
          <Input label="模型名称" value={formModel} onChange={(e) => setFormModel(e.target.value)} placeholder="如 gpt-4o, claude-sonnet-4-20250514" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">平台</label>
              <Select options={PLATFORM_OPTIONS} value={formPlatform} onChange={setFormPlatform} />
            </div>
            <Input label="分组 ID" type="number" value={formGroupId} onChange={(e) => setFormGroupId(e.target.value)} placeholder="留空 = 全局价格" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="输入价格 ($/M tokens)" type="number" value={formInputPrice} onChange={(e) => setFormInputPrice(e.target.value)} placeholder="0" />
            <Input label="输出价格 ($/M tokens)" type="number" value={formOutputPrice} onChange={(e) => setFormOutputPrice(e.target.value)} placeholder="0" />
            <Input label="缓存写入价格 ($/M tokens)" type="number" value={formCacheWritePrice} onChange={(e) => setFormCacheWritePrice(e.target.value)} placeholder="0" />
            <Input label="缓存读取价格 ($/M tokens)" type="number" value={formCacheReadPrice} onChange={(e) => setFormCacheReadPrice(e.target.value)} placeholder="0" />
          </div>

          <div className="flex items-center gap-3">
            <Toggle checked={formEnabled} onChange={setFormEnabled} label="启用" />
          </div>

          <Input label="备注" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="可选" />
        </div>
      </Modal>

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
