import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { oauthApi } from '../api/admin/oauth';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';

type Status = 'loading' | 'success' | 'error';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      setStatus('error');
      setMessage('缺少授权参数 (code 或 state)，请重新发起 OAuth 授权');
      return;
    }

    oauthApi
      .callback({ code, state })
      .then(({ data }) => {
        setStatus('success');
        setMessage(`OAuth 账号 "${data.name}" 已创建成功`);

        // Notify parent window if opened as popup
        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage(
              { type: 'OAUTH_CALLBACK_SUCCESS', data },
              window.location.origin
            );
          } catch {
            // Cross-origin, ignore
          }
        }
      })
      .catch((err) => {
        setStatus('error');
        const msg =
          err.response?.data?.message ??
          err.response?.data?.error ??
          err.message ??
          'OAuth 授权回调处理失败';
        setMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
      });
  }, [searchParams]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="card max-w-md w-full p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">正在处理授权回调...</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-dark-400">
              正在交换授权码获取 Token，请稍候
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Icon name="check" size="lg" className="text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">授权成功</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-dark-400">{message}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="secondary" onClick={() => window.close()}>
                关闭窗口
              </Button>
              <Button onClick={() => navigate('/admin/accounts', { replace: true })}>
                <Icon name="chevronLeft" size="sm" /> 返回账号列表
              </Button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <Icon name="x" size="lg" className="text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">授权失败</h2>
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{message}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="secondary" onClick={() => window.close()}>
                关闭窗口
              </Button>
              <Button onClick={() => navigate('/admin/accounts', { replace: true })}>
                <Icon name="chevronLeft" size="sm" /> 返回账号列表
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
