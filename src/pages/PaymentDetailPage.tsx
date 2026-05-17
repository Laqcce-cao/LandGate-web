import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { paymentsApi, type PaymentOrder } from '../api/admin/payments';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useToastStore } from '../stores/toastStore';

export default function PaymentDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    paymentsApi.getById(Number(orderId))
      .then(({ data }) => setOrder(data.order))
      .catch(() => addToast({ type: 'error', message: '加载订单详情失败' }))
      .finally(() => setLoading(false));
  }, [orderId, addToast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (!order) return null;

  const fields = [
    { label: '订单 ID', value: order.id },
    { label: '用户 ID', value: order.userId },
    { label: '用户邮箱', value: order.userEmail ?? '—' },
    { label: '金额', value: `$${Number(order.amount ?? 0).toFixed(2)}` },
    { label: '实付金额', value: order.payAmount ? `$${Number(order.payAmount).toFixed(2)}` : '—' },
    { label: '支付方式', value: order.paymentType ?? '—' },
    { label: '商户订单号', value: order.outTradeNo ?? '—' },
    { label: '支付交易号', value: order.paymentTradeNo ?? '—' },
    { label: '订单类型', value: order.orderType ?? '—' },
    {
      label: '状态',
      value: <StatusBadge status={order.status} />,
    },
    { label: '创建时间', value: order.createdAt ? new Date(order.createdAt).toLocaleString('zh-CN') : '—' },
    { label: '支付时间', value: order.paidAt ? new Date(order.paidAt).toLocaleString('zh-CN') : '—' },
    { label: '完成时间', value: order.completedAt ? new Date(order.completedAt).toLocaleString('zh-CN') : '—' },
    { label: '退款金额', value: order.refundAmount ? `$${Number(order.refundAmount).toFixed(2)}` : '—' },
    { label: '退款原因', value: order.refundReason ?? '—' },
  ];

  return (
    <div>
      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">基本信息</h3>
          <Badge variant={order.status === 'COMPLETED' ? 'success' : order.status === 'PENDING' ? 'warning' : 'danger'}>
            {order.status}
          </Badge>
        </div>
        <div className="card-body grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((f) => (
            <div key={f.label}>
              <p className="text-xs text-gray-500 dark:text-dark-400">{f.label}</p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{f.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
