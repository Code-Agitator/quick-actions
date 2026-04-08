import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { SearchResult } from '../types/searchResult';
import { getAppIconConfig } from '../utils/appIcons';

interface SearchResultListProps {
  results: SearchResult[];
  onExecute: (result: SearchResult) => void;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
}

export function SearchResultList({ 
  results, 
  onExecute,
  selectedIndex,
  onSelectIndex 
}: SearchResultListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // 滚动到选中项
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      }
    }
  }, [selectedIndex]);

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <p className="text-sm">未找到结果</p>
      </div>
    );
  }

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
    <div ref={listRef} className="space-y-0.5">
      {results.map((result, index) => {
        // 获取图标配置
        const iconConfig = result.type === 'application' 
          ? getAppIconConfig(result.title)
          : null;
        
        const IconComponent = iconConfig?.icon;
        const iconColor = iconConfig?.color;
        const isSelected = index === selectedIndex;
        
        return (
          <motion.div
            key={result.id}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.05, delay: index * 0.01 }}
          >
            <div
              onClick={() => onExecute(result)}
              onMouseEnter={() => onSelectIndex(index)}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-75 ${
                isSelected 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {/* 图标 */}
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                {IconComponent ? (
                  <IconComponent 
                    className="w-5 h-5" 
                    style={{ color: iconColor }}
                  />
                ) : (
                  <span className="text-xl">
                    {result.icon || (result.type === 'plugin' ? '🔌' : '📱')}
                  </span>
                )}
              </div>
              
              {/* 信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-medium truncate ${
                    isSelected 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-900 dark:text-gray-100'
                  }`}>
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
              <div className={`transition-opacity duration-75 text-xs flex-shrink-0 ${
                isSelected ? 'opacity-100 text-blue-500' : 'opacity-0 group-hover:opacity-100 text-gray-400'
              }`}>
                ↵
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
