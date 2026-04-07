import { motion } from 'framer-motion';
import { Plugin } from '../types/plugin';

interface PluginListProps {
  plugins: Plugin[];
  onExecute: (id: string, query: string) => void;
  query: string;
}

export function PluginList({ plugins, onExecute, query }: PluginListProps) {
  const filteredPlugins = plugins.filter((plugin) =>
    plugin.keywords.some((keyword) =>
      keyword.toLowerCase().includes(query.toLowerCase())
    ) ||
    plugin.name.toLowerCase().includes(query.toLowerCase())
  );

  const handlePluginClick = (plugin: Plugin) => {
    onExecute(plugin.id, query);
  };

  if (plugins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <p className="text-sm">暂无插件</p>
      </div>
    );
  }

  if (filteredPlugins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <p className="text-sm">未找到相关插件</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {filteredPlugins.map((plugin, index) => (
        <motion.div
          key={plugin.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.03 }}
        >
          <div
            onClick={() => handlePluginClick(plugin)}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
          >
            {/* 图标 */}
            <div className="text-xl w-8 h-8 flex items-center justify-center flex-shrink-0">
              {plugin.icon || '🔌'}
            </div>
            
            {/* 信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {plugin.name}
                </h3>
                {plugin.entry_type === 'esm' && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                    UI
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {plugin.description}
              </p>
            </div>
            
            {/* 快捷键提示 */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-400 flex-shrink-0">
              ↵
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
