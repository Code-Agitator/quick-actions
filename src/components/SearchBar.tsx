import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Input } from '@heroui/react';
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
        <Input
          ref={inputRef}
          autoFocus
          type="text"
          placeholder="搜索插件..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full [&_.input-wrapper]:h-14 [&_.input-wrapper]:bg-transparent [&_.input-wrapper]:hover:bg-gray-50/50 [&_.dark_.input-wrapper]:hover:bg-gray-800/30 [&_.input-wrapper]:transition-all [&_.input-wrapper]:border-none [&_.input-wrapper]:shadow-none [&_.input-wrapper]:rounded-none [&_.input]:text-base [&_.input]:placeholder:text-gray-400 [&_.input-wrapper]:pl-4 [&_.input-wrapper]:pr-12 [&_.input-wrapper]:rounded-t-lg [&_.input-wrapper]:focus-within:border-none [&_.input-wrapper]:focus-within:shadow-none [&_.input]:outline-none [&_.input]:focus:outline-none [&_.input]:focus:ring-0 [&_.input-wrapper]:focus-within:ring-0 [&_.input-wrapper]:data-[focus=true]:border-none [&_.input-wrapper]:data-[focus=true]:shadow-none [&_.input-wrapper]:data-[focus=true]:ring-0 [&_.input-wrapper]:after:border-none [&_.input-wrapper]:after:shadow-none [&_.input-wrapper]:after:ring-0"
        />
        
        {/* 设置按钮 - 绝对定位在搜索框右侧 */}
        {onOpenSettings && (
          <>
            {/* 分隔线 */}
            <div className="absolute right-10 top-1/2 -translate-y-1/2 w-px h-5 bg-gray-200 dark:bg-gray-700" />
            
            {/* 按钮 */}
            <div className="absolute right-1 top-1/2 -translate-y-1/2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSettings();
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-all active:scale-95"
                title="设置 (Ctrl+,)"
              >
                <IoSettingsOutline className="text-xl text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
              </button>
            </div>
          </>
        )}
      </div>
    );
  }
);
