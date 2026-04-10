import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { IoSettingsOutline, IoCubeOutline, IoColorPaletteOutline, IoPowerOutline, IoInformationCircleOutline, IoClose, IoTrashOutline } from 'react-icons/io5';
import { usePlugins } from '../hooks/usePlugins';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const [activeTab, setActiveTab] = useState('plugins');
  const { plugins, loading, uninstallPlugin } = usePlugins();
  
  // 模拟设置状态（后续可以连接到实际的状态管理）
  const [settings, setSettings] = useState({
    autoStart: false,
    theme: 'system',
    language: 'zh-CN',
    showTrayIcon: true,
    enableAnimations: true,
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    console.log(`Setting changed: ${key} = ${value}`);
  };

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* 侧边导航 */}
      <div className="w-48 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IoSettingsOutline className="text-2xl text-blue-600" />
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">设置</h1>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <NavItem
            active={activeTab === 'plugins'}
            onClick={() => setActiveTab('plugins')}
            icon={<IoCubeOutline className="text-xl" />}
            label="插件管理"
          />
          <NavItem
            active={activeTab === 'appearance'}
            onClick={() => setActiveTab('appearance')}
            icon={<IoColorPaletteOutline className="text-xl" />}
            label="外观"
          />
          <NavItem
            active={activeTab === 'general'}
            onClick={() => setActiveTab('general')}
            icon={<IoSettingsOutline className="text-xl" />}
            label="通用"
          />
          <NavItem
            active={activeTab === 'about'}
            onClick={() => setActiveTab('about')}
            icon={<IoInformationCircleOutline className="text-xl" />}
            label="关于"
          />
        </nav>

        {/* Footer - Close Button */}
        <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <IoClose className="text-xl" />
            <span className="font-medium">关闭设置</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-4xl mx-auto">
          {activeTab === 'plugins' && <PluginsTab plugins={plugins} loading={loading} onUninstall={uninstallPlugin} />}
          {activeTab === 'appearance' && (
            <AppearanceTab
              theme={settings.theme}
              onThemeChange={(value) => handleSettingChange('theme', value)}
            />
          )}
          {activeTab === 'general' && (
            <GeneralTab
              autoStart={settings.autoStart}
              onAutoStartChange={(value) => handleSettingChange('autoStart', value)}
              language={settings.language}
              onLanguageChange={(value) => handleSettingChange('language', value)}
              showTrayIcon={settings.showTrayIcon}
              onShowTrayIconChange={(value) => handleSettingChange('showTrayIcon', value)}
              enableAnimations={settings.enableAnimations}
              onEnableAnimationsChange={(value) => handleSettingChange('enableAnimations', value)}
            />
          )}
          {activeTab === 'about' && <AboutTab />}
        </div>
      </div>
    </div>
  );
}

// Navigation Item Component
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
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
        active
          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

// 插件管理标签页
interface PluginsTabProps {
  plugins: any[];
  loading: boolean;
  onUninstall: (id: string) => void;
}

function PluginsTab({ plugins, loading, onUninstall }: PluginsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">已安装插件</h2>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          安装插件
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">加载中...</div>
      ) : plugins.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>暂无已安装的插件</p>
          <p className="text-sm mt-2">点击右上角“安装插件”按钮添加新插件</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{plugin.icon || '🔌'}</span>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100">{plugin.name}</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">v{plugin.version}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{plugin.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      invoke('log_frontend_message', { level: 'info', message: `User clicked uninstall for plugin: ${plugin.id}` });
                      onUninstall(plugin.id);
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="卸载插件"
                  >
                    <IoTrashOutline className="text-lg" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 外观设置标签页
interface AppearanceTabProps {
  theme: string;
  onThemeChange: (theme: string) => void;
}

function AppearanceTab({ theme, onThemeChange }: AppearanceTabProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">主题设置</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              主题模式
            </label>
            <select
              value={theme}
              onChange={(e) => onThemeChange(e.target.value)}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="system">跟随系统</option>
              <option value="light">浅色模式</option>
              <option value="dark">深色模式</option>
            </select>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => onThemeChange('light')}
              className={`text-center p-4 rounded-lg border-2 transition-all ${
                theme === 'light'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="w-full h-16 bg-gradient-to-br from-blue-50 to-purple-50 rounded mb-2"></div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">浅色</p>
            </button>
            <button
              onClick={() => onThemeChange('dark')}
              className={`text-center p-4 rounded-lg border-2 transition-all ${
                theme === 'dark'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="w-full h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded mb-2"></div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">深色</p>
            </button>
            <button
              onClick={() => onThemeChange('system')}
              className={`text-center p-4 rounded-lg border-2 transition-all ${
                theme === 'system'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="w-full h-16 bg-gradient-to-br from-gray-100 to-gray-800 rounded mb-2"></div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">自动</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 通用设置标签页
interface GeneralTabProps {
  autoStart: boolean;
  onAutoStartChange: (value: boolean) => void;
  language: string;
  onLanguageChange: (value: string) => void;
  showTrayIcon: boolean;
  onShowTrayIconChange: (value: boolean) => void;
  enableAnimations: boolean;
  onEnableAnimationsChange: (value: boolean) => void;
}

function GeneralTab({
  autoStart,
  onAutoStartChange,
  language,
  onLanguageChange,
  showTrayIcon,
  onShowTrayIconChange,
  enableAnimations,
  onEnableAnimationsChange,
}: GeneralTabProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">启动设置</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-100">开机自启</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">系统启动时自动运行 Quick Actions</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoStart}
                onChange={(e) => onAutoStartChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-100">显示托盘图标</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">在系统托盘中显示应用图标</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showTrayIcon}
                onChange={(e) => onShowTrayIconChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">语言与区域</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            界面语言
          </label>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="zh-CN">简体中文</option>
            <option value="en-US">English</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">动画效果</h3>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-800 dark:text-gray-100">启用动画</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">开启界面过渡动画效果</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enableAnimations}
              onChange={(e) => onEnableAnimationsChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
}

// 关于标签页
function AboutTab() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
            <IoSettingsOutline className="text-4xl text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Quick Actions</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">版本 0.1.0</p>
        </div>

        <hr className="my-4 border-gray-200 dark:border-gray-700" />

        <div className="space-y-3">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <div className="flex-1">
              <p className="font-medium text-gray-800 dark:text-gray-100">GitHub 仓库</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">查看源代码和提交问题</p>
            </div>
          </a>

          <div className="flex items-center gap-3 p-3 rounded-lg">
            <IoPowerOutline className="text-xl text-gray-700 dark:text-gray-300" />
            <div className="flex-1">
              <p className="font-medium text-gray-800 dark:text-gray-100">技术栈</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tauri + React + TypeScript + Rust</p>
            </div>
          </div>
        </div>

        <hr className="my-4 border-gray-200 dark:border-gray-700" />

        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>© 2024 Quick Actions. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
