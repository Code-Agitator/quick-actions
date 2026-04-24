import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Input } from '@heroui/react';
import { IoSettingsOutline, IoSearchOutline } from 'react-icons/io5';

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
      <>
        {/* 搜索框 - 使用 HeroUI v2 Input */}
        <Input
          ref={inputRef as any}
          autoFocus
          type="text"
          placeholder="搜索插件和应用..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onExecute) {
              onExecute();
            }
          }}
          classNames={{
            input: "text-[17px] font-normal text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500/60 tracking-tight h-full py-0",
            inputWrapper: "h-full border-0 shadow-none outline-none bg-transparent hover:bg-transparent focus-within:bg-transparent data-[hover=true]:bg-transparent group-data-[focus=true]:bg-transparent",
            base: "h-full border-0 shadow-none outline-none bg-transparent",
          }}
          startContent={
            <IoSearchOutline className="w-5 h-5 text-gray-400 dark:text-gray-300/80 flex-shrink-0" />
          }
          endContent={
            onOpenSettings && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSettings();
                }}
                className="flex items-center justify-center p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-all duration-150 cursor-pointer"
              >
                <IoSettingsOutline className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            )
          }
          className="w-full h-full"
        />
      </>
    );
  }
);
