import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface ClipboardItem {
  content: string;
  timestamp: number;
}

const App: React.FC = () => {
  const [items, setItems] = useState<ClipboardItem[]>([]);

  // 从后端加载历史记录
  const loadHistory = async () => {
    try {
      const data = await invoke<string>('storage_get', { key: 'clipboard_history' });
      if (data) {
        setItems(JSON.parse(data));
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  useEffect(() => {
    loadHistory();
    // 每 2 秒刷新一次，确保看到最新的后台记录
    const timer = setInterval(loadHistory, 2000);
    return () => clearInterval(timer);
  }, []);

  const copyToClipboard = (content: string) => {
    invoke('clipboard_write', { text: content });
  };

  const clearAll = async () => {
    if (window.confirm('确定要清空所有历史记录吗？')) {
      setItems([]);
      await invoke('storage_set', { key: 'clipboard_history', value: '[]' });
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 font-sans">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="text-4xl">📋</span>
              剪贴板助手
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Rust 后台自动监听，随时记录您的复制内容</p>
          </div>
          
          <button
            onClick={clearAll}
            className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            🗑 清空历史
          </button>
        </div>

        {/* List */}
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <p className="text-6xl mb-4">📭</p>
              <p className="text-gray-500 dark:text-gray-400 text-lg">暂无剪贴板记录</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">尝试复制一些文本，Rust 正在后台为您记录...</p>
            </div>
          ) : (
            items.map((item, index) => (
              <div 
                key={index} 
                className="group bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 dark:text-gray-200 break-all whitespace-pre-wrap font-mono text-sm leading-relaxed">
                      {item.content}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-2">
                      <span>🕒 {formatTime(item.timestamp)}</span>
                      <span>•</span>
                      <span>{item.content.length} 字符</span>
                    </p>
                  </div>
                  
                  <button
                    onClick={() => copyToClipboard(item.content)}
                    className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors opacity-0 group-hover:opacity-100"
                    title="再次复制"
                  >
                    📋
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
