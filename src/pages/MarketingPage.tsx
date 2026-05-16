import { useEffect, useState, useCallback } from 'react';
import { codesApi, type RedeemCode, type PromoCode } from '../api/admin/codes';
import { announcementsApi, type Announcement } from '../api/admin/announcements';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Toggle } from '../components/ui/Toggle';
import { Tabs } from '../components/ui/Tabs';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Icon } from '../components/ui/Icon';
import { useToastStore } from '../stores/toastStore';

type CodeTab = 'redeem' | 'promo' | 'announcements';

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<CodeTab>('redeem');

  // Redeem codes
  const [redeemCodes, setRedeemCodes] = useState<RedeemCode[]>([]);
  const [redeemLoading, setRedeemLoading] = useState(true);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [editRedeem, setEditRedeem] = useState<RedeemCode | null>(null);
  const [deleteRedeem, setDeleteRedeem] = useState<RedeemCode | null>(null);
  const [redeemSaving, setRedeemSaving] = useState(false);

  // Promo codes
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [promoLoading, setPromoLoading] = useState(true);
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [editPromo, setEditPromo] = useState<PromoCode | null>(null);
  const [deletePromo, setDeletePromo] = useState<PromoCode | null>(null);
  const [promoSaving, setPromoSaving] = useState(false);

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annLoading, setAnnLoading] = useState(true);
  const [annModalOpen, setAnnModalOpen] = useState(false);
  const [editAnn, setEditAnn] = useState<Announcement | null>(null);
  const [deleteAnn, setDeleteAnn] = useState<Announcement | null>(null);
  const [annSaving, setAnnSaving] = useState(false);

  const addToast = useToastStore((s) => s.addToast);

  // Form states for redeem code
  const [rCode, setRCode] = useState('');
  const [rType, setRType] = useState('BALANCE');
  const [rAmount, setRAmount] = useState('');
  const [rMaxUses, setRMaxUses] = useState('');
  const [rEnabled, setREnabled] = useState(true);

  // Form states for promo code
  const [pCode, setPCode] = useState('');
  const [pDiscountType, setPDiscountType] = useState('FIXED');
  const [pDiscountValue, setPDiscountValue] = useState('');
  const [pMaxUses, setPMaxUses] = useState('');
  const [pEnabled, setPEnabled] = useState(true);

  // Form states for announcement
  const [aTitle, setATitle] = useState('');
  const [aContent, setAContent] = useState('');
  const [aType, setAType] = useState('INFO');

  // --- Fetch functions ---
  const fetchRedeem = useCallback(async () => {
    try {
      const { data } = await codesApi.listRedeem();
      setRedeemCodes(data.codes ?? []);
    } catch {
      addToast({ type: 'error', message: '加载兑换码失败' });
    } finally {
      setRedeemLoading(false);
    }
  }, [addToast]);

  const fetchPromo = useCallback(async () => {
    try {
      const { data } = await codesApi.listPromo();
      setPromoCodes(data.codes ?? []);
    } catch {
      addToast({ type: 'error', message: '加载优惠码失败' });
    } finally {
      setPromoLoading(false);
    }
  }, [addToast]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const { data } = await announcementsApi.list();
      setAnnouncements(data.announcements ?? []);
    } catch {
      addToast({ type: 'error', message: '加载公告失败' });
    } finally {
      setAnnLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (activeTab === 'redeem' && redeemLoading) fetchRedeem();
    else if (activeTab === 'promo' && promoLoading) fetchPromo();
    else if (activeTab === 'announcements' && annLoading) fetchAnnouncements();
  }, [activeTab, redeemLoading, promoLoading, annLoading, fetchRedeem, fetchPromo, fetchAnnouncements]);

  // --- Redeem handlers ---
  const openRedeemCreate = () => {
    setEditRedeem(null);
    setRCode('');
    setRType('BALANCE');
    setRAmount('');
    setRMaxUses('');
    setREnabled(true);
    setRedeemModalOpen(true);
  };

  const openRedeemEdit = (c: RedeemCode) => {
    setEditRedeem(c);
    setRCode(c.code);
    setRType(c.type);
    setRAmount(String(c.amount));
    setRMaxUses(String(c.maxUses ?? ''));
    setREnabled(c.enabled);
    setRedeemModalOpen(true);
  };

  const handleRedeemSave = async () => {
    setRedeemSaving(true);
    const payload = {
      code: rCode,
      type: rType,
      amount: Number(rAmount),
      maxUses: rMaxUses ? Number(rMaxUses) : undefined,
      enabled: rEnabled,
    };
    try {
      if (editRedeem) {
        await codesApi.updateRedeem(editRedeem.id, payload);
        addToast({ type: 'success', message: '兑换码已更新' });
      } else {
        await codesApi.createRedeem(payload);
        addToast({ type: 'success', message: '兑换码已创建' });
      }
      setRedeemModalOpen(false);
      setRedeemLoading(true);
      fetchRedeem();
    } catch {
      addToast({ type: 'error', message: '保存失败' });
    } finally {
      setRedeemSaving(false);
    }
  };

  const handleRedeemDelete = async () => {
    if (!deleteRedeem) return;
    try {
      await codesApi.deleteRedeem(deleteRedeem.id);
      addToast({ type: 'success', message: '兑换码已删除' });
      setDeleteRedeem(null);
      setRedeemLoading(true);
      fetchRedeem();
    } catch {
      addToast({ type: 'error', message: '删除失败' });
    }
  };

  // --- Promo handlers ---
  const openPromoCreate = () => {
    setEditPromo(null);
    setPCode('');
    setPDiscountType('FIXED');
    setPDiscountValue('');
    setPMaxUses('');
    setPEnabled(true);
    setPromoModalOpen(true);
  };

  const openPromoEdit = (c: PromoCode) => {
    setEditPromo(c);
    setPCode(c.code);
    setPDiscountType(c.discountType);
    setPDiscountValue(String(c.discountValue));
    setPMaxUses(String(c.maxUses ?? ''));
    setPEnabled(c.enabled);
    setPromoModalOpen(true);
  };

  const handlePromoSave = async () => {
    setPromoSaving(true);
    const payload = {
      code: pCode,
      discountType: pDiscountType,
      discountValue: Number(pDiscountValue),
      maxUses: pMaxUses ? Number(pMaxUses) : undefined,
      enabled: pEnabled,
    };
    try {
      if (editPromo) {
        await codesApi.updatePromo(editPromo.id, payload);
        addToast({ type: 'success', message: '优惠码已更新' });
      } else {
        await codesApi.createPromo(payload);
        addToast({ type: 'success', message: '优惠码已创建' });
      }
      setPromoModalOpen(false);
      setPromoLoading(true);
      fetchPromo();
    } catch {
      addToast({ type: 'error', message: '保存失败' });
    } finally {
      setPromoSaving(false);
    }
  };

  const handlePromoDelete = async () => {
    if (!deletePromo) return;
    try {
      await codesApi.deletePromo(deletePromo.id);
      addToast({ type: 'success', message: '优惠码已删除' });
      setDeletePromo(null);
      setPromoLoading(true);
      fetchPromo();
    } catch {
      addToast({ type: 'error', message: '删除失败' });
    }
  };

  // --- Announcement handlers ---
  const openAnnCreate = () => {
    setEditAnn(null);
    setATitle('');
    setAContent('');
    setAType('INFO');
    setAnnModalOpen(true);
  };

  const openAnnEdit = (a: Announcement) => {
    setEditAnn(a);
    setATitle(a.title);
    setAContent(a.content ?? '');
    setAType(a.type);
    setAnnModalOpen(true);
  };

  const handleAnnSave = async () => {
    setAnnSaving(true);
    const payload = { title: aTitle, content: aContent, type: aType };
    try {
      if (editAnn) {
        await announcementsApi.update(editAnn.id, payload);
        addToast({ type: 'success', message: '公告已更新' });
      } else {
        await announcementsApi.create(payload);
        addToast({ type: 'success', message: '公告已创建' });
      }
      setAnnModalOpen(false);
      setAnnLoading(true);
      fetchAnnouncements();
    } catch {
      addToast({ type: 'error', message: '保存失败' });
    } finally {
      setAnnSaving(false);
    }
  };

  const handleAnnDelete = async () => {
    if (!deleteAnn) return;
    try {
      await announcementsApi.delete(deleteAnn.id);
      addToast({ type: 'success', message: '公告已删除' });
      setDeleteAnn(null);
      setAnnLoading(true);
      fetchAnnouncements();
    } catch {
      addToast({ type: 'error', message: '删除失败' });
    }
  };

  const handlePublish = async (id: number) => {
    try {
      await announcementsApi.publish(id);
      addToast({ type: 'success', message: '已发布' });
      fetchAnnouncements();
    } catch {
      addToast({ type: 'error', message: '发布失败' });
    }
  };

  const handleUnpublish = async (id: number) => {
    try {
      await announcementsApi.unpublish(id);
      addToast({ type: 'success', message: '已取消发布' });
      fetchAnnouncements();
    } catch {
      addToast({ type: 'error', message: '取消发布失败' });
    }
  };

  const redeemColumns = [
    { key: 'id', label: 'ID' },
    { key: 'code', label: '兑换码' },
    {
      key: 'type',
      label: '类型',
      formatter: (val: unknown) => <Badge variant={String(val) === 'BALANCE' ? 'primary' : 'purple'}>{String(val)}</Badge>,
    },
    {
      key: 'amount',
      label: '金额/天数',
      formatter: (val: unknown) => String(val ?? 0),
    },
    {
      key: 'usedCount',
      label: '已用/上限',
      formatter: (_: unknown, row: RedeemCode) => `${row.usedCount}/${row.maxUses ?? '∞'}`,
    },
    {
      key: 'enabled',
      label: '启用',
      formatter: (_: unknown, row: RedeemCode) => (
        <Toggle checked={row.enabled} onChange={() => {}} disabled />
      ),
    },
    {
      key: 'actions',
      label: '操作',
      formatter: (_: unknown, row: RedeemCode) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openRedeemEdit(row)}>
            <Icon name="edit" size="sm" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteRedeem(row)}>
            <Icon name="trash" size="sm" className="text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  const promoColumns = [
    { key: 'id', label: 'ID' },
    { key: 'code', label: '优惠码' },
    {
      key: 'discountType',
      label: '折扣类型',
      formatter: (val: unknown) => <Badge variant={String(val) === 'PERCENTAGE' ? 'primary' : 'warning'}>{String(val)}</Badge>,
    },
    {
      key: 'discountValue',
      label: '折扣值',
      formatter: (val: unknown) => String(val ?? 0),
    },
    {
      key: 'usedCount',
      label: '已用/上限',
      formatter: (_: unknown, row: PromoCode) => `${row.usedCount}/${row.maxUses ?? '∞'}`,
    },
    {
      key: 'enabled',
      label: '启用',
      formatter: (_: unknown, row: PromoCode) => (
        <Toggle checked={row.enabled} onChange={() => {}} disabled />
      ),
    },
    {
      key: 'actions',
      label: '操作',
      formatter: (_: unknown, row: PromoCode) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openPromoEdit(row)}>
            <Icon name="edit" size="sm" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeletePromo(row)}>
            <Icon name="trash" size="sm" className="text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  const annColumns = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: '标题' },
    {
      key: 'type',
      label: '类型',
      formatter: (val: unknown) => <Badge variant="gray">{String(val)}</Badge>,
    },
    {
      key: 'published',
      label: '状态',
      formatter: (val: unknown) => (
        <StatusBadge
          status={val ? 'published' : 'draft'}
          label={val ? '已发布' : '草稿'}
        />
      ),
    },
    {
      key: 'sortOrder',
      label: '排序',
    },
    {
      key: 'actions',
      label: '操作',
      formatter: (_: unknown, row: Announcement) => (
        <div className="flex items-center gap-2">
          {row.published ? (
            <Button variant="ghost" size="sm" onClick={() => handleUnpublish(row.id)}>取消发布</Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => handlePublish(row.id)}>发布</Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => openAnnEdit(row)}>
            <Icon name="edit" size="sm" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteAnn(row)}>
            <Icon name="trash" size="sm" className="text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  const tabItems = [
    { key: 'redeem', label: '兑换码' },
    { key: 'promo', label: '优惠码' },
    { key: 'announcements', label: '公告' },
  ];

  const typeOptions = [
    { value: 'BALANCE', label: '余额' },
    { value: 'SUBSCRIPTION', label: '订阅' },
  ];

  const discountTypeOptions = [
    { value: 'FIXED', label: '固定金额' },
    { value: 'PERCENTAGE', label: '百分比' },
  ];

  const annTypeOptions = [
    { value: 'INFO', label: '信息' },
    { value: 'WARNING', label: '警告' },
    { value: 'SUCCESS', label: '成功' },
  ];

  return (
    <div>
      <PageHeader title="营销管理" description="管理兑换码、优惠码和公告" />

      <Tabs items={tabItems} activeKey={activeTab} onChange={(k) => setActiveTab(k as CodeTab)} />

      <div className="mt-6">
        {/* Redeem Codes */}
        {activeTab === 'redeem' && (
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">兑换码列表</h3>
              <Button size="sm" onClick={openRedeemCreate}>
                <Icon name="plus" size="sm" />
                创建兑换码
              </Button>
            </div>
            <DataTable columns={redeemColumns} data={redeemCodes} loading={redeemLoading} />
          </div>
        )}

        {/* Promo Codes */}
        {activeTab === 'promo' && (
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">优惠码列表</h3>
              <Button size="sm" onClick={openPromoCreate}>
                <Icon name="plus" size="sm" />
                创建优惠码
              </Button>
            </div>
            <DataTable columns={promoColumns} data={promoCodes} loading={promoLoading} />
          </div>
        )}

        {/* Announcements */}
        {activeTab === 'announcements' && (
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">公告列表</h3>
              <Button size="sm" onClick={openAnnCreate}>
                <Icon name="plus" size="sm" />
                创建公告
              </Button>
            </div>
            <DataTable columns={annColumns} data={announcements} loading={annLoading} />
          </div>
        )}
      </div>

      {/* --- Redeem Modal --- */}
      <Modal
        open={redeemModalOpen}
        onClose={() => setRedeemModalOpen(false)}
        title={editRedeem ? '编辑兑换码' : '创建兑换码'}
        width="normal"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setRedeemModalOpen(false)}>取消</Button>
            <Button onClick={handleRedeemSave} loading={redeemSaving}>保存</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="兑换码" value={rCode} onChange={(e) => setRCode(e.target.value)} placeholder="输入兑换码" />
          <div>
            <label className="input-label">类型</label>
            <Select options={typeOptions} value={rType} onChange={setRType} />
          </div>
          <Input label="金额/天数" value={rAmount} onChange={(e) => setRAmount(e.target.value)} placeholder="输入金额或天数" />
          <Input label="最大使用次数" value={rMaxUses} onChange={(e) => setRMaxUses(e.target.value)} placeholder="留空表示无限" />
          <Toggle label="启用" checked={rEnabled} onChange={setREnabled} />
        </div>
      </Modal>

      {/* --- Promo Modal --- */}
      <Modal
        open={promoModalOpen}
        onClose={() => setPromoModalOpen(false)}
        title={editPromo ? '编辑优惠码' : '创建优惠码'}
        width="normal"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setPromoModalOpen(false)}>取消</Button>
            <Button onClick={handlePromoSave} loading={promoSaving}>保存</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="优惠码" value={pCode} onChange={(e) => setPCode(e.target.value)} placeholder="输入优惠码" />
          <div>
            <label className="input-label">折扣类型</label>
            <Select options={discountTypeOptions} value={pDiscountType} onChange={setPDiscountType} />
          </div>
          <Input label="折扣值" value={pDiscountValue} onChange={(e) => setPDiscountValue(e.target.value)} placeholder="输入折扣金额或百分比" />
          <Input label="最大使用次数" value={pMaxUses} onChange={(e) => setPMaxUses(e.target.value)} placeholder="留空表示无限" />
          <Toggle label="启用" checked={pEnabled} onChange={setPEnabled} />
        </div>
      </Modal>

      {/* --- Announcement Modal --- */}
      <Modal
        open={annModalOpen}
        onClose={() => setAnnModalOpen(false)}
        title={editAnn ? '编辑公告' : '创建公告'}
        width="normal"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setAnnModalOpen(false)}>取消</Button>
            <Button onClick={handleAnnSave} loading={annSaving}>保存</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="标题" value={aTitle} onChange={(e) => setATitle(e.target.value)} placeholder="输入公告标题" />
          <div>
            <label className="input-label">内容</label>
            <textarea
              className="input min-h-[120px] resize-y"
              value={aContent}
              onChange={(e) => setAContent(e.target.value)}
              placeholder="输入公告内容"
            />
          </div>
          <div>
            <label className="input-label">类型</label>
            <Select options={annTypeOptions} value={aType} onChange={setAType} />
          </div>
        </div>
      </Modal>

      {/* Delete confirms */}
      <ConfirmDialog
        open={!!deleteRedeem}
        onConfirm={handleRedeemDelete}
        onCancel={() => setDeleteRedeem(null)}
        title="删除兑换码"
        message={`确定要删除兑换码 "${deleteRedeem?.code}" 吗？`}
        confirmText="删除"
        variant="danger"
      />
      <ConfirmDialog
        open={!!deletePromo}
        onConfirm={handlePromoDelete}
        onCancel={() => setDeletePromo(null)}
        title="删除优惠码"
        message={`确定要删除优惠码 "${deletePromo?.code}" 吗？`}
        confirmText="删除"
        variant="danger"
      />
      <ConfirmDialog
        open={!!deleteAnn}
        onConfirm={handleAnnDelete}
        onCancel={() => setDeleteAnn(null)}
        title="删除公告"
        message={`确定要删除公告 "${deleteAnn?.title}" 吗？`}
        confirmText="删除"
        variant="danger"
      />
    </div>
  );
}
