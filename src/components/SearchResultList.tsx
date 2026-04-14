import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { SearchResult } from '../types/searchResult';
import { getAppIconConfig } from '../utils/appIcons';
import { useAppSettings } from '../hooks/useAppSettings';

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
  const { settings } = useAppSettings();
  const listRef = useRef<HTMLDivElement>(null);
  
  // 根据布局密度设置样式
  const isCompact = settings.layoutDensity === 'compact';
  const itemPadding = isCompact ? 'px-3 py-1.5' : 'px-3 py-2.5';
  const iconSize = isCompact ? 'w-8 h-8' : 'w-10 h-10';
  const iconInnerSize = isCompact ? 'w-4 h-4' : 'w-5 h-5';
  const gapSize = isCompact ? 'gap-2' : 'gap-3';

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
      <div className="flex flex-col items-center justify-center py-16">
        <svg className="w-12 h-12 mb-3 text-gray-400 dark:text-gray-500/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300/70">未找到结果</p>
        <p className="text-xs mt-1 text-gray-400 dark:text-gray-500/50">尝试其他关键词</p>
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
        // 优先使用后端提取的真实图标（Base64）
        const hasRealIcon = result.type === 'application' && result.icon && result.icon.startsWith('data:image');
        
        // 如果没有真实图标，使用前端映射表的 React 图标
        const iconConfig = !hasRealIcon && result.type === 'application' 
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
              className={`group flex items-center ${gapSize} ${itemPadding} rounded-md cursor-pointer transition-all duration-150 ${
                isSelected 
                  ? 'bg-black/5 dark:bg-white/[0.14]' 
                  : 'hover:bg-black/5 dark:hover:bg-white/[0.08]'
              }`}
            >
              {/* 图标 - 自适应主题 */}
              <div className={`${iconSize} flex items-center justify-center flex-shrink-0 rounded-md bg-gradient-to-br from-gray-200/70 to-gray-300/50 dark:from-gray-700/70 dark:to-gray-800/50 backdrop-blur-sm border border-gray-300/50 dark:border-white/15 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.3)]`}>
                {hasRealIcon ? (
                  <img 
                    src={result.icon} 
                    alt={result.title}
                    className="w-full h-full object-contain"
                  />
                ) : IconComponent ? (
                  <IconComponent 
                    className={iconInnerSize} 
                    style={{ color: iconColor }}
                  />
                ) : (
                  <span className="text-lg opacity-80">
                    {result.icon || (result.type === 'plugin' ? '🔌' : '📱')}
                  </span>
                )}
              </div>
              
              {/* 信息 - 自适应字体颜色 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`text-[15px] font-medium truncate tracking-tight ${
                    isSelected 
                      ? 'text-gray-900 dark:text-gray-50' 
                      : 'text-gray-700 dark:text-gray-200'
                  }`}>
                    {result.title}
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.5 bg-black/5 dark:bg-white/[0.1] text-gray-600 dark:text-gray-400/90 rounded-md font-medium backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_1px_2px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.2)] border border-gray-300/50 dark:border-white/[0.08]">
                    {getTypeLabel(result.type)}
                  </span>
                </div>
                {result.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400/60 truncate mt-0.5 font-normal">
                    {result.description}
                  </p>
                )}
              </div>
              
              {/* 快捷键提示 - 自适应样式 */}
              <div className={`transition-all duration-150 text-xs flex-shrink-0 ${
                isSelected ? 'opacity-100 text-gray-500 dark:text-gray-400/80' : 'opacity-0 group-hover:opacity-60 text-gray-400 dark:text-gray-500/70'
              }`}>
                <kbd className="px-2 py-0.5 bg-black/5 dark:bg-white/[0.1] rounded-md text-[11px] font-medium border border-gray-300/50 dark:border-white/[0.1] backdrop-blur-sm text-gray-600 dark:text-gray-300/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_1px_2px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.2)]">↵</kbd>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
