import { useEffect, useState, useCallback, useMemo } from 'react';
import { usersApi, type User } from '../../api/admin/users';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DataTable } from '../../components/ui/DataTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatCard } from '../../components/ui/StatCard';
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

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  admin: {
    label: '管理员',
    className: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  },
  super_admin: {
    label: '超级管理员',
    className: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  },
  user: {
    label: '普通用户',
    className: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  beta_tester: {
    label: 'Beta 测试者',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
};

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-blue-500 to-cyan-600',
  'from-pink-500 to-rose-600',
  'from-indigo-500 to-blue-600',
  'from-teal-500 to-emerald-600',
  'from-orange-500 to-red-600',
];

function getUserAvatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function UserAvatar({ user, size }: { user: User; size?: 'sm' | 'md' }) {
  const name = user.username || user.email || '?';
  const initial = name.charAt(0).toUpperCase();
  const sizeClass = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm';

  return (
    <div
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getUserAvatarColor(user.id)} font-semibold text-white shadow-sm`}
    >
      {initial}
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<User | null>(null);
  const addToast = useToastStore((s) => s.addToast);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  // form state
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('user');
  const [statusForm, setStatusForm] = useState('active');
  const [balance, setBalance] = useState('0');
  const [concurrency, setConcurrency] = useState('5');
  const [rpmLimit, setRpmLimit] = useState('0');
  const [notes, setNotes] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: { page?: number; pageSize?: number; search?: string } = {
        page,
        pageSize: PAGE_SIZE,
      };
      if (search.trim()) params.search = search.trim();
      const { data } = await usersApi.list(params);
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } catch {
      addToast({ type: 'error', message: '加载用户列表失败' });
    } finally {
      setLoading(false);
    }
  }, [page, search, addToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // derive stats from current page (the API should ideally return these)
  const stats = useMemo(() => {
    const active = users.filter((u) => u.status === 'active').length;
    const disabled = users.filter((u) => u.status === 'disabled').length;
    const admins = users.filter((u) => u.role === 'admin' || u.role === 'super_admin').length;
    const beta = users.filter((u) => u.role === 'beta_tester').length;
    return { active, disabled, admins, beta };
  }, [users]);

  const handleSearch = () => {
    setSearch(searchInput.trim());
    setPage(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(0);
  };

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
    {
      key: 'id',
      label: 'ID',
      formatter: (val: unknown) => (
        <span className="text-xs font-mono text-gray-400 dark:text-dark-500 tabular-nums">
          #{String(val)}
        </span>
      ),
    },
    {
      key: 'username',
      label: '用户',
      formatter: (_: unknown, row: User) => (
        <div className="flex items-center gap-3">
          <UserAvatar user={row} size="sm" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {row.username || '未设置'}
            </p>
            <p className="text-xs text-gray-400 dark:text-dark-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: '角色',
      formatter: (val: unknown) => {
        const r = String(val ?? 'user');
        const config = ROLE_CONFIG[r] ?? ROLE_CONFIG.user;
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
            {config.label}
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
        return (
          <span className="text-sm font-mono font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
            ${b.toFixed(2)}
          </span>
        );
      },
    },
    {
      key: 'signupSource',
      label: '来源',
      formatter: (val: unknown) => {
        const s = String(val ?? '-');
        return (
          <span className="text-xs text-gray-500 dark:text-dark-400">{s}</span>
        );
      },
    },
    {
      key: 'createdAt',
      label: '注册时间',
      formatter: (val: unknown) =>
        val ? (
          <span className="text-sm text-gray-500 dark:text-dark-400">
            {dayjs(String(val)).format('YYYY-MM-DD HH:mm')}
          </span>
        ) : <span className="text-sm text-gray-300 dark:text-dark-600">-</span>,
    },
    {
      key: 'lastLoginAt',
      label: '最后登录',
      formatter: (val: unknown) =>
        val ? (
          <span className="text-sm text-gray-500 dark:text-dark-400">
            {dayjs(String(val)).format('YYYY-MM-DD HH:mm')}
          </span>
        ) : <span className="text-sm text-gray-300 dark:text-dark-600">从未登录</span>,
    },
    {
      key: 'actions',
      label: '操作',
      formatter: (_: unknown, row: User) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
            <Icon name="edit" size="sm" />
          </Button>
          <Button
            variant={row.status === 'active' ? 'ghost' : 'ghost'}
            size="sm"
            onClick={() => setToggleTarget(row)}
            title={row.status === 'active' ? '禁用' : '启用'}
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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* 统计卡片 */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="当前页用户"
          value={users.length.toLocaleString()}
          icon={<Icon name="users" size="lg" />}
          iconVariant="primary"
        />
        <StatCard
          title="活跃"
          value={stats.active.toLocaleString()}
          icon={<Icon name="checkCircle" size="lg" />}
          iconVariant="success"
        />
        <StatCard
          title="管理员"
          value={stats.admins.toLocaleString()}
          icon={<Icon name="shield" size="lg" />}
          iconVariant="warning"
        />
        <StatCard
          title="已禁用"
          value={stats.disabled.toLocaleString()}
          icon={<Icon name="ban" size="lg" />}
          iconVariant="danger"
        />
      </div>

      {/* 搜索 + 表格 */}
      <div className="card">
        {/* 搜索栏 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-dark-700">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Icon
                name="search"
                size="sm"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-400"
              />
              <input
                className="input w-72 pl-9"
                placeholder="搜索用户名或邮箱..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <Button onClick={handleSearch} size="sm">
              搜索
            </Button>
            {search && (
              <button
                className="text-sm text-gray-400 hover:text-gray-600 dark:text-dark-400 dark:hover:text-dark-200 transition-colors"
                onClick={clearSearch}
              >
                清除筛选
              </button>
            )}
          </div>
          {total > 0 && !search && (
            <span className="text-sm text-gray-400 dark:text-dark-500">
              共 {total.toLocaleString()} 个用户
            </span>
          )}
        </div>

        <DataTable columns={columns} data={users} loading={loading} />

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 dark:border-dark-700">
            <span className="text-sm text-gray-500 dark:text-dark-400">
              第 {page + 1} / {totalPages} 页
            </span>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-secondary btn-sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <Icon name="chevronLeft" size="sm" />
                上一页
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i;
                } else if (page < 3) {
                  pageNum = i;
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 7 + i;
                } else {
                  pageNum = page - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    className={`btn btn-sm ${pageNum === page ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                下一页
                <Icon name="chevronRight" size="sm" />
              </button>
            </div>
          </div>
        )}
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
          {/* 用户信息头 */}
          {editTarget && (
            <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4 dark:bg-dark-800">
              <UserAvatar user={editTarget} size="md" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {editTarget.username || editTarget.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-dark-400">
                  {editTarget.email} · 注册于 {editTarget.createdAt ? dayjs(editTarget.createdAt).format('YYYY-MM-DD') : '-'}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_CONFIG[editTarget.role]?.className ?? ROLE_CONFIG.user.className}`}>
                    {ROLE_CONFIG[editTarget.role]?.label ?? editTarget.role}
                  </span>
                  <StatusBadge status={editTarget.status} />
                </div>
              </div>
            </div>
          )}

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

          <fieldset className="rounded-lg border border-gray-200 p-4 dark:border-dark-600">
            <legend className="px-1 text-sm font-medium text-gray-700 dark:text-dark-300">
              配额设置
            </legend>
            <div className="mt-1 grid grid-cols-3 gap-3">
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
          </fieldset>

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
