import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const register = useAuthStore((s) => s.register);
  const loading = useAuthStore((s) => s.loading);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('请输入邮箱');
      return;
    }

    if (!password) {
      setError('请输入密码');
      return;
    }

    if (password.length < 6) {
      setError('密码长度至少为 6 位');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    try {
      const redirectTo = await register(email, password);
      navigate(redirectTo);
    } catch {
      setError('注册失败，请稍后重试');
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

        <div>
          <label className="input-label">邮箱</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <Icon name="mail" size="sm" />
            </div>
            <input
              type="email"
              className="input pl-10"
              placeholder="请输入邮箱"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="input-label">密码</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <Icon name="lock" size="sm" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              className="input pl-10 pr-10"
              placeholder="请输入密码（至少6位）"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
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
          <label className="input-label">确认密码</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <Icon name="lock" size="sm" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              className="input pl-10"
              placeholder="请再次输入密码"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
            />
          </div>
        </div>

        <Button type="submit" loading={loading} className="w-full" size="lg">
          注册
        </Button>

        <p className="text-center text-sm text-slate-400">
          已有账号？{' '}
          <Link to="/login" className="font-medium text-violet-600 hover:text-violet-700">
            返回登录 →
          </Link>
        </p>
      </form>
    </div>
  );
}
