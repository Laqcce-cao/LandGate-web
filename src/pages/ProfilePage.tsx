import { useEffect, useState, type FormEvent } from 'react';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { useToastStore } from '../stores/toastStore';

function SectionHeader({ title }: { title: string }) {
  return <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-dark-300">{title}</h3>;
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const updateUsername = useAuthStore((s) => s.updateUsername);
  const logout = useAuthStore((s) => s.logout);
  const addToast = useToastStore((s) => s.addToast);

  const [nickname, setNickname] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => { fetchUser(); }, [fetchUser]);
  useEffect(() => { if (user) setNickname(user.username ?? ''); }, [user]);

  if (!user) return null;

  const initial = (user.username || user.email)?.charAt(0)?.toUpperCase() ?? 'A';

  const handleNicknameSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      addToast({ type: 'error', message: '昵称不能为空' });
      return;
    }
    if (trimmed === user.username) {
      addToast({ type: 'info', message: '昵称未变更' });
      return;
    }
    setNicknameSaving(true);
    try {
      await updateUsername(trimmed);
      addToast({ type: 'success', message: '昵称修改成功' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '修改失败';
      addToast({ type: 'error', message: msg });
    } finally {
      setNicknameSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      addToast({ type: 'error', message: '请输入当前密码' });
      return;
    }
    if (newPassword.length < 8) {
      addToast({ type: 'error', message: '新密码至少为 8 位' });
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast({ type: 'error', message: '两次输入的新密码不一致' });
      return;
    }
    setPasswordSaving(true);
    try {
      await authApi.updatePassword(oldPassword, newPassword);
      addToast({ type: 'success', message: '密码修改成功，请重新登录' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => logout(), 1500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '修改失败';
      addToast({ type: 'error', message: msg });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      {/* User Info Bar */}
      <div className="card mb-4 flex items-center gap-4 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-emerald-500 text-lg font-bold text-white shadow-md shadow-violet-500/20">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {user.username ?? '用户'}
          </p>
          <p className="truncate text-xs text-gray-400 dark:text-dark-400">{user.email}</p>
        </div>
        <button
          onClick={logout}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <Icon name="login" size="xs" />
          退出
        </button>
      </div>

      {/* Change Nickname */}
      <div className="card mb-4 p-5">
        <SectionHeader title="修改昵称" />
        <form onSubmit={handleNicknameSubmit} className="flex gap-3">
          <input
            type="text"
            className="input flex-1"
            placeholder="输入新昵称"
            maxLength={100}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <Button type="submit" loading={nicknameSaving} size="sm">
            保存
          </Button>
        </form>
      </div>

      {/* Change Password */}
      <div className="card p-5">
        <SectionHeader title="修改密码" />
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-dark-400">
              当前密码
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <Icon name="lock" size="sm" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input pl-10"
                placeholder="输入当前密码"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-dark-400">
              新密码
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <Icon name="lock" size="sm" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input pl-10"
                placeholder="输入新密码（至少8位）"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-dark-400">
              确认新密码
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <Icon name="lock" size="sm" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input pl-10 pr-10"
                placeholder="再次输入新密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size="sm" />
              </button>
            </div>
          </div>

          <Button type="submit" loading={passwordSaving} className="w-full">
            修改密码
          </Button>
        </form>
      </div>
    </div>
  );
}
