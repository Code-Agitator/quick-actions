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
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-start gap-3 px-4 py-2.5 h-auto min-h-[44px] rounded-lg transition-all duration-150 ${
        active 
          ? 'bg-primary text-white' 
          : 'hover:bg-default-200 text-default-600 dark:text-default-400'
      }`}
      aria-label={label}
    >
      <span className="text-xl flex-shrink-0">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

export function SettingsSidebar({ activeTab, onTabChange, onClose }: SettingsSidebarProps) {
  return (
    <aside className="w-48 flex-shrink-0 bg-default-50 dark:bg-default-100 border-r border-divider flex flex-col">
      {/* 头部 */}
      <header className="p-4 border-b border-divider flex items-center justify-center">
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onPress={onClose}
          className="min-w-8 w-8 h-8"
        >
          <IoClose className="text-large" />
        </Button>
      </header>

      {/* 导航项 */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-1 scrollbar-hide">
        <NavItem
          active={activeTab === 'appearance'}
          onClick={() => onTabChange('appearance')}
          icon={<IoColorPaletteOutline />}
          label="外观"
        />
        <NavItem
          active={activeTab === 'general'}
          onClick={() => onTabChange('general')}
          icon={<IoSettingsOutline />}
          label="通用"
        />
        <NavItem
          active={activeTab === 'plugins'}
          onClick={() => onTabChange('plugins')}
          icon={<IoCubeOutline />}
          label="插件"
        />

        <Divider className="my-2" />

        <NavItem
          active={activeTab === 'about'}
          onClick={() => onTabChange('about')}
          icon={<IoInformationCircleOutline />}
          label="关于"
        />
        {import.meta.env.DEV && (
          <NavItem
            active={activeTab === 'debug'}
            onClick={() => onTabChange('debug')}
            icon={<IoBugOutline />}
            label="调试"
          />
        )}
      </nav>
    </aside>
  );
}
