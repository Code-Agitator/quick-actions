import React, { useState, useEffect, useRef } from 'react';

interface AppProps {
  query?: string;
  onResult?: (result: any) => void;
}

type UUIDFormat = 'standard' | 'uppercase' | 'no-dash' | 'no-dash-upper';

interface UUIDItem {
  id: string;
  original: string;
  formatted: string;
  format: UUIDFormat;
  timestamp: number;
}

const App: React.FC<AppProps> = () => {
  const [uuids, setUuids] = useState<UUIDItem[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [currentFormat, setCurrentFormat] = useState<UUIDFormat>('standard');
  const actions = (window as any).ACTIONS;

  // 生成 UUID v4
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // 格式化 UUID
  const formatUUID = (uuid: string, format: UUIDFormat): string => {
    switch (format) {
      case 'uppercase':
        return uuid.toUpperCase();
      case 'no-dash':
        return uuid.replace(/-/g, '');
      case 'no-dash-upper':
        return uuid.replace(/-/g, '').toUpperCase();
      case 'standard':
      default:
        return uuid;
    }
  };

  // 获取格式标签
  const getFormatLabel = (format: UUIDFormat): string => {
    switch (format) {
      case 'uppercase':
        return '大写';
      case 'no-dash':
        return '无横杠';
      case 'no-dash-upper':
        return '大写无横杠';
      case 'standard':
      default:
        return '标准';
    }
  };

  // 生成单个 UUID
  const handleGenerateOne = () => {
    const original = generateUUID();
    const formatted = formatUUID(original, currentFormat);
    const newItem: UUIDItem = {
      id: `${original}-${Date.now()}`,
      original,
      formatted,
      format: currentFormat,
      timestamp: Date.now()
    };
    setUuids(prev => [newItem, ...prev].slice(0, 50)); // 最多保留 50 个
  };

  // 批量生成 UUID
  const handleGenerateBatch = (count: number) => {
    const newItems: UUIDItem[] = Array.from({ length: count }, () => {
      const original = generateUUID();
      const formatted = formatUUID(original, currentFormat);
      return {
        id: `${original}-${Date.now()}-${Math.random()}`,
        original,
        formatted,
        format: currentFormat,
        timestamp: Date.now()
      };
    });
    setUuids(prev => [...newItems, ...prev].slice(0, 50));
  };

  // 复制到剪贴板
  const copyToClipboard = async (uuid: string, index: number) => {
    try {
      if (actions?.clipboard) {
        await actions.clipboard.writeText(uuid);
      } else {
        // Fallback to browser API
        await navigator.clipboard.writeText(uuid);
      }
      
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000); // 2秒后重置
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // 切换格式并重新生成所有 UUID
  const handleFormatChange = (format: UUIDFormat) => {
    setCurrentFormat(format);
    // 重新格式化现有的 UUID
    setUuids(prev => prev.map(item => ({
      ...item,
      formatted: formatUUID(item.original, format),
      format
    })));
  };

  // 清空列表
  const handleClear = () => {
    setUuids([]);
  };

  // 初始化时生成一个 UUID
  useEffect(() => {
    if (uuids.length === 0) {
      handleGenerateOne();
    }
  }, []);

  // 自动聚焦到搜索框（如果有的话）
  useEffect(() => {
    const input = document.querySelector('input');
    if (input) {
      (input as HTMLInputElement).focus();
    }
  }, []);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      {/* 头部 */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-2xl">🔑</span>
              UUID 生成器
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              快速生成和复制 UUID v4
            </p>
          </div>
        </div>

        {/* 格式选择 */}
        <div className="mb-3">
          <div className="flex gap-2 flex-wrap">
            {(['standard', 'uppercase', 'no-dash', 'no-dash-upper'] as UUIDFormat[]).map((format) => (
              <button
                key={format}
                onClick={() => handleFormatChange(format)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  currentFormat === format
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {getFormatLabel(format)}
              </button>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button
            onClick={handleGenerateOne}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-lg shadow-indigo-600/30 hover:shadow-xl hover:shadow-indigo-600/40 active:scale-95"
          >
            ✨ 生成 1 个
          </button>
          <button
            onClick={() => handleGenerateBatch(5)}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/40 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 rounded-lg transition-colors"
          >
            🎲 生成 5 个
          </button>
          <button
            onClick={() => handleGenerateBatch(10)}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-900/60 rounded-lg transition-colors"
          >
            🚀 生成 10 个
          </button>
          {uuids.length > 0 && (
            <button
              onClick={handleClear}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              title="清空列表"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* UUID 列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {uuids.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <p className="text-6xl mb-4 opacity-50">🔑</p>
              <p className="text-lg font-medium">暂无 UUID</p>
              <p className="text-sm mt-2">点击上方按钮生成 UUID</p>
            </div>
          </div>
        ) : (
          uuids.map((item, index) => (
            <div
              key={item.id}
              onClick={() => copyToClipboard(item.formatted, index)}
              className={`group relative p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer border-2 ${
                copiedIndex === index
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-transparent hover:border-indigo-300 dark:hover:border-indigo-700'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                {/* UUID 文本 */}
                <code className="flex-1 text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
                  {item.formatted}
                </code>
                
                {/* 复制状态图标 */}
                <div className="flex-shrink-0">
                  {copiedIndex === index ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40 rounded">
                      ✓ 已复制
                    </span>
                  ) : (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/40 rounded">
                      📋 点击复制
                    </span>
                  )}
                </div>
              </div>
              
              {/* 序号和格式标签 */}
              <div className="absolute top-2 left-2 flex items-center gap-1">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                  #{uuids.length - index}
                </span>
                {item.format !== 'standard' && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded font-medium">
                    {getFormatLabel(item.format)}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 底部提示 */}
      <div className="flex-shrink-0 px-4 py-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
        <span>共 {uuids.length} 个 UUID</span>
        <span>💡 点击任意 UUID 即可复制</span>
      </div>
    </div>
  );
};

export default App;
