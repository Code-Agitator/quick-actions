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
    <div className="h-screen flex items-center justify-center bg-black/50 backdrop-blur-xl">
      {/* macOS 风格设置窗口 - 暗色调 */}
      <div className="w-[800px] h-[560px] bg-gray-900/95 backdrop-blur-3xl rounded-2xl shadow-2xl overflow-hidden flex border border-white/10">
        {/* 侧边导航 - 暗色调 */}
        <div className="w-48 flex-shrink-0 bg-gray-800/80 backdrop-blur-xl flex flex-col border-r border-white/10">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h1 className="text-xs font-semibold text-gray-200 tracking-wide uppercase">设置</h1>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded-md transition-colors duration-150"
              >
                <IoClose className="text-lg text-gray-400" />
              </button>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
            <NavItem
              active={activeTab === 'plugins'}
              onClick={() => setActiveTab('plugins')}
              icon={<IoCubeOutline className="text-base" />}
              label="插件管理"
            />
            <NavItem
              active={activeTab === 'appearance'}
              onClick={() => setActiveTab('appearance')}
              icon={<IoColorPaletteOutline className="text-base" />}
              label="外观"
            />
            <NavItem
              active={activeTab === 'general'}
              onClick={() => setActiveTab('general')}
              icon={<IoSettingsOutline className="text-base" />}
              label="通用"
            />
            <NavItem
              active={activeTab === 'about'}
              onClick={() => setActiveTab('about')}
              icon={<IoInformationCircleOutline className="text-base" />}
              label="关于"
            />
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-900/60 backdrop-blur-sm">
          <div className="p-6">
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
      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all duration-150 text-sm ${
        active
          ? 'bg-blue-500/20 text-blue-400 font-medium'
          : 'text-gray-300 hover:bg-white/[0.06]'
      }`}
    >
      {icon}
      <span>{label}</span>
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
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-100 tracking-tight">已安装插件</h2>
        <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-150 text-xs font-medium shadow-sm">
          安装插件
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">加载中...</div>
      ) : plugins.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>暂无已安装的插件</p>
          <p className="text-sm mt-2">点击右上角"安装插件"按钮添加新插件</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              className="bg-gray-800/60 backdrop-blur-sm border border-white/10 rounded-xl p-3.5 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg opacity-90">{plugin.icon || '🔌'}</span>
                    <h3 className="font-medium text-gray-100 text-sm tracking-tight">{plugin.name}</h3>
                    <span className="text-[10px] px-1.5 py-0.5 bg-white/[0.08] text-gray-400/80 rounded-md font-medium">v{plugin.version}</span>
                  </div>
                  <p className="text-xs text-gray-400/70 mt-1 leading-relaxed">{plugin.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      invoke('log_frontend_message', { level: 'info', message: `User clicked uninstall for plugin: ${plugin.id}` });
                      onUninstall(plugin.id);
                    }}
                    className="p-1.5 text-red-500/80 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-150"
                    title="卸载插件"
                  >
                    <IoTrashOutline className="text-base" />
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
    <div className="space-y-4">
      <div className="bg-gray-800/60 backdrop-blur-sm border border-white/10 rounded-xl p-4.5">
        <h3 className="text-sm font-semibold text-gray-100 mb-3 tracking-tight">主题设置</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              主题模式
            </label>
            <select
              value={theme}
              onChange={(e) => onThemeChange(e.target.value)}
              className="w-full max-w-xs px-2.5 py-1.5 border border-white/10 rounded-lg bg-gray-700/80 text-gray-100 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all duration-150 backdrop-blur-sm"
            >
              <option value="system">跟随系统</option>
              <option value="light">浅色模式</option>
              <option value="dark">深色模式</option>
            </select>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => onThemeChange('light')}
              className={`text-center p-3 rounded-xl border-2 transition-all duration-200 ${
                theme === 'light'
                  ? 'border-blue-500/60 bg-blue-50/60 dark:bg-blue-900/15 shadow-sm'
                  : 'border-gray-200/60 dark:border-gray-700/50 hover:border-gray-300/70 hover:shadow-sm'
              }`}
            >
              <div className="w-full h-12 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg mb-1.5 shadow-inner"></div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">浅色</p>
            </button>
            <button
              onClick={() => onThemeChange('dark')}
              className={`text-center p-3 rounded-xl border-2 transition-all duration-200 ${
                theme === 'dark'
                  ? 'border-blue-500/60 bg-blue-50/60 dark:bg-blue-900/15 shadow-sm'
                  : 'border-gray-200/60 dark:border-gray-700/50 hover:border-gray-300/70 hover:shadow-sm'
              }`}
            >
              <div className="w-full h-12 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg mb-1.5 shadow-inner"></div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">深色</p>
            </button>
            <button
              onClick={() => onThemeChange('system')}
              className={`text-center p-3 rounded-xl border-2 transition-all duration-200 ${
                theme === 'system'
                  ? 'border-blue-500/60 bg-blue-50/60 dark:bg-blue-900/15 shadow-sm'
                  : 'border-gray-200/60 dark:border-gray-700/50 hover:border-gray-300/70 hover:shadow-sm'
              }`}
            >
              <div className="w-full h-12 bg-gradient-to-br from-gray-100 to-gray-800 rounded-lg mb-1.5 shadow-inner"></div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">自动</p>
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
    <div className="space-y-4">
      <div className="bg-gray-800/60 backdrop-blur-sm border border-white/10 rounded-xl p-4.5">
        <h3 className="text-sm font-semibold text-gray-100 mb-3 tracking-tight">启动设置</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-100 text-sm tracking-tight">开机自启</p>
              <p className="text-xs text-gray-400/70 mt-0.5">系统启动时自动运行 Quick Actions</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoStart}
                onChange={(e) => onAutoStartChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <hr className="border-white/10" />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-100 text-sm tracking-tight">显示托盘图标</p>
              <p className="text-xs text-gray-400/70 mt-0.5">在系统托盘中显示应用图标</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showTrayIcon}
                onChange={(e) => onShowTrayIconChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/60 backdrop-blur-sm border border-white/10 rounded-xl p-4.5">
        <h3 className="text-sm font-semibold text-gray-100 mb-3 tracking-tight">语言与区域</h3>
        
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1.5">
            界面语言
          </label>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="w-full max-w-xs px-2.5 py-1.5 border border-white/10 rounded-lg bg-gray-700/80 text-gray-100 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all duration-150 backdrop-blur-sm"
          >
            <option value="zh-CN">简体中文</option>
            <option value="en-US">English</option>
          </select>
        </div>
      </div>

      <div className="bg-gray-800/60 backdrop-blur-sm border border-white/10 rounded-xl p-4.5">
        <h3 className="text-sm font-semibold text-gray-100 mb-3 tracking-tight">动画效果</h3>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-100 text-sm tracking-tight">启用动画</p>
            <p className="text-xs text-gray-400/70 mt-0.5">开启界面过渡动画效果</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enableAnimations}
              onChange={(e) => onEnableAnimationsChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
}

// 关于标签页
function AboutTab() {
  return (
    <div className="space-y-4">
      <div className="bg-gray-800/60 backdrop-blur-sm border border-white/10 rounded-xl p-5">
        <div className="text-center mb-4">
          <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <IoSettingsOutline className="text-3xl text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-100 tracking-tight">Quick Actions</h2>
          <p className="text-gray-400/70 mt-1 text-sm font-medium">版本 0.1.0</p>
        </div>

        <hr className="my-3 border-white/10" />

        <div className="space-y-2">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/[0.06] transition-all duration-150"
          >
            <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <div className="flex-1">
              <p className="font-medium text-gray-100 text-sm tracking-tight">GitHub 仓库</p>
              <p className="text-xs text-gray-400/70">查看源代码和提交问题</p>
            </div>
          </a>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl">
            <IoPowerOutline className="text-lg text-gray-400" />
            <div className="flex-1">
              <p className="font-medium text-gray-100 text-sm tracking-tight">技术栈</p>
              <p className="text-xs text-gray-400/70">Tauri + React + TypeScript + Rust</p>
            </div>
          </div>
        </div>

        <hr className="my-3 border-white/10" />

        <div className="text-center text-xs text-gray-500/60 font-medium">
          <p>© 2024 Quick Actions. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
