import { Button, Switch } from '@heroui/react';
import { userBehaviorTracker } from '../../utils/userBehavior';
import { searchCache } from '../../utils/searchCache';
import { SettingsCard } from '../common/SettingsCard';
import { LOCAL_STORAGE_KEYS } from '../../constants';

interface DebugTabProps {
  debugSettings: import('../../context/DebugContext').DebugSettings;
  onToggleDebug: (key: keyof import('../../context/DebugContext').DebugSettings) => void;
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
  const searchHistory = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.SEARCH_HISTORY) || '[]');
  const userPreferences = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.USER_PREFERENCES) || '[]');
  const appSettings = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS) || '{}');
  const pinnedPlugins = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.PLUGIN_PINNED) || '[]');

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

export function DebugTab({ debugSettings, onToggleDebug, isDebugOpen, onTogglePanel }: DebugTabProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-100 mb-1">开发者选项</h2>
        <p className="text-sm text-gray-400">调试和开发工具设置</p>
      </div>

      {/* Debug Panel Toggle */}
      <SettingsCard className="p-4">
        <div className="flex items-center justify-between">
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
      </SettingsCard>

      {/* Debug Options */}
      <SettingsCard>
        <div className="px-4 py-3 border-b border-divider">
          <h3 className="text-xs font-semibold text-default-500 uppercase tracking-wide">调试选项</h3>
        </div>
        <div className="divide-y divide-divider">
          {debugOptions.map(option => (
            <div
              key={option.key}
              className="flex items-center justify-between p-4 hover:bg-default-100 transition-colors"
            >
              <div className="flex-1 pr-4">
                <p className="font-medium text-foreground text-sm">{option.label}</p>
                <p className="text-xs text-default-500 mt-0.5">{option.description}</p>
              </div>
              <Switch
                isSelected={debugSettings[option.key as keyof typeof debugSettings] || false}
                onValueChange={() => onToggleDebug(option.key as keyof import('../../context/DebugContext').DebugSettings)}
              />
            </div>
          ))}
        </div>
      </SettingsCard>

      {/* Stats */}
      <SettingsCard className="px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-default-500">已启用调试选项</span>
          <span className="text-sm font-medium text-purple-400">
            {debugSettings ? Object.values(debugSettings).filter(Boolean).length : 0} / {debugOptions.length}
          </span>
        </div>
      </SettingsCard>

      {/* 用户行为统计导出 */}
      <SettingsCard>
        <div className="px-4 py-3 border-b border-divider">
          <h3 className="text-xs font-semibold text-default-500 uppercase tracking-wide">数据导出</h3>
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
      </SettingsCard>
    </div>
  );
}
