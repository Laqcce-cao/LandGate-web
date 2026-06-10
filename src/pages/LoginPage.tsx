import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setEmailError('');
    setNeedsVerification(false);

    if (!email.trim()) {
      setEmailError('请输入邮箱');
      return;
    }

    try {
      const redirectTo = await login(email, password);
      navigate(redirectTo);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg && /verify.*email|email.*verif/i.test(msg)) {
        setNeedsVerification(true);
      } else {
        setLoginError('邮箱或密码错误');
      }
    }
  };

  return (
    <div className="glass-card p-8 animate-scale-in">
      <form onSubmit={handleSubmit} className="space-y-5">
        {loginError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {loginError}
          </div>
        )}

        {needsVerification && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
            邮箱尚未验证，请检查收件箱中的验证邮件。
            <br />
            <Link
              to={`/verify-email?email=${encodeURIComponent(email)}`}
              className="font-medium text-violet-600 hover:text-violet-700 underline"
            >
              前往验证邮箱 →
            </Link>
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
              className={`input pl-10 ${emailError ? 'input-error' : ''}`}
              placeholder="请输入邮箱"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
              autoFocus
            />
          </div>
          {emailError && <p className="input-error-text">{emailError}</p>}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="input-label mb-0">密码</label>
            <Link to="/forgot-password" className="text-xs font-medium text-violet-600 hover:text-violet-700">
              忘记密码？
            </Link>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <Icon name="lock" size="sm" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              className="input pl-10 pr-10"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

        <Button type="submit" loading={loading} className="w-full" size="lg">
          登录
        </Button>

        <p className="text-center text-sm text-slate-400">
          还没有账号？{' '}
          <Link to="/register" className="font-medium text-violet-600 hover:text-violet-700">
            立即注册 →
          </Link>
        </p>
      </form>
    </div>
  );
}
