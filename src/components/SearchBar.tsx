import { useEffect } from 'react';
import { Input } from '@heroui/react';
import { Search } from 'lucide-react';

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
    <div className="relative w-full">
      <Input
        autoFocus
        type="text"
        placeholder="搜索插件..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        variant="secondary"
        className="w-full [&_.input-wrapper]:h-14 [&_.input-wrapper]:shadow-md [&_.input-wrapper]:hover:shadow-lg [&_.input-wrapper]:bg-white [&_.dark_.input-wrapper]:bg-gray-800 [&_.input-wrapper]:border-2 [&_.dark_.input-wrapper]:border-gray-700 [&_.input-wrapper]:border-gray-200 [&_.input]:text-lg [&_.input]:pl-12"
      />
      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
        <Search className="w-5 h-5 text-gray-400" />
      </div>
    </div>
  );
}
