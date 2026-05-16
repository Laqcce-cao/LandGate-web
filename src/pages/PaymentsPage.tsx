import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentsApi, type PaymentOrder } from '../api/admin/payments';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DataTable } from '../components/ui/DataTable';
import { Icon } from '../components/ui/Icon';
import { useToastStore } from '../stores/toastStore';

const statusTabs = [
  { key: '', label: '全部' },
  { key: 'PENDING', label: '待支付' },
  { key: 'COMPLETED', label: '已完成' },
  { key: 'REFUNDED', label: '已退款' },
];

export default function PaymentsPage() {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<PaymentOrder | null>(null);
  const [tradeNo, setTradeNo] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [refundTarget, setRefundTarget] = useState<PaymentOrder | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await paymentsApi.list({
        page,
        size: 20,
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      setOrders(data.orders ?? []);
      setTotal(data.total ?? 0);
    } catch {
      addToast({ type: 'error', message: '加载订单失败' });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, addToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    setConfirming(true);
    try {
      await paymentsApi.confirm(confirmTarget.id, tradeNo, Number(payAmount));
      addToast({ type: 'success', message: '确认收款成功' });
      setConfirmTarget(null);
      setTradeNo('');
      setPayAmount('');
      fetchOrders();
    } catch {
      addToast({ type: 'error', message: '确认失败' });
    } finally {
      setConfirming(false);
    }
  };

  const handleRefund = async () => {
    if (!refundTarget) return;
    setRefunding(true);
    try {
      await paymentsApi.refund(refundTarget.id, refundReason);
      addToast({ type: 'success', message: '退款已处理' });
      setRefundTarget(null);
      setRefundReason('');
      fetchOrders();
    } catch {
      addToast({ type: 'error', message: '退款失败' });
    } finally {
      setRefunding(false);
    }
  };

  const columns = [
    { key: 'id', label: '订单 ID' },
    {
      key: 'userId',
      label: '用户',
      formatter: (_: unknown, row: PaymentOrder) => (
        <span>{row.userEmail ?? row.userName ?? `用户 #${row.userId}`}</span>
      ),
    },
    {
      key: 'amount',
      label: '金额',
      formatter: (val: unknown) => `$${Number(val ?? 0).toFixed(2)}`,
    },
    {
      key: 'paymentType',
      label: '支付方式',
      formatter: (val: unknown) => <Badge variant="gray">{String(val ?? '—')}</Badge>,
    },
    {
      key: 'status',
      label: '状态',
      formatter: (val: unknown) => <StatusBadge status={String(val ?? 'PENDING')} />,
    },
    {
      key: 'createdAt',
      label: '创建时间',
      formatter: (val: unknown) => (val ? new Date(String(val)).toLocaleString('zh-CN') : '—'),
    },
    {
      key: 'actions',
      label: '操作',
      formatter: (_: unknown, row: PaymentOrder) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/payments/${row.id}`)}>
            <Icon name="eye" size="sm" />
          </Button>
          {row.status === 'PENDING' && (
            <Button variant="ghost" size="sm" onClick={() => { setConfirmTarget(row); setPayAmount(String(row.amount ?? 0)); }}>
              确认
            </Button>
          )}
          {row.status === 'COMPLETED' && (
            <Button variant="ghost" size="sm" onClick={() => setRefundTarget(row)}>
              退款
            </Button>
          )}
        </div>
      ),
    },
  ];

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <PageHeader title="支付管理" description="管理支付订单" />

      {/* Status filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === tab.key
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-800 dark:text-dark-400 dark:hover:bg-dark-700'
            }`}
            onClick={() => { setStatusFilter(tab.key); setPage(0); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card">
        <DataTable columns={columns} data={orders} loading={loading} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 dark:border-dark-700">
            <span className="text-sm text-gray-500 dark:text-dark-400">
              共 {total} 条记录，第 {page + 1}/{totalPages} 页
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                上一页
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                下一页
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      <Modal
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        title="确认收款"
        width="narrow"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirmTarget(null)}>取消</Button>
            <Button onClick={handleConfirm} loading={confirming}>确认</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="交易号" value={tradeNo} onChange={(e) => setTradeNo(e.target.value)} placeholder="输入支付交易号" />
          <Input label="支付金额" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="输入实际支付金额" />
        </div>
      </Modal>

      {/* Refund dialog */}
      <Modal
        open={!!refundTarget}
        onClose={() => setRefundTarget(null)}
        title="退款"
        width="narrow"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setRefundTarget(null)}>取消</Button>
            <Button variant="danger" onClick={handleRefund} loading={refunding}>确认退款</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            确定要对订单 #{refundTarget?.id}（${Number(refundTarget?.amount ?? 0).toFixed(2)}）进行退款吗？
          </p>
          <Input label="退款原因" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="输入退款原因" />
        </div>
      </Modal>
    </div>
  );
}
