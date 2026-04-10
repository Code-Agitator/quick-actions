import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { IoSettingsOutline } from 'react-icons/io5';

export interface SearchBarRef {
  focus: () => void;
}

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: () => void;
  onOpenSettings?: () => void;
}

export const SearchBar = forwardRef<SearchBarRef, SearchBarProps>(
  ({ value, onChange, onExecute, onOpenSettings }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    // 暴露 focus 方法给父组件
    useImperativeHandle(ref, () => ({
      focus: () => {
        if (inputRef.current) {
          // 确保元素可见后再聚焦
          inputRef.current.focus({ preventScroll: true });
          
          // 验证是否真正聚焦
          if (document.activeElement !== inputRef.current) {
            // 如果没聚焦成功，重试
            setTimeout(() => {
              inputRef.current?.focus({ preventScroll: true });
            }, 10);
          }
        }
      }
    }));

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && onExecute) {
          onExecute();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onExecute]);

    return (
      <div className="w-full relative">
        {/* 暗色调搜索框 */}
        <div className="flex items-center gap-3 px-2">
          {/* 搜索图标 - 亮色 */}
          <svg className="w-5 h-5 text-gray-300/80 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          
          {/* 输入框 - 亮色字体 */}
          <input
            ref={inputRef}
            autoFocus
            type="text"
            placeholder="搜索插件和应用..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-transparent text-[17px] font-normal text-gray-100 placeholder-gray-400/60 outline-none border-none py-2 tracking-tight"
          />
          
          {/* 设置按钮 - 暗色调样式 */}
          {onOpenSettings && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenSettings();
              }}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-all duration-150 active:scale-95 flex-shrink-0"
              title="设置"
            >
              <IoSettingsOutline className="w-5 h-5 text-gray-400 hover:text-gray-200 transition-colors" />
            </button>
          )}
        </div>
      </div>
    );
  }
);
