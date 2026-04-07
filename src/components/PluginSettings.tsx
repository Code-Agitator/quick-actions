import { Plugin } from '../types/plugin';
import { X, Trash2, Info } from 'lucide-react';

interface PluginSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  plugin: Plugin | null;
  onUninstall: (id: string) => void;
}

export function PluginSettings({ isOpen, onClose, plugin, onUninstall }: PluginSettingsProps) {
  if (!plugin || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* 模态框 */}
      <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white">
              <Info className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              插件信息
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* 内容 */}
        <div className="px-6 py-6">
          {/* 插件图标和名称 */}
          <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
            <div className="text-4xl p-3 bg-white dark:bg-gray-700 rounded-2xl shadow-sm">
              {plugin.icon || '🔌'}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {plugin.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                v{plugin.version}
              </p>
            </div>
          </div>

          {/* 详细信息 */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                描述
              </label>
              <p className="mt-1.5 text-gray-700 dark:text-gray-300 leading-relaxed">
                {plugin.description}
              </p>
            </div>

            {plugin.keywords.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  关键词
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {plugin.keywords.map((keyword, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-medium"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-3 px-6 py-5 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => {
              onUninstall(plugin.id);
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-red-500/30"
          >
            <Trash2 className="w-5 h-5" />
            卸载插件
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
