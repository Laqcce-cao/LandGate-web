import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';

const RESEND_COOLDOWN = 60;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => clearInterval(timerRef.current ?? undefined);
  }, []);

  const startCooldown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCooldown(RESEND_COOLDOWN);
    const id = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    timerRef.current = id;
  };

  const handleSendCode = async () => {
    setError('');
    setMessage('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('请输入邮箱');
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setError('请输入有效邮箱');
      return;
    }

    setSending(true);
    try {
      await authApi.requestPasswordResetCode(normalizedEmail);
      startCooldown();
      setMessage('如果该邮箱已注册，重置密码验证码已发送，请查收邮件');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        '发送失败，请稍后重试';
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('请输入邮箱');
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setError('请输入有效邮箱');
      return;
    }
    if (!code.trim() || code.length !== 6) {
      setError('请输入6位验证码');
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      setError('新密码长度需要在 8 到 128 位之间');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    setResetting(true);
    try {
      await authApi.resetPassword(normalizedEmail, code, newPassword);
      setMessage('密码重置成功，请重新登录');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        '验证码无效或已过期';
      setError(msg);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="glass-card p-8 animate-scale-in">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
            {message}
          </div>
        )}

        <div>
          <label className="input-label">邮箱</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <Icon name="mail" size="sm" />
              </div>
              <input
                type="email"
                className="input pl-10"
                placeholder="请输入注册邮箱"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                autoFocus
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              loading={sending}
              disabled={cooldown > 0}
              onClick={handleSendCode}
            >
              {cooldown > 0 ? `${cooldown}秒后重发` : '发送验证码'}
            </Button>
          </div>
        </div>

        <div>
          <label className="input-label">验证码</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <Icon name="shield" size="sm" />
            </div>
            <input
              type="text"
              className="input pl-10 text-center text-lg tracking-[0.5em]"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
            />
          </div>
        </div>

        <div>
          <label className="input-label">新密码</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <Icon name="lock" size="sm" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              className="input pl-10 pr-10"
              placeholder="8 到 128 位"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
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

        <div>
          <label className="input-label">确认新密码</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <Icon name="lock" size="sm" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              className="input pl-10"
              placeholder="再次输入新密码"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
            />
          </div>
        </div>

        <Button type="submit" loading={resetting} className="w-full" size="lg">
          重置密码
        </Button>

        <p className="text-center text-sm text-slate-400">
          <Link to="/login" className="font-medium text-violet-600 hover:text-violet-700">
            ← 返回登录
          </Link>
        </p>
      </form>
    </div>
  );
}
