import { useNavigate } from 'react-router-dom';
import { usageApi } from '../api/admin/usage';
import { Icon, type IconName } from '../components/ui/Icon';
import { TokenUsageChart } from '../components/charts/TokenUsageChart';

interface QuickLink {
  path: string;
  icon: IconName;
  color: string;
  title: string;
  desc: string;
}

const quickLinks: QuickLink[] = [
  {
    path: '/api-keys',
    icon: 'key',
    color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
    title: '创建 API Key',
    desc: '前往 API Keys 页面创建您的第一个密钥',
  },
  {
    path: '/usage',
    icon: 'chartBar',
    color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    title: '查看用量',
    desc: '在用量统计页面实时查看 API 调用情况',
  },
  {
    path: '/redeem',
    icon: 'gift',
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    title: '兑换充值',
    desc: '使用兑换码为账户充值余额',
  },
];

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Quick start guide */}
      <div className="card mb-8 p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">快速开始</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className="cursor-pointer rounded-xl border border-gray-100 p-4 text-left transition-colors hover:border-gray-200 hover:bg-gray-50 dark:border-dark-700 dark:hover:border-dark-600 dark:hover:bg-dark-800/50"
            >
              <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-lg ${link.color}`}>
                <Icon name={link.icon} size="md" />
              </div>
              <h4 className="mb-1 text-sm font-medium text-gray-900 dark:text-white">{link.title}</h4>
              <p className="text-xs text-gray-500 dark:text-dark-400">{link.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Token usage chart */}
      <TokenUsageChart
        fetchLogs={(page, size) => usageApi.myUsage(page, size)}
        title="Token 用量趋势"
      />
    </div>
  );
}
