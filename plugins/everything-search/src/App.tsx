import React, { useState, useEffect } from 'react';

interface SearchResult {
  name: string;
  path: string;
  size: number;
  dateModified: string;
}

interface AppProps {
  query?: string;
  onResult?: (result: any) => void;
}

const App: React.FC<AppProps> = ({ query, onResult }) => {
  const [searchQuery, setSearchQuery] = useState(query || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 搜索 Everything
  const searchEverything = async (keyword: string) => {
    if (!keyword.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 检查 ACTIONS API 是否可用
      if (!(window as any).ACTIONS || !(window as any).ACTIONS.everything) {
        throw new Error('ACTIONS API 不可用');
      }

      // 使用 ACTIONS.everything.search 通过 es.exe Sidecar 搜索
      const searchResults = await (window as any).ACTIONS.everything.search(keyword);
      
      setResults(searchResults.map((item: any) => ({
        name: item.name || '',
        path: item.path || '',
        size: parseInt(item.size?.toString() || '0'),
        dateModified: item.dateModified || '',
      })));
    } catch (err) {
      console.error('Search error:', err);
      
      let errorMessage = '搜索失败';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      // 提供更详细的错误信息
      if (errorMessage.includes('es.exe') || errorMessage.includes('sidecar')) {
        errorMessage = `无法执行 Everything 搜索

可能原因：
1. Everything 未安装或未运行
2. es.exe 文件缺失或损坏
3. Everything 索引未建立

请检查：
- 确认已安装 Everything (https://www.voidtools.com/zh-cn/)
- 确保 Everything 正在运行
- 尝试在 Everything 中手动搜索测试`;
      }
      
      setError(errorMessage);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // 监听查询变化
  useEffect(() => {
    if (query !== undefined && query !== searchQuery) {
      setSearchQuery(query);
      searchEverything(query);
    }
  }, [query]);

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        const selected = results[selectedIndex];
        // 使用 ACTIONS.everything.open 打开文件或文件夹
        const fullPath = `${selected.path}\\${selected.name}`;
        if ((window as any).ACTIONS?.everything?.open) {
          (window as any).ACTIONS.everything.open(fullPath);
        } else {
          // 降级方案：使用 window.open
          window.open(`file://${fullPath}`, '_blank');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedIndex]);

  // 格式化文件大小
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化日期
  const formatDate = (timestamp: string): string => {
    if (!timestamp) return '-';
    const date = new Date(parseInt(timestamp) * 10000 - 11644473600000); // Windows FILETIME to JS Date
    return date.toLocaleString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-3 flex items-center gap-2">
            🔍 Everything 搜索
          </h1>
          
          {/* 搜索框 */}
          <div className="relative mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchEverything(e.target.value);
              }}
              placeholder="输入关键词搜索文件..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              autoFocus
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              🔎
            </span>
          </div>
        </div>
      </div>

      {/* 结果列表 */}
      <div className="max-w-6xl mx-auto p-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">搜索中...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <p className="text-red-700 whitespace-pre-line">❌ {error}</p>
            <p className="text-sm text-red-600 mt-2">
              请确保 Everything 已安装并正在运行
            </p>
          </div>
        )}

        {!loading && !error && results.length === 0 && searchQuery && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">未找到匹配的文件</p>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="bg-white rounded-md shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      文件名
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      路径
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      大小
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      修改时间
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.map((item, index) => (
                    <tr
                      key={`${item.path}\\${item.name}`}
                      className={`cursor-pointer transition-colors ${
                        index === selectedIndex
                          ? 'bg-blue-50 hover:bg-blue-100'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        setSelectedIndex(index);
                        const fullPath = `${item.path}\\${item.name}`;
                        if ((window as any).ACTIONS?.everything?.open) {
                          (window as any).ACTIONS.everything.open(fullPath);
                        } else {
                          window.open(`file://${fullPath}`, '_blank');
                        }
                      }}
                      onDoubleClick={() => {
                        const fullPath = `${item.path}\\${item.name}`;
                        if ((window as any).ACTIONS?.everything?.open) {
                          (window as any).ACTIONS.everything.open(fullPath);
                        } else {
                          window.open(`file://${fullPath}`, '_blank');
                        }
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <span className="mr-2">
                            {item.name.includes('.') ? '📄' : '📁'}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 truncate max-w-xs block">
                          {item.path}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {formatSize(item.size)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {formatDate(item.dateModified)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* 结果统计 */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                共找到 {results.length} 个结果
              </p>
            </div>
          </div>
        )}

        {/* 使用说明 */}
        {!searchQuery && (
          <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
            <h3 className="font-semibold text-blue-900 mb-2">💡 使用说明</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 在上方搜索框输入关键词即可搜索</li>
              <li>• 使用 ↑ ↓ 方向键选择结果</li>
              <li>• 按 Enter 键或双击打开文件/文件夹</li>
              <li>• 需要安装并启动 Everything 软件</li>
              <li>• 使用 es.exe CLI 工具进行搜索（无需配置 HTTP 服务器）</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
