import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Card,
  Button, 
  Divider,
  Switch,
  Chip,
  Tooltip
} from '@heroui/react';
import { IoSettingsOutline, IoCubeOutline, IoColorPaletteOutline, IoPowerOutline, IoInformationCircleOutline, IoClose, IoTrashOutline, IoBugOutline, IoPinOutline, IoPin } from 'react-icons/io5';
import { usePlugins } from '../hooks/usePlugins';
import { useDebug } from '../context/DebugContext';
import { useAppSettings } from '../hooks/useAppSettings';
import { userBehaviorTracker } from '../utils/userBehavior';
import { searchCache } from '../utils/searchCache';
import AppearanceSetting from './settings/AppearanceSetting';
import GeneralSetting from './settings/GeneralSetting';

interface SettingsProps {
  onClose: () => void;
  onTogglePin?: (id: string, pinned: boolean) => void;
}

// 可复用的设置卡片组件
interface SettingsCardProps {
  children: React.ReactNode;
  className?: string;
}

function SettingsCard({ children, className = '' }: SettingsCardProps) {
  return (
    <Card className={`bg-content2 dark:bg-content2/50 border border-divider rounded-medium ${className}`}>
      {children}
    </Card>
  );
}

export function Settings({ onClose, onTogglePin }: SettingsProps) {
  const [activeTab, setActiveTab] = useState('appearance');
  const { plugins, loading, uninstallPlugin } = usePlugins();
  const { settings: debugSettings, toggleDebug, isDebugOpen, togglePanel } = useDebug();
  const { resetSettings } = useAppSettings();

  return (
    <div className="h-screen w-full flex overflow-hidden">
      {/* 左侧导航栏 */}
      <div className="w-52 flex-shrink-0 bg-default-50 dark:bg-default-100 border-r border-divider flex flex-col">
        {/* 头部 */}
        <div className="p-4 border-b border-divider">
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
        </div>

        {/* 导航项 */}
        <nav className="flex-1 overflow-y-auto py-2">
          {/* 应用设置分组 */}
          <div className="px-3 py-2">
            <p className="text-tiny text-default-500 font-medium px-2 mb-1">应用设置</p>
            <NavItem
              active={activeTab === 'appearance'}
              onClick={() => setActiveTab('appearance')}
              icon={<IoColorPaletteOutline className="text-medium" />}
              label="外观"
            />
            <NavItem
              active={activeTab === 'general'}
              onClick={() => setActiveTab('general')}
              icon={<IoSettingsOutline className="text-medium" />}
              label="通用"
            />
            <NavItem
              active={activeTab === 'plugins'}
              onClick={() => setActiveTab('plugins')}
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
              onClick={() => setActiveTab('about')}
              icon={<IoInformationCircleOutline className="text-medium" />}
              label="关于"
            />
            {import.meta.env.DEV && (
              <NavItem
                active={activeTab === 'debug'}
                onClick={() => setActiveTab('debug')}
                icon={<IoBugOutline className="text-medium" />}
                label="开发者选项"
              />
            )}
          </div>
        </nav>
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 overflow-y-auto bg-content1 dark:bg-content1/50">
        <div className="p-6">
          {activeTab === 'appearance' && <AppearanceSetting />}
          {activeTab === 'general' && <GeneralSetting />}
          {activeTab === 'plugins' && <PluginsTab plugins={plugins} loading={loading} onUninstall={uninstallPlugin} onTogglePin={onTogglePin} />}
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
    <Button
      variant={active ? "solid" : "light"}
      color={active ? "primary" : undefined}
      onPress={onClick}
      className={`w-full justify-start gap-3 px-3 py-2 h-auto min-h-[36px] rounded-md text-small ${
        active
          ? 'font-medium'
          : ''
      }`}
    >
      {icon}
      <span>{label}</span>
    </Button>
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
  const [_pinnedPlugins, setPinnedPlugins] = useState<Set<string>>(() => getPinnedPlugins());

  useEffect(() => {
    const handleStorageChange = () => {
      setPinnedPlugins(getPinnedPlugins());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('plugin-pinned-changed', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('plugin-pinned-changed', handleStorageChange);
    };
  }, [getPinnedPlugins]);

  return (
    <div>
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">插件管理</h1>
        <p className="text-small text-default-500">管理已安装的插件</p>
      </div>

      <Divider className="mb-6" />

      {/* 操作栏 */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          size="sm"
          color="primary"
          className="px-4"
        >
          安装插件
        </Button>
      </div>
    
      {loading ? (
        <div className="text-center py-12 text-default-500">加载中...</div>
      ) : plugins.length === 0 ? (
        <div className="text-center py-12 text-default-500">
          <p>暂无已安装的插件</p>
          <p className="text-small mt-2">点击"安装插件"按钮添加新插件</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plugins.map((plugin) => {
            const isPinned = plugin.pinned || isPluginPinned(plugin.id);
            
            return (
              <SettingsCard key={plugin.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{plugin.icon || '🔌'}</span>
                      <h3 className="font-medium text-foreground text-small">{plugin.name}</h3>
                      <Chip
                        size="sm"
                        variant="flat"
                        className="text-tiny"
                      >
                        v{plugin.version}
                      </Chip>
                      {isPinned && (
                        <Chip
                          size="sm"
                          color="primary"
                          variant="flat"
                          className="text-tiny flex items-center gap-1"
                        >
                          <IoPin className="w-3 h-3" />
                          已固定
                        </Chip>
                      )}
                    </div>
                    <p className="text-tiny text-default-500">{plugin.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {onTogglePin && (
                      <Tooltip content={isPinned ? '取消固定' : '固定在搜索结果'}>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => onTogglePin(plugin.id, !isPinned)}
                          className={isPinned ? 'text-primary' : 'text-default-400'}
                        >
                          {isPinned ? (
                            <IoPin className="w-4 h-4" />
                          ) : (
                            <IoPinOutline className="w-4 h-4" />
                          )}
                        </Button>
                      </Tooltip>
                    )}
                    <Tooltip content="卸载插件">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        className="text-default-400"
                        onPress={() => {
                          invoke('log_frontend_message', { level: 'info', message: `User clicked uninstall for plugin: ${plugin.id}` });
                          onUninstall(plugin.id);
                        }}
                      >
                        <IoTrashOutline className="text-base" />
                      </Button>
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

// 关于标签页
function AboutTab({ onReset }: { onReset?: () => void }) {
  return (
    <div>
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">关于</h1>
        <p className="text-small text-default-500">查看应用信息和版本</p>
      </div>

      <Divider className="mb-6" />

      <SettingsCard className="p-6">
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
            <IoSettingsOutline className="text-4xl text-white" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Quick Actions</h2>
          <p className="text-small text-default-500 mt-1">版本 0.1.0</p>
        </div>

        <Divider className="my-4" />

        <div className="space-y-3">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-medium hover:bg-default-100 transition-colors"
          >
            <svg className="w-5 h-5 text-default-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <div className="flex-1">
              <p className="font-medium text-foreground text-small">GitHub 仓库</p>
              <p className="text-tiny text-default-500">查看源代码和提交问题</p>
            </div>
          </a>

          <div className="flex items-center gap-3 p-3 rounded-medium">
            <IoPowerOutline className="text-medium text-default-500" />
            <div className="flex-1">
              <p className="font-medium text-foreground text-small">技术栈</p>
              <p className="text-tiny text-default-500">Tauri + React + TypeScript + Rust</p>
            </div>
          </div>
        </div>

        <Divider className="my-4" />

        {/* Reset Settings Button */}
        <Button
          onPress={() => {
            if (window.confirm('确定要重置所有设置为默认值吗？')) {
              onReset?.();
            }
          }}
          variant="flat"
          color="danger"
          className="w-full gap-2"
        >
          <IoPowerOutline className="text-base" />
          <span>重置所有设置</span>
        </Button>

        <Divider className="my-4" />

        <div className="text-center text-tiny text-default-500">
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
          <Button
            onPress={onTogglePanel}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              isDebugOpen
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-white/10 text-gray-300 hover:bg-white/15'
            }`}
          >
            {isDebugOpen ? '已开启' : '开启'}
          </Button>
        </div>
      </div>

      {/* Debug Options */}
      <div className="ios-settings-group">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">调试选项</h3>
        </div>
        <div className="divide-y divide-white/10">
          {debugOptions.map(option => (
            <div
              key={option.key}
              className="flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex-1 pr-4">
                <p className="font-medium text-gray-100 text-sm">{option.label}</p>
                <p className="text-xs text-gray-400/70 mt-0.5">{option.description}</p>
              </div>
              <Switch
                isSelected={debugSettings[option.key as keyof typeof debugSettings] || false}
                onValueChange={() => onToggleDebug(option.key as keyof import('../context/DebugContext').DebugSettings)}
              />
            </div>
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
          <Button
            onPress={exportUserBehaviorSummary}
            variant="ghost"
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            <span className="text-lg">📊</span>
            <span>导出使用习惯概要到控制台</span>
          </Button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            在浏览器控制台中查看详细的使用统计和分析
          </p>
        </div>
      </div>
    </div>
  );
}
