import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import AccountsPage from './AccountsPage';
import GroupsPage from './GroupsPage';
import ModelPricesPage from './ModelPricesPage';
import { accountsApi, type Account } from '../api/admin/accounts';
import { groupsApi, type Group } from '../api/admin/groups';
import { modelPricesApi, type ModelPrice } from '../api/admin/model-prices';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';

type ChannelTab = 'accounts' | 'groups' | 'prices';

const TAB_ITEMS: Array<{
  key: ChannelTab;
  label: string;
  description: string;
}> = [
  {
    key: 'accounts',
    label: '上游账号',
    description: '维护 Provider 账号、协议能力、模型白名单和调度状态。',
  },
  {
    key: 'groups',
    label: '分组路由',
    description: '把账号编排成业务分组，配置倍率、协议策略和排除模型。',
  },
  {
    key: 'prices',
    label: '模型价格',
    description: '集中维护模型计费、通配匹配、图片与缓存价格。',
  },
];

const isChannelTab = (value: string | null): value is ChannelTab =>
  value === 'accounts' || value === 'groups' || value === 'prices';

const uniqueCount = (values: string[]) => new Set(values.filter(Boolean)).size;

function ChannelRedirect({ tab }: { tab: ChannelTab }) {
  return <Navigate to={`/admin/channels?tab=${tab}`} replace />;
}

function StatusChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-full border border-[#D8D5CC] bg-white/78 px-3 py-1.5 text-xs text-[#59616A] shadow-sm dark:border-white/10 dark:bg-white/[0.045] dark:text-dark-300">
      <span className="font-medium">{label}</span>
      <span className="ml-1 font-mono font-semibold text-[#101418] dark:text-white">{value}</span>
    </div>
  );
}

export function AdminChannelRedirect({ tab }: { tab: ChannelTab }) {
  return <ChannelRedirect tab={tab} />;
}

export default function ChannelManagementPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tabParam = searchParams.get('tab');
  const activeTab: ChannelTab = isChannelTab(tabParam) ? tabParam : 'accounts';
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [prices, setPrices] = useState<ModelPrice[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const [accountRes, groupRes, priceRes] = await Promise.all([
        accountsApi.list(),
        groupsApi.list(),
        modelPricesApi.list(0, 500),
      ]);
      setAccounts(accountRes.data.accounts ?? []);
      setGroups(groupRes.data.groups ?? []);
      setPrices(priceRes.data.prices ?? []);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview().catch(() => {
      setOverviewLoading(false);
    });
  }, [loadOverview]);

  const stats = useMemo(() => {
    const schedulableAccounts = accounts.filter((account) => account.schedulable).length;
    const enabledPrices = prices.filter((price) => price.enabled !== false).length;
    const providers = uniqueCount([
      ...accounts.map((account) => account.platform),
      ...groups.map((group) => group.provider ?? ''),
    ]);

    return {
      schedulableAccounts,
      enabledPrices,
      providers,
    };
  }, [accounts, groups, prices]);

  const setActiveTab = (tab: ChannelTab) => {
    navigate(`/admin/channels?tab=${tab}`);
  };

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden font-['Inter_var','Inter','ui-sans-serif','system-ui',sans-serif]">
      <section className="min-w-0 overflow-hidden rounded-[1.2rem] border border-[#D8D5CC] bg-white/72 p-2 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid grid-cols-3 gap-1">
          {TAB_ITEMS.map((item) => {
            const active = item.key === activeTab;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={clsx(
                  'min-w-0 rounded-[0.9rem] px-3 py-2 text-center text-sm font-black transition-[background-color,box-shadow,color] duration-200',
                  active
                    ? 'bg-[#101418] text-white shadow-[0_8px_18px_rgba(16,20,24,0.16)] dark:bg-white dark:text-[#101418]'
                    : 'text-[#59616A] hover:bg-white/80 hover:shadow-sm dark:text-dark-300 dark:hover:bg-white/[0.06]',
                )}
              >
                {item.label}
              </button>
            );
          })}
          </div>
          <div className="flex flex-wrap items-center gap-2 px-1">
            <StatusChip label="账号" value={`${stats.schedulableAccounts}/${accounts.length}`} />
            <StatusChip label="分组" value={groups.length} />
            <StatusChip label="价格" value={`${stats.enabledPrices}/${prices.length}`} />
            <StatusChip label="Provider" value={stats.providers} />
            <Button variant="secondary" size="sm" onClick={loadOverview} disabled={overviewLoading} className="border-[#D8D5CC] bg-white/80 text-[#101418] hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-dark-200">
              <Icon name="refresh" size="xs" />
              刷新
            </Button>
          </div>
        </div>
      </section>

      <section className="min-w-0 overflow-x-hidden rounded-[1.4rem] border border-[#D8D5CC] bg-white/58 p-3 shadow-[0_18px_42px_rgba(16,20,24,0.07)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
        {activeTab === 'accounts' && <AccountsPage />}
        {activeTab === 'groups' && <GroupsPage />}
        {activeTab === 'prices' && <ModelPricesPage />}
      </section>
    </div>
  );
}
