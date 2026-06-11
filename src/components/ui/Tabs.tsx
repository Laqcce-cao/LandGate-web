import clsx from 'clsx';

interface TabItem {
  key: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ items, activeKey, onChange, className }: TabsProps) {
  return (
    <div className={clsx('tabs', className)}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={clsx('tab', item.key === activeKey && 'tab-active')}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
