import { motion } from 'framer-motion';
import { SearchResult } from '../types/searchResult';

interface SearchResultListProps {
  results: SearchResult[];
  onExecute: (result: SearchResult) => void;
}

export function SearchResultList({ results, onExecute }: SearchResultListProps) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <p className="text-sm">未找到结果</p>
      </div>
    );
  }

  const getIcon = (result: SearchResult) => {
    if (result.icon) return result.icon;
    
    switch (result.type) {
      case 'plugin':
        return '🔌';
      case 'application':
        return '📱';
      case 'url':
        return '🌐';
      case 'file':
        return '📄';
      default:
        return '•';
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'plugin':
        return '插件';
      case 'application':
        return '应用';
      case 'url':
        return '网址';
      case 'file':
        return '文件';
    }
  };

  return (
    <div className="space-y-0.5">
      {results.map((result, index) => (
        <motion.div
          key={result.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.03 }}
        >
          <div
            onClick={() => onExecute(result)}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
          >
            {/* 图标 */}
            <div className="text-xl w-8 h-8 flex items-center justify-center flex-shrink-0">
              {getIcon(result)}
            </div>
            
            {/* 信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {result.title}
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded">
                  {getTypeLabel(result.type)}
                </span>
              </div>
              {result.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {result.description}
                </p>
              )}
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
