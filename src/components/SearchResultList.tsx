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
      <div className="flex flex-col items-center justify-center py-16 text-gray-400/60">
        <svg className="w-12 h-12 mb-3 text-gray-500/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p className="text-sm font-medium text-gray-300/70">未找到结果</p>
        <p className="text-xs mt-1 text-gray-500/50">尝试其他关键词</p>
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
    <div ref={listRef} className="space-y-0.5 px-2">
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.08 }}
          >
            <div
              onClick={() => onExecute(result)}
              onMouseEnter={() => onSelectIndex(index)}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                isSelected 
                  ? 'bg-white/[0.12] shadow-sm' 
                  : 'hover:bg-white/[0.06]'
              }`}
            >
              {/* 图标 - 暗色调：圆角方形，更柔和的背景 */}
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-xl bg-gradient-to-br from-gray-700/60 to-gray-800/40 backdrop-blur-sm border border-white/10">
                {IconComponent ? (
                  <IconComponent 
                    className="w-5 h-5" 
                    style={{ color: iconColor }}
                  />
                ) : (
                  <span className="text-lg opacity-80">
                    {result.icon || (result.type === 'plugin' ? '🔌' : '📱')}
                  </span>
                )}
              </div>
              
              {/* 信息 - 亮色字体 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`text-[15px] font-medium truncate tracking-tight ${
                    isSelected 
                      ? 'text-gray-50' 
                      : 'text-gray-200'
                  }`}>
                    {result.title}
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.5 bg-white/[0.08] text-gray-400/80 rounded-md font-medium backdrop-blur-sm">
                    {getTypeLabel(result.type)}
                  </span>
                </div>
                {result.description && (
                  <p className="text-xs text-gray-400/60 truncate mt-0.5 font-normal">
                    {result.description}
                  </p>
                )}
              </div>
              
              {/* 快捷键提示 - 暗色调精致样式 */}
              <div className={`transition-all duration-150 text-xs flex-shrink-0 ${
                isSelected ? 'opacity-100 text-gray-400/80' : 'opacity-0 group-hover:opacity-60 text-gray-500/70'
              }`}>
                <kbd className="px-2 py-0.5 bg-white/[0.08] rounded-md text-[11px] font-medium border border-white/[0.08] backdrop-blur-sm text-gray-300/80">↵</kbd>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
