import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupsApi, type Group } from '../api/admin/groups';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DataTable } from '../components/ui/DataTable';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Icon } from '../components/ui/Icon';
import { useToastStore } from '../stores/toastStore';

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Group | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  const [formName, setFormName] = useState('');
  const [formPlatform, setFormPlatform] = useState('openai');
  const [formDesc, setFormDesc] = useState('');
  const [formRateMultiplier, setFormRateMultiplier] = useState('1.0');
  const [formSubscriptionType, setFormSubscriptionType] = useState('standard');
  const [formRpmLimit, setFormRpmLimit] = useState(0);
  const [formDefaultValidityDays, setFormDefaultValidityDays] = useState(30);

  const fetchGroups = useCallback(async () => {
    try {
      const { data } = await groupsApi.list();
      setGroups(data.groups ?? []);
    } catch {
      addToast({ type: 'error', message: '加载分组失败' });
    }
  }, [addToast]);

  useEffect(() => {
    fetchGroups().finally(() => setLoading(false));
  }, [fetchGroups]);

  const resetForm = () => {
    setEditTarget(null);
    setFormName('');
    setFormPlatform('openai');
    setFormDesc('');
    setFormRateMultiplier('1.0');
    setFormSubscriptionType('standard');
    setFormRpmLimit(0);
    setFormDefaultValidityDays(30);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (g: Group) => {
    setEditTarget(g);
    setFormName(g.name);
    setFormPlatform(g.platform ?? 'openai');
    setFormDesc(g.description ?? '');
    setFormRateMultiplier(String(g.rateMultiplier ?? 1.0));
    setFormSubscriptionType(g.subscriptionType ?? 'standard');
    setFormRpmLimit(g.rpmLimit ?? 0);
    setFormDefaultValidityDays(g.defaultValidityDays ?? 30);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        platform: formPlatform,
        description: formDesc,
        rateMultiplier: Number(formRateMultiplier) || 1.0,
        subscriptionType: formSubscriptionType,
        rpmLimit: formRpmLimit,
        defaultValidityDays: formDefaultValidityDays,
      };
      if (editTarget) {
        await groupsApi.update(editTarget.id, payload);
        addToast({ type: 'success', message: '分组已更新' });
      } else {
        await groupsApi.create(payload);
        addToast({ type: 'success', message: '分组已创建' });
      }
      setModalOpen(false);
      fetchGroups();
    } catch {
      addToast({ type: 'error', message: '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await groupsApi.delete(deleteTarget.id);
      addToast({ type: 'success', message: '分组已删除' });
      setDeleteTarget(null);
      fetchGroups();
    } catch {
      addToast({ type: 'error', message: '删除失败' });
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: '名称' },
    { key: 'platform', label: '平台' },
    {
      key: 'subscriptionType',
      label: '订阅类型',
      formatter: (val: unknown) => {
        const v = String(val ?? 'STANDARD');
        return v === 'subscription' ? '订阅版' : '标准版';
      },
    },
    {
      key: 'description',
      label: '描述',
      formatter: (val: unknown) => (
        <span className="text-sm text-gray-500 dark:text-dark-400 line-clamp-1">
          {String(val ?? '—')}
        </span>
      ),
    },
    {
      key: 'status',
      label: '状态',
      formatter: (val: unknown) => <StatusBadge status={String(val ?? 'ACTIVE')} />,
    },
    {
      key: 'actions',
      label: '操作',
      formatter: (_: unknown, row: Group) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/groups/${row.id}`)}>
            <Icon name="cog" size="sm" />
            管理
          </Button>
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

  const subscriptionTypeOptions = [
    { value: 'standard', label: '标准版（按量计费）' },
    { value: 'subscription', label: '订阅版（按月/年）' },
  ];

  return (
    <div>
      <PageHeader
        title="分组管理"
        description="管理访问控制分组"
        actions={
          <Button onClick={openCreate}>
            <Icon name="plus" size="sm" />
            创建分组
          </Button>
        }
      />

      <div className="card">
        <DataTable columns={columns} data={groups} loading={loading} />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? '编辑分组' : '创建分组'}
        width="normal"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={handleSave} loading={saving}>保存</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="名称" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="输入分组名称" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">平台</label>
              <Select options={platformOptions} value={formPlatform} onChange={setFormPlatform} />
            </div>
            <div>
              <label className="input-label">订阅类型</label>
              <Select options={subscriptionTypeOptions} value={formSubscriptionType} onChange={setFormSubscriptionType} />
            </div>
          </div>

          <Input label="描述" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="可选" />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="费率系数"
              type="number"
              value={formRateMultiplier}
              onChange={(e) => setFormRateMultiplier(e.target.value)}
              placeholder="1.0"
            />
            <Input
              label="RPM 限制"
              type="number"
              value={String(formRpmLimit)}
              onChange={(e) => setFormRpmLimit(Number(e.target.value) || 0)}
              placeholder="0 = 不限制"
            />
            <Input
              label="默认有效期(天)"
              type="number"
              value={String(formDefaultValidityDays)}
              onChange={(e) => setFormDefaultValidityDays(Number(e.target.value) || 1)}
              placeholder="30"
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="删除分组"
        message={`确定要删除分组 "${deleteTarget?.name}" 吗？`}
        confirmText="删除"
        variant="danger"
      />
    </div>
  );
}
