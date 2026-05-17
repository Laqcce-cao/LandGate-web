import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { groupsApi, type AccountGroup, type UserAllowedGroup } from '../api/admin/groups';
import { accountsApi, type Account } from '../api/admin/accounts';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Tabs } from '../components/ui/Tabs';
import { DataTable } from '../components/ui/DataTable';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Icon } from '../components/ui/Icon';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useToastStore } from '../stores/toastStore';

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const id = Number(groupId);

  const [activeTab, setActiveTab] = useState('accounts');
  const [accounts, setAccounts] = useState<AccountGroup[]>([]);
  const [users, setUsers] = useState<UserAllowedGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // All accounts + lookup map for displaying names
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const accountMap = new Map(allAccounts.map((a) => [a.id, a]));

  // Bind account modal
  const [bindOpen, setBindOpen] = useState(false);
  const [bindAccountId, setBindAccountId] = useState('');
  const [bindPriority, setBindPriority] = useState('50');
  const [binding, setBinding] = useState(false);

  // Add user modal
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [adding, setAdding] = useState(false);

  // Delete confirms
  const [unbindTarget, setUnbindTarget] = useState<AccountGroup | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<UserAllowedGroup | null>(null);

  const addToast = useToastStore((s) => s.addToast);

  const fetchData = useCallback(async () => {
    try {
      const [, accountsRes, usersRes, allAccountsRes] = await Promise.all([
        groupsApi.getById(id),
        groupsApi.listAccounts(id),
        groupsApi.listUsers(id),
        accountsApi.list(),
      ]);
      setAccounts(accountsRes.data.accounts ?? []);
      setUsers(usersRes.data.users ?? []);
      setAllAccounts(allAccountsRes.data.accounts ?? []);
    } catch {
      addToast({ type: 'error', message: '加载分组详情失败' });
    }
  }, [id, addToast]);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const handleBind = async () => {
    const accountId = Number(bindAccountId);
    if (!accountId) return;
    setBinding(true);
    try {
      await groupsApi.bindAccount(id, accountId, Number(bindPriority) || 50);
      addToast({ type: 'success', message: '账号已绑定' });
      setBindOpen(false);
      setBindAccountId('');
      setBindPriority('50');
      fetchData();
    } catch {
      addToast({ type: 'error', message: '绑定失败' });
    } finally {
      setBinding(false);
    }
  };

  const handleUnbind = async () => {
    if (!unbindTarget) return;
    try {
      await groupsApi.unbindAccount(id, unbindTarget.accountId);
      addToast({ type: 'success', message: '已解绑' });
      setUnbindTarget(null);
      fetchData();
    } catch {
      addToast({ type: 'error', message: '解绑失败' });
    }
  };

  const handleAddUser = async () => {
    const uid = Number(addUserId);
    if (!uid) return;
    setAdding(true);
    try {
      await groupsApi.allowUser(id, uid);
      addToast({ type: 'success', message: '用户已添加' });
      setAddUserOpen(false);
      setAddUserId('');
      fetchData();
    } catch {
      addToast({ type: 'error', message: '添加失败' });
    } finally {
      setAdding(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await groupsApi.revokeUser(id, revokeTarget.userId);
      addToast({ type: 'success', message: '已撤销' });
      setRevokeTarget(null);
      fetchData();
    } catch {
      addToast({ type: 'error', message: '撤销失败' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  // Build account options for Select, excluding already bound ones
  const boundAccountIds = new Set(accounts.map((a) => a.accountId));
  const accountOptions = allAccounts
    .filter((a) => !boundAccountIds.has(a.id))
    .map((a) => ({ value: String(a.id), label: `${a.name} (ID:${a.id})` }));

  const accountColumns = [
    { key: 'accountId', label: '账号 ID' },
    {
      key: 'accountName',
      label: '账号名称',
      formatter: (_: unknown, row: AccountGroup) => {
        const acc = accountMap.get(row.accountId);
        return (
          <span className="text-sm">
            {acc?.name ?? <span className="text-gray-400">未知</span>}
          </span>
        );
      },
    },
    { key: 'priority', label: '优先级' },
    {
      key: 'actions',
      label: '操作',
      formatter: (_: unknown, row: AccountGroup) => (
        <Button variant="ghost" size="sm" onClick={() => setUnbindTarget(row)}>
          <Icon name="trash" size="sm" className="text-red-500" />
          解绑
        </Button>
      ),
    },
  ];

  const userColumns = [
    { key: 'userId', label: '用户 ID' },
    { key: 'groupId', label: '分组 ID' },
    {
      key: 'actions',
      label: '操作',
      formatter: (_: unknown, row: UserAllowedGroup) => (
        <Button variant="ghost" size="sm" onClick={() => setRevokeTarget(row)}>
          <Icon name="trash" size="sm" className="text-red-500" />
          撤销
        </Button>
      ),
    },
  ];

  const tabItems = [
    { key: 'accounts', label: '绑定账号' },
    { key: 'users', label: '授权用户' },
  ];

  return (
    <div>
      <div className="mb-4">
        <Tabs items={tabItems} activeKey={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === 'accounts' ? (
        <div className="card">
          <DataTable columns={accountColumns} data={accounts} />
        </div>
      ) : (
        <div className="card">
          <DataTable columns={userColumns} data={users} />
        </div>
      )}

      {/* Bind account modal */}
      <Modal
        open={bindOpen}
        onClose={() => setBindOpen(false)}
        title="绑定账号"
        width="normal"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setBindOpen(false)}>取消</Button>
            <Button onClick={handleBind} loading={binding} disabled={!bindAccountId}>绑定</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="input-label">选择账号</label>
            {accountOptions.length > 0 ? (
              <Select
                options={accountOptions}
                value={bindAccountId}
                onChange={setBindAccountId}
                placeholder="选择要绑定的上游账号..."
                searchable
                emptyText="暂无可绑定的账号"
              />
            ) : (
              <p className="text-sm text-gray-400">所有账号已绑定，请先创建新账号。</p>
            )}
          </div>
          <Input
            label="优先级"
            type="number"
            value={bindPriority}
            onChange={(e) => setBindPriority(e.target.value)}
            placeholder="数字越小优先级越高，默认 50"
          />
          <p className="text-xs text-gray-400">
            同一分组下，网关按优先级从小到大依次选择可用账号。优先级更新功能后端暂未实现，绑定后如需修改请解绑后重新绑定。
          </p>
        </div>
      </Modal>

      {/* Add user modal */}
      <Modal
        open={addUserOpen}
        onClose={() => setAddUserOpen(false)}
        title="授权用户"
        width="narrow"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setAddUserOpen(false)}>取消</Button>
            <Button onClick={handleAddUser} loading={adding} disabled={!addUserId}>添加</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="用户 ID"
            type="number"
            value={addUserId}
            onChange={(e) => setAddUserId(e.target.value)}
            placeholder="输入用户 ID"
          />
          <p className="text-xs text-gray-400">
            授权后用户可在创建 API Key 时选择此分组。注意：网关当前仅通过 API Key 的 group_id 关联分组，不校验 user_allowed_groups 表。
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!unbindTarget}
        onConfirm={handleUnbind}
        onCancel={() => setUnbindTarget(null)}
        title="解绑账号"
        message={`确定要解绑账号 ${unbindTarget?.accountId} 吗？`}
        confirmText="解绑"
        variant="warning"
      />

      <ConfirmDialog
        open={!!revokeTarget}
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
        title="撤销授权"
        message={`确定要撤销用户 ${revokeTarget?.userId} 的授权吗？`}
        confirmText="撤销"
        variant="warning"
      />
    </div>
  );
}
