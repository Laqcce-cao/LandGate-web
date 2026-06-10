import { useState, type FormEvent, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';

const RESEND_COOLDOWN = 60;

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const emailFromParam = searchParams.get('email') || '';
  const emailLocked = !!emailFromParam;
  const [email, setEmail] = useState(emailFromParam);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN);
    const id = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    timerRef.current = id;
  }, []);

  useEffect(() => {
    return () => clearInterval(timerRef.current ?? undefined);
  }, []);

  useEffect(() => {
    if (!emailFromParam) return;
    // If no email in URL, redirect to register
  }, [emailFromParam]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('请输入邮箱');
      return;
    }

    if (!code.trim() || code.length !== 6) {
      setError('请输入6位验证码');
      return;
    }

    setLoading(true);
    try {
      await authApi.verifyEmail(email, code);
      setSuccess('邮箱验证成功！即将跳转到登录页...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        '验证码无效或已过期';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError('请先输入邮箱');
      return;
    }

    setResending(true);
    setError('');
    setSuccess('');
    try {
      await authApi.resendVerificationCode(email);
      startCooldown();
      setSuccess('验证码已重新发送，请查收邮件');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        '发送失败，请稍后重试';
      setError(msg);
    } finally {
      setResending(false);
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

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
            {success}
          </div>
        )}

        <div>
          <label className="input-label">邮箱</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <Icon name="mail" size="sm" />
            </div>
            <input
              type="email"
              className={`input pl-10 ${emailLocked ? 'cursor-not-allowed bg-gray-50 text-gray-500 dark:bg-dark-900 dark:text-dark-400' : ''}`}
              placeholder="请输入注册时使用的邮箱"
              value={email}
              readOnly={emailLocked}
              onChange={(e) => { if (!emailLocked) { setEmail(e.target.value); setError(''); } }}
              autoFocus={!emailLocked}
            />
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
              autoFocus={!!emailFromParam}
            />
          </div>
        </div>

        <Button type="submit" loading={loading} className="w-full" size="lg">
          验证邮箱
        </Button>

        <div className="text-center">
          <button
            type="button"
            disabled={resending || cooldown > 0}
            className="text-sm text-violet-600 hover:text-violet-700 disabled:text-gray-400"
            onClick={handleResend}
          >
            {resending
              ? '发送中...'
              : cooldown > 0
                ? `${cooldown}秒后可重新发送`
                : '重新发送验证码'}
          </button>
        </div>

        <p className="text-center text-sm text-slate-400">
          <Link to="/login" className="font-medium text-violet-600 hover:text-violet-700">
            ← 返回登录
          </Link>
        </p>
      </form>
    </div>
  );
}
