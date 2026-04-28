import { Card } from '@heroui/react';

interface SettingsCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 可复用的设置卡片组件
 * 用于统一设置页面的卡片样式
 */
export function SettingsCard({ children, className = '' }: SettingsCardProps) {
  return (
    <Card className={`bg-content2 dark:bg-content2/50 border border-divider rounded-medium ${className}`}>
      {children}
    </Card>
  );
}
