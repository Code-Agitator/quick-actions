import { Button, Divider } from '@heroui/react';
import { IoClose, IoSettingsOutline, IoCubeOutline, IoColorPaletteOutline, IoInformationCircleOutline, IoBugOutline } from 'react-icons/io5';

interface SettingsSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onClose: () => void;
}

interface NavItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function NavItem({ active, onClick, icon, label }: NavItemProps) {
  return (
    <Button
      variant={active ? "solid" : "light"}
      color={active ? "primary" : undefined}
      onPress={onClick}
      className={`w-full justify-start gap-3 px-3 py-2 h-auto min-h-[36px] rounded-md text-small ${
        active ? 'font-medium' : ''
      }`}
    >
      {icon}
      <span>{label}</span>
    </Button>
  );
}

export function SettingsSidebar({ activeTab, onTabChange, onClose }: SettingsSidebarProps) {
  return (
    <aside className="w-52 flex-shrink-0 bg-default-50 dark:bg-default-100 border-r border-divider flex flex-col">
      {/* 头部 */}
      <header className="p-4 border-b border-divider">
        <div className="flex items-center justify-between">
          <h1 className="text-small font-semibold">设置</h1>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={onClose}
            className="min-w-8 w-8 h-8"
          >
            <IoClose className="text-large" />
          </Button>
        </div>
      </header>

      {/* 导航项 */}
      <nav className="flex-1 overflow-y-auto py-2">
        {/* 应用设置分组 */}
        <div className="px-3 py-2">
          <p className="text-tiny text-default-500 font-medium px-2 mb-1">应用设置</p>
          <NavItem
            active={activeTab === 'appearance'}
            onClick={() => onTabChange('appearance')}
            icon={<IoColorPaletteOutline className="text-medium" />}
            label="外观"
          />
          <NavItem
            active={activeTab === 'general'}
            onClick={() => onTabChange('general')}
            icon={<IoSettingsOutline className="text-medium" />}
            label="通用"
          />
          <NavItem
            active={activeTab === 'plugins'}
            onClick={() => onTabChange('plugins')}
            icon={<IoCubeOutline className="text-medium" />}
            label="插件管理"
          />
        </div>

        <Divider className="my-2" />

        {/* 其他分组 */}
        <div className="px-3 py-2">
          <p className="text-tiny text-default-500 font-medium px-2 mb-1">其他</p>
          <NavItem
            active={activeTab === 'about'}
            onClick={() => onTabChange('about')}
            icon={<IoInformationCircleOutline className="text-medium" />}
            label="关于"
          />
          {import.meta.env.DEV && (
            <NavItem
              active={activeTab === 'debug'}
              onClick={() => onTabChange('debug')}
              icon={<IoBugOutline className="text-medium" />}
              label="开发者选项"
            />
          )}
        </div>
      </nav>
    </aside>
  );
}
