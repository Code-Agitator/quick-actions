import { useDebug } from '../context/DebugContext';
import { Button, Switch } from '@heroui/react';
import { IoClose } from 'react-icons/io5';
import { userBehaviorTracker } from '../utils/userBehavior';
import { searchCache } from '../utils/searchCache';

const debugOptions: Array<{
  key: keyof import('../context/DebugContext').DebugSettings;
  label: string;
  description: string;
}> = [
  { key: 'searchTiming', label: '搜索耗时', description: '显示搜索命令的执行耗时' },
  { key: 'windowFocus', label: '窗口焦点', description: '追踪窗口获得/失去焦点事件' },
  { key: 'keyboardEvents', label: '键盘事件', description: '追踪键盘按键事件' },
  { key: 'pluginLoading', label: '插件加载', description: '显示插件加载过程和耗时' },
  { key: 'cacheStats', label: '缓存统计', description: '显示搜索缓存命中率和性能数据' },
];

export function DebugPanel() {
  const { settings, toggleDebug, isDebugOpen, togglePanel } = useDebug();

  if (!isDebugOpen) {
    return (
      <Button
        isIconOnly
        size="sm"
        onPress={togglePanel}
        className="fixed bottom-4 left-4 w-10 h-10 bg-gray-700/80 hover:bg-gray-600/90 backdrop-blur-sm text-gray-300 hover:text-white rounded-full shadow-lg z-50"
      >
        🐛
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 w-80 bg-gray-900/95 backdrop-blur-md text-white rounded-md shadow-2xl z-50 overflow-hidden border border-gray-700/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-purple-600">
        <h3 className="font-bold text-sm">🐛 Debug 面板</h3>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onPress={togglePanel}
          className="min-w-6 w-6 h-6 text-white/80 hover:text-white"
        >
          <IoClose className="w-4 h-4" />
        </Button>
      </div>

      {/* Options */}
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {debugOptions.map(option => (
          <label
            key={option.key}
            className="flex items-center justify-between gap-3 cursor-pointer group py-2"
          >
            <div className="flex-1">
              <div className="text-sm font-medium group-hover:text-purple-400 transition-colors">
                {option.label}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {option.description}
              </div>
            </div>
            <Switch
              isSelected={settings?.[option.key]}
              onValueChange={() => toggleDebug(option.key)}
              size="sm"
              color="primary"
            />
          </label>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-800 border-t border-gray-700">
        <div className="text-xs text-gray-400">
          已启用: {settings ? Object.values(settings).filter(Boolean).length : 0} / {debugOptions.length}
        </div>
        
        {/* 用户行为统计 */}
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="text-xs font-medium text-purple-400 mb-2">📊 用户行为统计</div>
          <UserBehaviorStats />
        </div>
      </div>
    </div>
  );
}

// 用户行为统计组件
function UserBehaviorStats() {
  const stats = userBehaviorTracker.getStats();
  const cacheStats = searchCache.getStats();

  return (
    <div className="space-y-2 text-xs">
      <div className="flex justify-between">
        <span className="text-gray-400">历史记录:</span>
        <span className="text-white">{stats.historySize}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">偏好数量:</span>
        <span className="text-white">{stats.preferencesCount}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">缓存查询:</span>
        <span className="text-white">{cacheStats.cachedQueries}</span>
      </div>
      
      {stats.topPreferences.length > 0 && (
        <div className="pt-2 border-t border-gray-700">
          <div className="text-xs text-gray-500 mb-1">Top 偏好:</div>
          {stats.topPreferences.map((pref, idx) => (
            <div key={pref.id} className="flex justify-between py-0.5">
              <span className="text-gray-400 truncate max-w-[150px]">
                {idx + 1}. {pref.id}
              </span>
              <span className="text-green-400">{pref.score}</span>
            </div>
          ))}
        </div>
      )}
      
      <button
        onClick={() => userBehaviorTracker.clearHistory()}
        className="w-full mt-2 px-2 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs transition-colors"
      >
        清除历史
      </button>
    </div>
  );
}
