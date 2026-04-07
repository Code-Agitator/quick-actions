import { motion } from 'framer-motion';
import { Card, Chip } from '@heroui/react';
import { Plugin } from '../types/plugin';

interface PluginListProps {
  plugins: Plugin[];
  onExecute: (id: string, query: string) => void;
  query: string;
}

export function PluginList({ plugins, onExecute, query }: PluginListProps) {
  console.log('PluginList render - total plugins:', plugins.length, 'query:', query);

  const filteredPlugins = plugins.filter((plugin) =>
    plugin.keywords.some((keyword) =>
      keyword.toLowerCase().includes(query.toLowerCase())
    ) ||
    plugin.name.toLowerCase().includes(query.toLowerCase())
  );

  console.log('Filtered plugins:', filteredPlugins.length);

  const handlePluginClick = (plugin: Plugin) => {
    console.log('Plugin clicked:', plugin.id, plugin.name);
    onExecute(plugin.id, query);
  };

  if (plugins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-6xl mb-4">🔌</div>
        <p className="text-gray-500 dark:text-gray-400 text-lg">暂无插件</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">安装插件后即可使用</p>
      </div>
    );
  }

  if (filteredPlugins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-6xl mb-4">🔍</div>
        <p className="text-gray-500 dark:text-gray-400 text-lg">未找到相关插件</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">尝试其他关键词</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {filteredPlugins.map((plugin, index) => (
        <motion.div
          key={plugin.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card
            onClick={() => handlePluginClick(plugin)}
            className="group relative overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 cursor-pointer"
          >
            {/* 渐变背景 */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* 内容 */}
            <div className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="text-3xl p-2 bg-gray-50 dark:bg-gray-700 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  {plugin.icon || '🔌'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {plugin.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    v{plugin.version}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                {plugin.description}
              </p>
              
              {/* 关键词标签 */}
              {plugin.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-3 border-t border-gray-100 dark:border-gray-700">
                  {plugin.keywords.slice(0, 3).map((keyword, idx) => (
                    <Chip
                      key={idx}
                      size="sm"
                      variant="secondary"
                      className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-md"
                    >
                      {keyword}
                    </Chip>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
