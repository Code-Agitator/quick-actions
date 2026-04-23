import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, Button, Chip, Tooltip } from '@heroui/react';
import { IoSettingsOutline, IoCubeOutline, IoColorPaletteOutline, IoPowerOutline, IoInformationCircleOutline, IoClose, IoTrashOutline, IoBugOutline } from 'react-icons/io5';
import { Pin, PinOff } from 'lucide-react';
import { usePlugins } from '../hooks/usePlugins';
import { useDebug } from '../context/DebugContext';
import { useAppSettings } from '../hooks/useAppSettings';
import { userBehaviorTracker } from '../utils/userBehavior';
import { searchCache } from '../utils/searchCache';

interface SettingsProps {
  onClose: () => void;
  onTogglePin?: (id: string, pinned: boolean) => void;
}

// 可复用的设置卡片组件 - 使用 HeroUI Card
interface SettingsCardProps {
  children: React.ReactNode;
  className?: string;
}

function SettingsCard({ children, className = '' }: SettingsCardProps) {
  return (
    <Card className={`bg-white/50 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/10 rounded-md backdrop-blur-sm ${className}`}>
      {children}
    </Card>
  );
}

export function Settings({ onClose, onTogglePin }: SettingsProps) {
  const [activeTab, setActiveTab] = useState('plugins');
  const { plugins, loading, uninstallPlugin } = usePlugins();
  const { settings: debugSettings, toggleDebug, isDebugOpen, togglePanel } = useDebug();
  const { settings, updateSetting, resetSettings } = useAppSettings();

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden m-0 p-0">
      {/* iOS 风格设置窗口 - 毛玻璃质感，占满全屏 */}
      <div className="flex-1 ios-frosted overflow-hidden flex">
        {/* 侧边导航 - 使用与主容器相同的背景 */}
        <div className="w-48 flex-shrink-0 bg-transparent flex flex-col border-r border-white/10">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200/50 dark:border-white/10">
            <div className="flex items-center justify-between">
              <h1 className="text-xs font-semibold text-gray-700 dark:text-gray-200 tracking-wide uppercase">设置</h1>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                onPress={onClose}
                className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-colors duration-150"
              >
                <IoClose className="text-lg text-gray-500 dark:text-gray-400" />
              </Button>
            </div>
          </div>

          {/* Navigation Items - 使用自定义导航 */}
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
            {import.meta.env.DEV && (
              <NavItem
                active={activeTab === 'debug'}
                onClick={() => setActiveTab('debug')}
                icon={<IoBugOutline className="text-base" />}
                label="开发者选项"
              />
            )}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-transparent">
          <div className="px-6 py-4">
            {activeTab === 'plugins' && <PluginsTab plugins={plugins} loading={loading} onUninstall={uninstallPlugin} onTogglePin={onTogglePin} />}
            {activeTab === 'appearance' && (
              <AppearanceTab
                theme={settings.theme}
                onThemeChange={(value) => updateSetting('theme', value as 'system' | 'light' | 'dark')}
                windowOpacity={settings.windowOpacity}
                onWindowOpacityChange={(value) => updateSetting('windowOpacity', value)}
                layoutDensity={settings.layoutDensity}
                onLayoutDensityChange={(value) => updateSetting('layoutDensity', value)}
              />
            )}
            {activeTab === 'general' && (
              <GeneralTab
                autoStart={settings.autoStart}
                onAutoStartChange={(value) => updateSetting('autoStart', value)}
                language={settings.language}
                onLanguageChange={(value) => updateSetting('language', value as 'zh-CN' | 'en-US')}
                showTrayIcon={settings.showTrayIcon}
                onShowTrayIconChange={(value) => updateSetting('showTrayIcon', value)}
                enableAnimations={settings.enableAnimations}
                onEnableAnimationsChange={(value) => updateSetting('enableAnimations', value)}
                globalShortcut={settings.globalShortcut}
                onGlobalShortcutChange={async (value) => {
                  updateSetting('globalShortcut', value);
                  // 立即更新后端快捷键注册
                  try {
                    console.log('[Settings] Updating global shortcut to:', value);
                    await invoke('update_global_shortcut', { shortcut: value });
                    console.log('[Settings] ✓ Global shortcut updated successfully');
                  } catch (error) {
                    console.error('[Settings] Failed to update global shortcut:', error);
                  }
                }}
              />
            )}
            {activeTab === 'about' && <AboutTab onReset={resetSettings} />}
            {import.meta.env.DEV && activeTab === 'debug' && (
              <DebugTab
                debugSettings={debugSettings}
                onToggleDebug={toggleDebug}
                isDebugOpen={isDebugOpen}
                onTogglePanel={togglePanel}
              />
            )}
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
      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all duration-150 text-sm ${
        active
          ? 'bg-blue-500/20 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-medium'
          : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/[0.06]'
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
  onTogglePin?: (id: string, pinned: boolean) => void;
}

function PluginsTab({ plugins, loading, onUninstall, onTogglePin }: PluginsTabProps) {
  const { isPluginPinned, getPinnedPlugins } = useAppSettings();
  // 使用 state 来跟踪 pinned 插件列表，以便在变化时重新渲染
  const [_pinnedPlugins, setPinnedPlugins] = useState<Set<string>>(() => getPinnedPlugins());

  // 监听 pinned 插件变化
  useEffect(() => {
    const handleStorageChange = () => {
      setPinnedPlugins(getPinnedPlugins());
    };

    // 监听 storage 事件（跨标签页）
    window.addEventListener('storage', handleStorageChange);
    
    // 自定义事件（同一页面）
    window.addEventListener('plugin-pinned-changed', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('plugin-pinned-changed', handleStorageChange);
    };
  }, [getPinnedPlugins]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 tracking-tight">已安装插件</h2>
        <Button
          size="sm"
          variant="primary"
          className="px-3 py-1.5 bg-blue-600/80 hover:bg-blue-700/90 text-white rounded-md transition-colors duration-150 text-xs font-medium shadow-sm backdrop-blur-sm border border-white/10 dark:border-white/15"
        >
          安装插件
        </Button>
      </div>
    
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">加载中...</div>
      ) : plugins.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>暂无已安装的插件</p>
          <p className="text-sm mt-2">点击右上角"安装插件"按钮添加新插件</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {plugins.map((plugin) => {
            // 合并 plugin.json 中的 pinned 和 localStorage 中的 pinned
            const isPinned = plugin.pinned || isPluginPinned(plugin.id);
            
            return (
              <SettingsCard key={plugin.id} className="p-3.5 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg opacity-90">{plugin.icon || '🔌'}</span>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm tracking-tight">{plugin.name}</h3>
                      <Chip
                        size="sm"
                        variant="soft"
                        className="text-[10px] px-1.5 py-0.5 bg-black/5 dark:bg-white/[0.08] text-gray-600 dark:text-gray-400/80 rounded-md font-medium"
                      >
                        v{plugin.version}
                      </Chip>
                      {isPinned && (
                        <Chip
                          size="sm"
                          color="accent"
                          variant="soft"
                          className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md font-medium flex items-center gap-1"
                        >
                          <Pin className="w-3 h-3" />
                          已固定
                        </Chip>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400/70 mt-1 leading-relaxed">{plugin.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {onTogglePin && (
                      <Tooltip>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          onPress={() => onTogglePin(plugin.id, !isPinned)}
                          className={`p-1.5 rounded-md transition-all duration-150 ${
                            isPinned
                              ? 'text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          {isPinned ? (
                            <Pin className="w-4 h-4" />
                          ) : (
                            <PinOff className="w-4 h-4" />
                          )}
                        </Button>
                        <Tooltip.Content>
                          {isPinned ? '取消固定' : '固定在搜索结果'}
                        </Tooltip.Content>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        className="p-1.5 text-red-500/80 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all duration-150"
                        onPress={() => {
                          invoke('log_frontend_message', { level: 'info', message: `User clicked uninstall for plugin: ${plugin.id}` });
                          onUninstall(plugin.id);
                        }}
                      >
                        <IoTrashOutline className="text-base" />
                      </Button>
                      <Tooltip.Content>
                        卸载插件
                      </Tooltip.Content>
                    </Tooltip>
                  </div>
                </div>
              </SettingsCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 外观设置标签页
interface AppearanceTabProps {
  theme: string;
  onThemeChange: (theme: string) => void;
  windowOpacity: number;
  onWindowOpacityChange: (value: number) => void;
  layoutDensity: 'compact' | 'comfortable';
  onLayoutDensityChange: (density: 'compact' | 'comfortable') => void;
}

function AppearanceTab({ 
  theme, 
  onThemeChange, 
  windowOpacity, 
  onWindowOpacityChange,
  layoutDensity,
  onLayoutDensityChange 
}: AppearanceTabProps) {
  return (
    <div className="space-y-4">
      <SettingsCard className="p-4.5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 tracking-tight">主题设置</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              主题模式
            </label>
            <select
              value={theme}
              onChange={(e) => onThemeChange(e.target.value)}
              className="w-full max-w-xs px-2.5 py-1.5 border border-gray-300/50 dark:border-white/10 rounded-md bg-white dark:bg-gray-700/60 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all duration-150 backdrop-blur-sm"
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
              className={`text-center p-3 rounded-md border-2 transition-all duration-200 ${
                theme === 'light'
                  ? 'border-blue-500/60 bg-blue-50/60 dark:bg-blue-900/15 shadow-sm'
                  : 'border-gray-200/60 dark:border-gray-700/50 hover:border-gray-300/70 hover:shadow-sm'
              }`}
            >
              <div className="w-full h-12 bg-gradient-to-br from-white/90 to-gray-100/80 rounded-md mb-1.5 shadow-inner border border-gray-200/50"></div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">浅色</p>
            </button>
            <button
              onClick={() => onThemeChange('dark')}
              className={`text-center p-3 rounded-md border-2 transition-all duration-200 ${
                theme === 'dark'
                  ? 'border-blue-500/60 bg-blue-50/60 dark:bg-blue-900/15 shadow-sm'
                  : 'border-gray-200/60 dark:border-gray-700/50 hover:border-gray-300/70 hover:shadow-sm'
              }`}
            >
              <div className="w-full h-12 bg-gradient-to-br from-gray-800/90 to-gray-900/80 rounded-md mb-1.5 shadow-inner border border-gray-700/50"></div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">深色</p>
            </button>
            <button
              onClick={() => onThemeChange('system')}
              className={`text-center p-3 rounded-md border-2 transition-all duration-200 ${
                theme === 'system'
                  ? 'border-blue-500/60 bg-blue-50/60 dark:bg-blue-900/15 shadow-sm'
                  : 'border-gray-200/60 dark:border-gray-700/50 hover:border-gray-300/70 hover:shadow-sm'
              }`}
            >
              <div className="w-full h-12 bg-gradient-to-br from-white/70 via-gray-100/60 to-gray-800/70 rounded-md mb-1.5 shadow-inner border border-gray-300/40 dark:border-gray-600/40"></div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">自动</p>
            </button>
          </div>
        </div>
      </SettingsCard>

      {/* 窗口透明度设置 */}
      <SettingsCard className="p-4.5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 tracking-tight">窗口外观</h3>
        
        <div className="space-y-4">
          {/* 布局密度设置 */}
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              搜索结果布局
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onLayoutDensityChange('compact')}
                className={`text-center p-2.5 rounded-md border-2 transition-all duration-200 ${
                  layoutDensity === 'compact'
                    ? 'border-blue-500/60 bg-blue-50/60 dark:bg-blue-900/15 shadow-sm'
                    : 'border-gray-200/60 dark:border-gray-700/50 hover:border-gray-300/70 hover:shadow-sm'
                }`}
              >
                <div className="space-y-1 mb-1.5">
                  <div className="h-1.5 bg-current opacity-30 rounded"></div>
                  <div className="h-1.5 bg-current opacity-30 rounded w-3/4"></div>
                  <div className="h-1.5 bg-current opacity-30 rounded w-1/2"></div>
                </div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">紧凑</p>
              </button>
              <button
                onClick={() => onLayoutDensityChange('comfortable')}
                className={`text-center p-2.5 rounded-md border-2 transition-all duration-200 ${
                  layoutDensity === 'comfortable'
                    ? 'border-blue-500/60 bg-blue-50/60 dark:bg-blue-900/15 shadow-sm'
                    : 'border-gray-200/60 dark:border-gray-700/50 hover:border-gray-300/70 hover:shadow-sm'
                }`}
              >
                <div className="space-y-1.5 mb-1.5">
                  <div className="h-2 bg-current opacity-30 rounded"></div>
                  <div className="h-2 bg-current opacity-30 rounded w-3/4"></div>
                  <div className="h-2 bg-current opacity-30 rounded w-1/2"></div>
                </div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">宽松</p>
              </button>
            </div>
          </div>

          {/* 窗口透明度 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                窗口透明度
              </label>
              <span className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-md">
                {Math.round(windowOpacity * 100)}%
              </span>
            </div>
            
            <input
              type="range"
              min="50"
              max="100"
              step="5"
              value={Math.round(windowOpacity * 100)}
              onChange={(e) => onWindowOpacityChange(Number(e.target.value) / 100)}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700/60 rounded-md appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
              style={{
                background: `linear-gradient(to right, rgba(59, 130, 246, 0.6) 0%, rgba(59, 130, 246, 0.6) ${((windowOpacity - 0.5) / 0.5) * 100}%, rgba(156, 163, 175, 0.6) ${((windowOpacity - 0.5) / 0.5) * 100}%, rgba(156, 163, 175, 0.6) 100%)`
              }}
            />
            
            <div className="flex justify-between mt-1.5 text-[10px] text-gray-500 dark:text-gray-400">
              <span>透明</span>
              <span>不透明</span>
            </div>
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
            <p className="text-xs text-blue-600 dark:text-blue-300/90">
              💡 提示：调整透明度可以改变窗口的视觉效果，较低的透明度会让背景更加明显。
            </p>
          </div>
        </div>
      </SettingsCard>
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
  globalShortcut: string;
  onGlobalShortcutChange: (value: string) => void;
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
  globalShortcut,
  onGlobalShortcutChange,
}: GeneralTabProps) {
  // 【新特性】快捷键可用性状态
  const [shortcutAvailable, setShortcutAvailable] = useState<boolean | null>(null);
  const [checkingShortcut, setCheckingShortcut] = useState(false);
  
  // 使用 ref 跟踪是否已经检查过当前快捷键，避免重复检查
  const lastCheckedShortcut = useRef<string>('');

  // 监听快捷键变化，检查是否可用
  useEffect(() => {
    // 如果和上次检查的是同一个快捷键，跳过检查
    if (globalShortcut === lastCheckedShortcut.current) {
      return;
    }
    
    let mounted = true;
    
    const checkAvailability = async () => {
      setCheckingShortcut(true);
      try {
        const available = await invoke('check_shortcut_available', { shortcut: globalShortcut });
        if (mounted) {
          setShortcutAvailable(available as boolean);
          lastCheckedShortcut.current = globalShortcut; // 记录已检查的快捷键
          console.log('[Settings] Shortcut availability:', available);
        }
      } catch (error) {
        console.error('[Settings] Failed to check shortcut availability:', error);
        if (mounted) {
          setShortcutAvailable(null);
        }
      } finally {
        if (mounted) {
          setCheckingShortcut(false);
        }
      }
    };

    // 立即执行检查，不使用延迟（因为已经有去重逻辑）
    checkAvailability();
    
    return () => {
      mounted = false;
    };
  }, [globalShortcut]);
  return (
    <div className="space-y-4">
      <SettingsCard className="p-4.5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 tracking-tight">启动设置</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100 text-sm tracking-tight">开机自启</p>
              <p className="text-xs text-gray-600 dark:text-gray-400/70 mt-0.5">系统启动时自动运行 Quick Actions</p>
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

          <hr className="border-gray-200/50 dark:border-white/10" />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100 text-sm tracking-tight">显示托盘图标</p>
              <p className="text-xs text-gray-600 dark:text-gray-400/70 mt-0.5">在系统托盘中显示应用图标</p>
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
      </SettingsCard>

      <SettingsCard className="p-4.5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 tracking-tight">快捷键设置</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              呼出窗口快捷键
            </label>
            <div className="flex items-center gap-2">
              <select
                value={globalShortcut}
                onChange={(e) => onGlobalShortcutChange(e.target.value)}
                disabled={checkingShortcut}
                className={`w-full max-w-xs px-2.5 py-1.5 border rounded-md bg-white dark:bg-gray-700/60 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all duration-150 backdrop-blur-sm ${
                  checkingShortcut 
                    ? 'border-gray-300/50 dark:border-white/10 opacity-60 cursor-not-allowed'
                    : shortcutAvailable === false
                    ? 'border-yellow-400 dark:border-yellow-500/60'
                    : 'border-gray-300/50 dark:border-white/10'
                }`}
              >
                <option value="Ctrl+Space">Ctrl + Space</option>
                <option value="Alt+Space">Alt + Space</option>
                <option value="Ctrl+Shift+Space">Ctrl + Shift + Space</option>
                <option value="Alt+Shift+Space">Alt + Shift + Space</option>
                <option value="Ctrl+`">Ctrl + `</option>
                <option value="Alt+`">Alt + `</option>
              </select>
              
              {/* 状态指示器 - 仅在检查中或冲突时显示 */}
              {checkingShortcut && (
                <div className="flex-shrink-0 w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              )}
              {!checkingShortcut && shortcutAvailable === false && (
                <div className="flex-shrink-0 flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              )}
            </div>
            
            {/* 状态提示文字 - 仅在冲突时显示 */}
            {checkingShortcut && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                ⏳ 正在检查快捷键可用性...
              </p>
            )}
            {!checkingShortcut && shortcutAvailable === false && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400/80 mt-1.5">
                ⚠️ 此快捷键可能已被其他应用占用
              </p>
            )}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard className="p-4.5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 tracking-tight">语言与区域</h3>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            界面语言
          </label>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="w-full max-w-xs px-2.5 py-1.5 border border-gray-300/50 dark:border-white/10 rounded-md bg-white dark:bg-gray-700/60 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all duration-150 backdrop-blur-sm"
          >
            <option value="zh-CN">简体中文</option>
            <option value="en-US">English</option>
          </select>
        </div>
      </SettingsCard>

      <SettingsCard className="p-4.5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 tracking-tight">动画效果</h3>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm tracking-tight">启用动画</p>
            <p className="text-xs text-gray-600 dark:text-gray-400/70 mt-0.5">开启界面过渡动画效果</p>
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
      </SettingsCard>
    </div>
  );
}

// 关于标签页
function AboutTab({ onReset }: { onReset?: () => void }) {
  return (
    <div className="space-y-4">
      <SettingsCard className="p-5">
        <div className="text-center mb-4">
          <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-blue-500/80 to-purple-600/80 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-sm border border-white/10">
            <IoSettingsOutline className="text-3xl text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Quick Actions</h2>
          <p className="text-gray-600 dark:text-gray-400/70 mt-1 text-sm font-medium">版本 0.1.0</p>
        </div>

        <hr className="my-3 border-gray-200/50 dark:border-white/10" />

        <div className="space-y-2">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 p-2.5 rounded-md hover:bg-black/5 dark:hover:bg-white/[0.06] transition-all duration-150"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-gray-100 text-sm tracking-tight">GitHub 仓库</p>
              <p className="text-xs text-gray-600 dark:text-gray-400/70">查看源代码和提交问题</p>
            </div>
          </a>

          <div className="flex items-center gap-2.5 p-2.5 rounded-md">
            <IoPowerOutline className="text-lg text-gray-500 dark:text-gray-400" />
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-gray-100 text-sm tracking-tight">技术栈</p>
              <p className="text-xs text-gray-600 dark:text-gray-400/70">Tauri + React + TypeScript + Rust</p>
            </div>
          </div>
        </div>

        <hr className="my-3 border-gray-200/50 dark:border-white/10" />

        {/* Reset Settings Button */}
        <button
          onClick={() => {
            if (window.confirm('确定要重置所有设置为默认值吗？')) {
              onReset?.();
            }
          }}
          className="w-full flex items-center justify-center gap-2 p-2.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all duration-150 font-medium text-sm"
        >
          <IoPowerOutline className="text-base" />
          <span>重置所有设置</span>
        </button>

        <hr className="my-3 border-gray-200/50 dark:border-white/10" />

        <div className="text-center text-xs text-gray-500 dark:text-gray-400/60 font-medium">
          <p>© 2024 Quick Actions. All rights reserved.</p>
        </div>
      </SettingsCard>
    </div>
  );
}

// Debug Tab Component
interface DebugTabProps {
  debugSettings: import('../context/DebugContext').DebugSettings;
  onToggleDebug: (key: keyof import('../context/DebugContext').DebugSettings) => void;
  isDebugOpen: boolean;
  onTogglePanel: () => void;
}

/**
 * 导出用户行为统计概要到控制台
 */
function exportUserBehaviorSummary() {
  const behaviorStats = userBehaviorTracker.getStats();
  const cacheStats = searchCache.getStats();
  
  // 获取 localStorage 中的原始数据
  const searchHistory = JSON.parse(localStorage.getItem('quick-actions-search-history') || '[]');
  const userPreferences = JSON.parse(localStorage.getItem('quick-actions-user-preferences') || '[]');
  const appSettings = JSON.parse(localStorage.getItem('quick-actions-settings') || '{}');
  const pinnedPlugins = JSON.parse(localStorage.getItem('quick-actions-plugin-pinned') || '[]');

  console.log('\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #8b5cf6; font-weight: bold');
  console.log('%c📊 Quick Actions 使用习惯概要', 'color: #8b5cf6; font-size: 16px; font-weight: bold');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'color: #8b5cf6; font-weight: bold');

  // 1. 基本信息
  console.log('%c🔹 基本信息', 'color: #3b82f6; font-size: 14px; font-weight: bold');
  console.table({
    '应用主题': appSettings.theme || 'system',
    '布局密度': appSettings.layoutDensity || 'comfortable',
    '窗口透明度': appSettings.windowOpacity || 0.98,
    '全局快捷键': appSettings.globalShortcut || 'Ctrl+Space',
    '固定插件数': pinnedPlugins.length,
  });

  // 2. 搜索统计
  console.log('\n%c🔹 搜索统计', 'color: #3b82f6; font-size: 14px; font-weight: bold');
  console.table({
    '历史记录数': behaviorStats.historySize,
    '偏好结果数': behaviorStats.preferencesCount,
    '缓存查询数': cacheStats.cachedQueries,
    '索引项目数': cacheStats.indexedItems,
  });

  // 3. Top 偏好结果
  if (behaviorStats.topPreferences.length > 0) {
    console.log('\n%c🔹 Top 偏好结果', 'color: #3b82f6; font-size: 14px; font-weight: bold');
    console.table(
      behaviorStats.topPreferences.map((pref, idx) => ({
        '排名': idx + 1,
        'ID': pref.id,
        '偏好分数': pref.score,
        '选择次数': pref.selectCount,
      }))
    );
  }

  // 4. 最近搜索历史（最近10条）
  if (searchHistory.length > 0) {
    console.log('\n%c🔹 最近搜索历史 (Top 10)', 'color: #3b82f6; font-size: 14px; font-weight: bold');
    const recentHistory = searchHistory.slice(0, 10).map((item: any) => ({
      '查询': item.query,
      '选择': item.selectedId,
      '类型': item.type,
      '时间': new Date(item.timestamp).toLocaleString('zh-CN'),
    }));
    console.table(recentHistory);
  }

  // 5. 搜索模式分析
  console.log('\n%c🔹 搜索模式分析', 'color: #3b82f6; font-size: 14px; font-weight: bold');
  
  // 统计不同类型的选择
  const pluginSelections = userPreferences.filter((p: any) => p.id.startsWith('plugin-'));
  const appSelections = userPreferences.filter((p: any) => p.id.startsWith('app-'));
  
  console.table({
    '插件选择数': pluginSelections.length,
    '应用选择数': appSelections.length,
    '插件占比': userPreferences.length > 0 
      ? `${Math.round(pluginSelections.length / userPreferences.length * 100)}%` 
      : '0%',
    '应用占比': userPreferences.length > 0 
      ? `${Math.round(appSelections.length / userPreferences.length * 100)}%` 
      : '0%',
  });

  // 6. 高频查询词
  if (searchHistory.length > 0) {
    console.log('\n%c🔹 高频查询词', 'color: #3b82f6; font-size: 14px; font-weight: bold');
    const queryFrequency = new Map<string, number>();
    searchHistory.forEach((item: any) => {
      const count = queryFrequency.get(item.query) || 0;
      queryFrequency.set(item.query, count + 1);
    });
    
    const sortedQueries = Array.from(queryFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count], idx) => ({
        '排名': idx + 1,
        '查询词': query,
        '使用次数': count,
      }));
    
    console.table(sortedQueries);
  }

  // 7. 活跃时间段分析
  if (searchHistory.length > 0) {
    console.log('\n%c🔹 活跃时间段', 'color: #3b82f6; font-size: 14px; font-weight: bold');
    const hourDistribution = new Array(24).fill(0);
    searchHistory.forEach((item: any) => {
      const hour = new Date(item.timestamp).getHours();
      hourDistribution[hour]++;
    });
    
    const peakHours = hourDistribution
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    console.log('高峰时段:', peakHours.map(h => `${h.hour}:00-${h.hour+1}:00 (${h.count}次)`).join(', '));
  }

  // 8. 原始数据（折叠）
  console.log('\n%c🔹 原始数据 (展开查看)', 'color: #3b82f6; font-size: 14px; font-weight: bold');
  console.group('localStorage 数据');
  console.log('搜索历史:', searchHistory);
  console.log('用户偏好:', userPreferences);
  console.log('应用设置:', appSettings);
  console.log('固定插件:', pinnedPlugins);
  console.groupEnd();

  console.log('\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'color: #8b5cf6; font-weight: bold');
  console.log('%c💡 提示: 可以右键表格复制数据，或使用 console.clear() 清空控制台', 'color: #6b7280; font-style: italic');
}

const debugOptions: Array<{
  key: string;
  label: string;
  description: string;
}> = [
  { key: 'searchTiming', label: '搜索耗时', description: '显示搜索命令的执行耗时' },
  { key: 'windowFocus', label: '窗口焦点', description: '追踪窗口获得/失去焦点事件' },
  { key: 'keyboardEvents', label: '键盘事件', description: '追踪键盘按键事件' },
  { key: 'pluginLoading', label: '插件加载', description: '显示插件加载过程和耗时' },
  { key: 'cacheStats', label: '缓存统计', description: '显示搜索缓存命中率和性能数据' },
];

function DebugTab({ debugSettings, onToggleDebug, isDebugOpen, onTogglePanel }: DebugTabProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-100 mb-1">开发者选项</h2>
        <p className="text-sm text-gray-400">调试和开发工具设置</p>
      </div>

      {/* Debug Panel Toggle */}
      <div className="ios-settings-group">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-purple-500/20 flex items-center justify-center">
              <span className="text-lg">🐛</span>
            </div>
            <div>
              <p className="font-medium text-gray-100 text-sm">Debug 面板</p>
              <p className="text-xs text-gray-400/70 mt-0.5">显示实时调试信息</p>
            </div>
          </div>
          <button
            onClick={onTogglePanel}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              isDebugOpen
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-white/10 text-gray-300 hover:bg-white/15'
            }`}
          >
            {isDebugOpen ? '已开启' : '开启'}
          </button>
        </div>
      </div>

      {/* Debug Options */}
      <div className="ios-settings-group">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">调试选项</h3>
        </div>
        <div className="divide-y divide-white/10">
          {debugOptions.map(option => (
            <label
              key={option.key}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex-1 pr-4">
                <p className="font-medium text-gray-100 text-sm">{option.label}</p>
                <p className="text-xs text-gray-400/70 mt-0.5">{option.description}</p>
              </div>
              <input
                type="checkbox"
                checked={debugSettings[option.key as keyof typeof debugSettings] || false}
                onChange={() => onToggleDebug(option.key as keyof import('../context/DebugContext').DebugSettings)}
                className="w-11 h-6 rounded-full bg-gray-600 border-2 border-transparent appearance-none cursor-pointer transition-colors duration-200 checked:bg-purple-600 checked:border-purple-600 relative"
                style={{
                  backgroundImage: debugSettings[option.key as keyof typeof debugSettings]
                    ? 'url("data:image/svg+xml,%3csvg viewBox=\'0 0 16 16\' fill=\'white\' xmlns=\'http://www.w3.org/2000/svg\'%3e%3cpath d=\'M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z\'/%3e%3c/svg%3e")'
                    : 'none',
                  backgroundPosition: 'center',
                  backgroundSize: '12px',
                  backgroundRepeat: 'no-repeat',
                }}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="ios-settings-group">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">已启用调试选项</span>
            <span className="text-sm font-medium text-purple-400">
              {debugSettings ? Object.values(debugSettings).filter(Boolean).length : 0} / {debugOptions.length}
            </span>
          </div>
        </div>
      </div>

      {/* 用户行为统计导出 */}
      <div className="ios-settings-group">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">数据导出</h3>
        </div>
        <div className="p-4">
          <button
            onClick={exportUserBehaviorSummary}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            <span className="text-lg">📊</span>
            <span>导出使用习惯概要到控制台</span>
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            在浏览器控制台中查看详细的使用统计和分析
          </p>
        </div>
      </div>
    </div>
  );
}
