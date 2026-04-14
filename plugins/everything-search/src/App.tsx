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
  const [port, setPort] = useState('6808'); // Everything HTTP 服务器端口

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
      if (!(window as any).ACTIONS || !(window as any).ACTIONS.http) {
        throw new Error('ACTIONS API 不可用');
      }

      // 使用 ACTIONS.http.get 发起请求（通过 Rust 后端代理，避免跨域）
      const response = await (window as any).ACTIONS.http.get(
        `http://127.0.0.1:${port}/?json=1&path_column=1&size_column=1&date_modified_column=1&count=100&search=${encodeURIComponent(keyword)}`
      );

      if (response.status === 200) {
        // Everything 可能直接返回数组，或者返回 { results: [...] }
        let resultsArray: any[] = [];
        
        if (Array.isArray(response.data)) {
          // 直接是数组
          resultsArray = response.data;
        } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
          // 有 results 字段
          resultsArray = response.data.results;
        } else if (response.data && response.data.totalResults > 0) {
          // 有其他格式
          resultsArray = [];
        }
        
        setResults(resultsArray.map((item: any) => ({
          name: item.name || item['Name'] || '',
          path: item.path || item['Path'] || '',
          size: parseInt(item.size || item['Size'] || '0'),
          dateModified: item['date-modified'] || item['Date Modified'] || item.dateModified || '',
        })));
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Search error:', err);
      
      let errorMessage = '搜索失败';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      // 提供更详细的错误信息
      if (errorMessage.includes('503')) {
        errorMessage = `无法连接到 Everything 服务 (503 Service Unavailable)

可能原因：
1. Everything HTTP 服务器未启用
2. Everything 正在运行但 HTTP 服务被阻止
3. 端口号不正确（当前: ${port}）
4. 防火墙阻止了连接

请检查：
- Everything → 工具 → 选项 → HTTP 服务器 → 启用 HTTP 服务器
- 确认端口号是否正确（Everything 设置中查看）
- 尝试在浏览器访问: http://127.0.0.1:${port}/?json=1&search=test`;
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
        // 打开文件或文件夹
        window.open(`file://${selected.path}\\${selected.name}`, '_blank');
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
          
          {/* 端口配置 */}
          <div className="flex items-center gap-2 text-sm">
            <label className="text-gray-600">HTTP 端口:</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              min="1"
              max="65535"
            />
            <span className="text-gray-500 text-xs">(默认 6808)</span>
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
            <p className="text-red-700">❌ {error}</p>
            <p className="text-sm text-red-600 mt-2">
              请确保 Everything 服务已启动并且启用了 HTTP 服务器
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
                        window.open(`file://${item.path}\\${item.name}`, '_blank');
                      }}
                      onDoubleClick={() => {
                        window.open(`file://${item.path}\\${item.name}`, '_blank');
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
              <li>• 需要在 Everything 中启用 HTTP 服务器（菜单 → 工具 → 选项 → HTTP 服务器）</li>
              <li>• 设置正确的 HTTP 端口号（默认 6808，可在 Everything 设置中查看）</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
