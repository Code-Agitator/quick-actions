import { useDebug } from '../context/DebugContext';

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
      <button
        onClick={togglePanel}
        className="fixed bottom-4 right-4 w-10 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center text-lg z-50 transition-colors"
        title="Debug 面板"
      >
        🐛
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-gray-900 text-white rounded-lg shadow-2xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-purple-600">
        <h3 className="font-bold text-sm">🐛 Debug 面板</h3>
        <button
          onClick={togglePanel}
          className="text-white/80 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Options */}
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {debugOptions.map(option => (
          <label
            key={option.key}
            className="flex items-start gap-3 cursor-pointer group"
          >
            <input
              type="checkbox"
              checked={settings[option.key]}
              onChange={() => toggleDebug(option.key)}
              className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
            />
            <div className="flex-1">
              <div className="text-sm font-medium group-hover:text-purple-400 transition-colors">
                {option.label}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {option.description}
              </div>
            </div>
          </label>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-800 border-t border-gray-700">
        <div className="text-xs text-gray-400">
          已启用: {Object.values(settings).filter(Boolean).length} / {debugOptions.length}
        </div>
      </div>
    </div>
  );
}
