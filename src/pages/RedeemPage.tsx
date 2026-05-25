import { useState, type FormEvent } from 'react';
import client from '../api/client';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { useToastStore } from '../stores/toastStore';
import { useAuthStore } from '../stores/authStore';

export default function RedeemPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  const fetchUser = useAuthStore((s) => s.fetchUser);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      addToast({ type: 'warning', message: '请输入兑换码' });
      return;
    }

    setLoading(true);
    try {
      await client.post('/codes/redeem', { code: code.trim() });
      addToast({ type: 'success', message: '兑换成功！余额已更新' });
      setCode('');
      fetchUser();
    } catch {
      addToast({ type: 'error', message: '兑换失败，请检查兑换码是否有效' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mx-auto max-w-md">
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">兑换码</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Icon name="gift" size="sm" />
                </div>
                <input
                  type="text"
                  className="input pl-10"
                  placeholder="请输入兑换码"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" loading={loading} className="w-full">
              <Icon name="gift" size="sm" />
              兑换
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
