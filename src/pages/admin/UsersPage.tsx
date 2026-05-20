import { useEffect, useState, useCallback } from 'react';
import { usersApi, type User } from '../../api/admin/users';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DataTable } from '../../components/ui/DataTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Icon } from '../../components/ui/Icon';
import { useToastStore } from '../../stores/toastStore';
import dayjs from 'dayjs';

const ROLE_OPTIONS = [
  { value: 'user', label: '普通用户' },
  { value: 'admin', label: '管理员' },
  { value: 'beta_tester', label: 'Beta 测试者' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
];

const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  super_admin: '超级管理员',
  user: '普通用户',
  beta_tester: 'Beta 测试者',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<User | null>(null);
  const addToast = useToastStore((s) => s.addToast);

  // form state
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('user');
  const [statusForm, setStatusForm] = useState('active');
  const [balance, setBalance] = useState('0');
  const [concurrency, setConcurrency] = useState('5');
  const [rpmLimit, setRpmLimit] = useState('0');
  const [notes, setNotes] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await usersApi.list();
      setUsers(data.users ?? []);
    } catch {
      addToast({ type: 'error', message: '加载用户列表失败' });
    }
  }, [addToast]);

  useEffect(() => {
    fetchUsers().finally(() => setLoading(false));
  }, [fetchUsers]);

  const openEdit = (user: User) => {
    setEditTarget(user);
    setUsername(user.username ?? '');
    setRole(user.role ?? 'user');
    setStatusForm(user.status ?? 'active');
    setBalance(String(user.balance ?? 0));
    setConcurrency(String(user.concurrency ?? 5));
    setRpmLimit(String(user.rpmLimit ?? 0));
    setNotes(user.notes ?? '');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await usersApi.update(editTarget.id, {
        username: username.trim(),
        role,
        status: statusForm,
        balance: Number(balance) || 0,
        concurrency: Number(concurrency) || 1,
        rpmLimit: Number(rpmLimit) || 0,
        notes: notes.trim(),
      });
      addToast({ type: 'success', message: '用户信息已更新' });
      setModalOpen(false);
      fetchUsers();
    } catch {
      addToast({ type: 'error', message: '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!toggleTarget) return;
    const newStatus = toggleTarget.status === 'active' ? 'disabled' : 'active';
    try {
      await usersApi.updateStatus(toggleTarget.id, newStatus);
      addToast({ type: 'success', message: `用户已${newStatus === 'active' ? '启用' : '禁用'}` });
      setToggleTarget(null);
      fetchUsers();
    } catch {
      addToast({ type: 'error', message: '操作失败' });
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'username', label: '用户名' },
    {
      key: 'email',
      label: '邮箱',
      formatter: (val: unknown) => (
        <span className="text-sm text-gray-600 dark:text-dark-400">{String(val ?? '')}</span>
      ),
    },
    {
      key: 'role',
      label: '角色',
      formatter: (val: unknown) => {
        const r = String(val ?? 'user');
        return (
          <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/20 dark:text-violet-400">
            {ROLE_LABELS[r] ?? r}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: '状态',
      formatter: (val: unknown) => <StatusBadge status={String(val ?? 'active')} />,
    },
    {
      key: 'balance',
      label: '余额',
      formatter: (val: unknown) => {
        const b = Number(val ?? 0);
        return `$${b.toFixed(2)}`;
      },
    },
    {
      key: 'createdAt',
      label: '注册时间',
      formatter: (val: unknown) =>
        val ? dayjs(String(val)).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      key: 'lastLoginAt',
      label: '最后登录',
      formatter: (val: unknown) =>
        val ? dayjs(String(val)).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      key: 'actions',
      label: '操作',
      formatter: (_: unknown, row: User) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
            <Icon name="edit" size="sm" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setToggleTarget(row)}
          >
            <Icon
              name={row.status === 'active' ? 'ban' : 'checkCircle'}
              size="sm"
              className={row.status === 'active' ? 'text-amber-500' : 'text-emerald-500'}
            />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-dark-400">
          共 {users.length} 个用户
        </p>
      </div>

      <div className="card">
        <DataTable columns={columns} data={users} loading={loading} />
      </div>

      {/* Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="编辑用户"
        width="normal"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={handleSave} loading={saving}>保存</Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="rounded-lg bg-gray-50 dark:bg-dark-800 p-3">
            <p className="text-sm text-gray-500 dark:text-dark-400">
              邮箱：{editTarget?.email}
            </p>
            <p className="text-xs text-gray-400 dark:text-dark-500 mt-1">
              ID: {editTarget?.id} · 注册来源: {editTarget?.signupSource ?? '-'}
            </p>
          </div>

          <Input
            label="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="输入用户名"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">角色</label>
              <Select options={ROLE_OPTIONS} value={role} onChange={setRole} />
            </div>
            <div>
              <label className="input-label">状态</label>
              <Select options={STATUS_OPTIONS} value={statusForm} onChange={setStatusForm} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="余额 (USD)"
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
            <Input
              label="并发上限"
              type="number"
              value={concurrency}
              onChange={(e) => setConcurrency(e.target.value)}
            />
            <Input
              label="RPM 限制"
              type="number"
              value={rpmLimit}
              onChange={(e) => setRpmLimit(e.target.value)}
              hint="0 = 不限制"
            />
          </div>

          <div>
            <label className="input-label">备注</label>
            <textarea
              className="input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="管理员备注（可选）"
            />
          </div>
        </div>
      </Modal>

      {/* Toggle status confirm */}
      <ConfirmDialog
        open={!!toggleTarget}
        onConfirm={handleToggleStatus}
        onCancel={() => setToggleTarget(null)}
        title={toggleTarget?.status === 'active' ? '禁用用户' : '启用用户'}
        message={
          toggleTarget?.status === 'active'
            ? `确定要禁用用户 "${toggleTarget?.username ?? toggleTarget?.email}" 吗？禁用后该用户将无法登录和使用 API。`
            : `确定要启用用户 "${toggleTarget?.username ?? toggleTarget?.email}" 吗？`
        }
        confirmText={toggleTarget?.status === 'active' ? '禁用' : '启用'}
        variant={toggleTarget?.status === 'active' ? 'danger' : 'success'}
      />
    </div>
  );
}
