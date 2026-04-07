import { useEffect } from 'react';
import { Input } from '@heroui/react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: () => void;
}

export function SearchBar({ value, onChange, onExecute }: SearchBarProps) {
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
    <div className="w-full">
      <Input
        autoFocus
        type="text"
        placeholder="搜索插件..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full [&_.input-wrapper]:h-12 [&_.input-wrapper]:bg-transparent [&_.input-wrapper]:hover:bg-gray-100 [&_.dark_.input-wrapper]:hover:bg-gray-800 [&_.input-wrapper]:transition-colors [&_.input-wrapper]:border-none [&_.input-wrapper]:shadow-none [&_.input-wrapper]:rounded-none [&_.input]:text-base [&_.input]:placeholder:text-gray-400 [&_.input-wrapper]:px-3"
      />
    </div>
  );
}
