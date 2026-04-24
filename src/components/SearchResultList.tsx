import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { Listbox, ListboxItem, Chip, Kbd } from '@heroui/react';
import { IoSearchOutline } from 'react-icons/io5';
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
  const containerRef = useRef<HTMLDivElement>(null);
  
  // ✅ 跟踪是否允许鼠标悬停选择
  // 初始为 false，防止窗口打开时鼠标停留在某个选项上立即选中
  const [allowMouseSelect, setAllowMouseSelect] = useState(false);
  
  // 根据布局密度设置样式
  const isCompact = settings.layoutDensity === 'compact';

  // 滚动到选中项 - 使用标准的桌面应用行为
  useEffect(() => {
    if (selectedIndex >= 0 && containerRef.current) {
      // ✅ 通过 data-index 属性查找选中项
      const selectedElement = containerRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
      if (selectedElement) {
        // ✅ 使用 scrollIntoView with block: 'nearest'
        // 这是桌面应用的标准行为：只在必要时滚动，保持最小位移
        selectedElement.scrollIntoView({ 
          block: 'nearest', 
          behavior: 'auto' 
        });
      }
    }
  }, [selectedIndex]);

  // ✅ 当搜索结果变化时，重置鼠标选择状态
  // 防止新的搜索结果出现时，鼠标停留在某个选项上立即选中
  useEffect(() => {
    setAllowMouseSelect(false);
  }, [results]);

  // ✅ 监听鼠标移动，用户主动移动鼠标后才允许悬停选择
  const handleMouseMove = useCallback(() => {
    setAllowMouseSelect(true);
  }, []);

  // ✅ 处理鼠标进入事件，只有在允许时才触发选择
  const handleMouseEnter = useCallback((index: number) => {
    if (allowMouseSelect) {
      onSelectIndex(index);
    }
  }, [allowMouseSelect, onSelectIndex]);

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <IoSearchOutline className="w-12 h-12 mb-3 text-gray-400 dark:text-gray-500/40" />
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
    <div 
      ref={containerRef}
      className="space-y-0.5 px-2"
      onMouseMove={handleMouseMove}
    >
      <Listbox
        aria-label="搜索结果"
        selectionMode="single"
        selectedKeys={selectedIndex >= 0 && results[selectedIndex] ? [results[selectedIndex].id] : []}
        onSelectionChange={(keys) => {
          const key = Array.from(keys)[0];
          if (key !== undefined) {
            // 找到选中项的索引
            const newIndex = results.findIndex(r => r.id === key);
            if (newIndex !== -1) {
              onSelectIndex(newIndex);
            }
          }
        }}
        className="w-full"
      >
        {results.map((result, index) => {
          // 优先使用后端提取的真实图标（Base64）
          const hasRealIcon = result.type === 'application' && result.icon && result.icon.startsWith('data:image');
          
          // 如果没有真实图标，使用前端映射表的 React 图标
          const iconConfig = !hasRealIcon && result.type === 'application' 
            ? getAppIconConfig(result.title)
            : null;
          
          const IconComponent = iconConfig?.icon;
          const iconColor = iconConfig?.color;
          
          return (
            <ListboxItem
              key={result.id}
              id={result.id}
              textValue={result.title}
              // ✅ 添加 data-index 属性用于查找
              data-index={index}
              onPress={() => onExecute(result)}
              onMouseEnter={() => handleMouseEnter(index)}
              className={`group cursor-pointer transition-all duration-150 ${
                index === selectedIndex 
                  ? 'bg-black/5 dark:bg-white/[0.14]' 
                  : 'hover:bg-black/5 dark:hover:bg-white/[0.08]'
              }`}
            >
              <div className={`flex items-center ${isCompact ? 'gap-2 py-1.5 px-3' : 'gap-3 py-2.5 px-3'}`}>
                {/* 图标 */}
                <div className={`${isCompact ? 'w-8 h-8' : 'w-10 h-10'} flex-shrink-0 rounded-md bg-gradient-to-br from-gray-200/70 to-gray-300/50 dark:from-gray-700/70 dark:to-gray-800/50 backdrop-blur-sm border border-gray-300/50 dark:border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.3)] overflow-hidden`}>
                  {hasRealIcon ? (
                    <img 
                      src={result.icon} 
                      alt={result.title}
                      className="w-full h-full object-contain"
                    />
                  ) : IconComponent ? (
                    <IconComponent 
                      className={isCompact ? 'w-4 h-4' : 'w-5 h-5'} 
                      style={{ color: iconColor }}
                    />
                  ) : (
                    <span className="text-lg opacity-80">
                      {result.icon || (result.type === 'plugin' ? '🔌' : '📱')}
                    </span>
                  )}
                </div>
                
                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`truncate ${
                      index === selectedIndex 
                        ? 'text-gray-900 dark:text-gray-50' 
                        : 'text-gray-700 dark:text-gray-200'
                    }`}>
                      {result.title}
                    </h3>
                    <Chip
                      size="sm"
                      className="text-[10px] px-1.5 py-0.5 bg-black/5 dark:bg-white/[0.1] text-gray-600 dark:text-gray-400/90 rounded-md font-medium backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_1px_2px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.2)] border border-gray-300/50 dark:border-white/[0.08]"
                    >
                      {getTypeLabel(result.type)}
                    </Chip>
                  </div>
                  {result.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400/60 truncate mt-0.5 font-normal">
                      {result.description}
                    </p>
                  )}
                </div>
                
                {/* 快捷键提示 - 使用 HeroUI Kbd */}
                <div className={`transition-all duration-150 text-xs flex-shrink-0 ${
                  index === selectedIndex ? 'opacity-100 text-gray-500 dark:text-gray-400/80' : 'opacity-0 group-hover:opacity-60 text-gray-400 dark:text-gray-500/70'
                }`}>
                  <Kbd
                    className="px-2 py-0.5 bg-black/5 dark:bg-white/[0.1] rounded-md text-[11px] font-medium border border-gray-300/50 dark:border-white/[0.1] backdrop-blur-sm text-gray-600 dark:text-gray-300/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_1px_2px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.2)]"
                  >
                    ↵
                  </Kbd>
                </div>
              </div>
            </ListboxItem>
          );
        })}
      </Listbox>
    </div>
  );
}

// 性能优化：使用 memo 避免不必要的重新渲染
export const SearchResultListMemo = memo(SearchResultList, (prevProps, nextProps) => {
  // 只有当这些属性变化时才重新渲染
  return (
    prevProps.results === nextProps.results &&
    prevProps.selectedIndex === nextProps.selectedIndex &&
    prevProps.onExecute === nextProps.onExecute &&
    prevProps.onSelectIndex === nextProps.onSelectIndex
  );
});
