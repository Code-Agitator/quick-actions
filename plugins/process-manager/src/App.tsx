import React, { useState, useEffect, useCallback, useRef } from 'react';

interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  status: string;
  user: string;
  startTime: string;
  commandLine: string;
  threads: number;
  handles: number;
  ports?: number[];
  files?: string[];
}

type SearchMode = 'auto' | 'name' | 'port' | 'file';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

// Toast 通知组件
const ToastContainer: React.FC<{ toasts: ToastMessage[] }> = ({ toasts }) => {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm animate-slide-in-right ${
            toast.type === 'success' ? 'bg-green-600' :
            toast.type === 'error' ? 'bg-red-600' :
            'bg-blue-600'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};

const App: React.FC = () => {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [filteredProcesses, setFilteredProcesses] = useState<ProcessInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('auto'); // 默认自动识别
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<ProcessInfo | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actions = (window as any).ACTIONS;

  // Toast 通知系统
  const showToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // 加载所有进程
  const loadProcesses = useCallback(async () => {
    if (!actions?.process) {
      console.error('Process API not available');
      return;
    }

    setLoading(true);
    try {
      const processList = await actions.process.listProcesses();
      
      // 如果有搜索条件，只更新 processes，保持 filteredProcesses 不变
      // 避免视觉闪烁
      if (searchQuery.trim()) {
        setProcesses(processList);
        // filteredProcesses 会通过 useEffect 自动更新
      } else {
        // 没有搜索时，同时更新两个状态
        setProcesses(processList);
        setFilteredProcesses(processList);
      }
      
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Failed to load processes:', error);
      showToast('error', '加载进程列表失败');
    } finally {
      setLoading(false);
    }
  }, [actions, searchQuery, showToast]);

  // 初始加载
  useEffect(() => {
    loadProcesses();
    
    if (autoRefresh) {
      const interval = setInterval(loadProcesses, 10000);
      return () => clearInterval(interval);
    }
  }, [loadProcesses, autoRefresh]);

  // 搜索进程（带防抖）
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      // 清空搜索时，直接显示所有进程
      setFilteredProcesses(processes);
      setSearching(false);
      return;
    }

    // 有搜索条件时，显示 loading 状态
    setSearching(true);
    
    searchTimeoutRef.current = setTimeout(() => {
      performSearch();
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, processes]);

  // 智能识别搜索类型
  const detectSearchType = (query: string): { type: 'port' | 'file' | 'name'; value: string } => {
    const trimmed = query.trim();
    
    // 1. 检查是否是纯数字（端口号）
    if (/^\d+$/.test(trimmed)) {
      const port = parseInt(trimmed);
      if (port >= 1 && port <= 65535) {
        return { type: 'port', value: trimmed };
      }
    }
    
    // 2. 检查是否是文件路径（包含盘符或斜杠）
    if (/^[a-zA-Z]:\\/.test(trimmed) || trimmed.includes('/') || trimmed.includes('\\')) {
      return { type: 'file', value: trimmed };
    }
    
    // 3. 默认按名称搜索
    return { type: 'name', value: trimmed };
  };

  // 执行搜索
  const performSearch = async () => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      setFilteredProcesses(processes);
      setSearching(false);
      return;
    }

    let results: ProcessInfo[] = [];

    try {
      // 自动识别搜索类型
      const detected = detectSearchType(searchQuery);
      
      switch (detected.type) {
        case 'port':
          const port = parseInt(detected.value);
          const portResults = await actions.process.findByPort(port);
          
          // 检查搜索条件是否仍然匹配（防止竞态条件）
          if (searchQuery.trim() === detected.value) {
            setFilteredProcesses(portResults);
            if (portResults.length === 0) {
              showToast('info', `未找到占用端口 ${port} 的进程`);
            } else {
              showToast('success', `找到 ${portResults.length} 个占用端口 ${port} 的进程`);
            }
          }
          setSearching(false);
          return;
        
        case 'file':
          const fileResults = await actions.process.findByFile(detected.value);
          
          // 检查搜索条件是否仍然匹配
          if (searchQuery.trim() === detected.value) {
            setFilteredProcesses(fileResults);
            if (fileResults.length === 0) {
              showToast('info', '未找到占用该文件的进程');
            } else {
              showToast('success', `找到 ${fileResults.length} 个占用该文件的进程`);
            }
          }
          setSearching(false);
          return;
        
        case 'name':
        default:
          // 支持名称和PID搜索
          results = processes.filter(p => 
            p.name.toLowerCase().includes(query) ||
            p.pid.toString().includes(query)
          );
          break;
      }

      setFilteredProcesses(results);
      
      if (results.length === 0) {
        showToast('info', '未找到匹配的进程');
      }
    } catch (error) {
      console.error('Search failed:', error);
      showToast('error', '搜索失败');
      setFilteredProcesses([]);
    } finally {
      setSearching(false);
    }
  };

  // 终止进程
  const killProcess = async (pid: number, graceful: boolean = false) => {
    const actionName = graceful ? '优雅终止' : '终止';
    
    if (!confirm(`确定要${actionName}进程 (PID: ${pid}) 吗？\n此操作不可撤销！`)) {
      return;
    }

    try {
      const success = graceful 
        ? await actions.process.gracefulKill(pid)
        : await actions.process.killProcess(pid);
      
      if (success) {
        showToast('success', `进程 ${pid} 已${actionName}`);
        loadProcesses();
      } else {
        showToast('error', `${actionName}进程失败`);
      }
    } catch (error) {
      console.error('Kill process failed:', error);
      showToast('error', `${actionName}进程时出错`);
    }
  };

  // 格式化内存大小
  const formatMemory = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 查看进程详情
  const viewDetails = async (process: ProcessInfo) => {
    setSelectedProcess(process);
    setShowDetails(true);

    try {
      const [ports, files] = await Promise.all([
        actions.process.getListeningPorts(process.pid).catch(() => []),
        actions.process.getOpenFiles(process.pid).catch(() => [])
      ]);

      setSelectedProcess(prev => prev ? {
        ...prev,
        ports: ports.length > 0 ? ports : undefined,
        files: files.length > 0 ? files : undefined
      } : null);
    } catch (error) {
      console.error('Failed to get process details:', error);
    }
  };

  // 格式化时间
  const formatTime = (date: Date | null) => {
    if (!date) return '--:--:--';
    return date.toLocaleTimeString('zh-CN', { hour12: false });
  };

  // 获取搜索类型提示
  const getSearchHint = () => {
    if (!searchQuery.trim()) {
      return '🔍 智能搜索：输入端口号、文件路径或进程名称';
    }
    
    const detected = detectSearchType(searchQuery);
    switch (detected.type) {
      case 'port':
        return `🔌 端口搜索: ${detected.value}`;
      case 'file':
        return `📁 文件搜索: ${detected.value}`;
      case 'name':
        return `📝 名称搜索: ${searchQuery}`;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Toast 通知 */}
      <ToastContainer toasts={toasts} />

      {/* 头部 */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl shadow-lg">
              ⚙️
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                进程管理器
              </h1>
              {lastRefreshTime && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  最后更新: {formatTime(lastRefreshTime)}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-all border ${
                autoRefresh 
                  ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
              }`}
              title={autoRefresh ? '关闭自动刷新' : '开启自动刷新'}
            >
              {autoRefresh ? '🔄 自动' : '⏸ 手动'}
            </button>
            
            <button
              onClick={loadProcesses}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-all shadow-md hover:shadow-lg disabled:shadow-none"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⟳</span>
                  刷新中
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>🔄</span>
                  刷新
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 智能搜索：输入端口号、文件路径或进程名称"
              className="w-full px-4 py-3 text-sm border-2 border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors pr-32 shadow-sm"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="animate-spin text-blue-600 text-lg">⟳</span>
              </div>
            )}
            {/* 智能识别提示 */}
            {searchQuery.trim() && !searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-md font-medium border border-blue-200 dark:border-blue-800">
                {(() => {
                  const detected = detectSearchType(searchQuery);
                  return detected.type === 'port' ? '🔌 端口' :
                         detected.type === 'file' ? '📁 文件' : '📝 名称';
                })()}
              </div>
            )}
          </div>
        </div>
        
        {/* 搜索提示 */}
        {searchQuery.trim() && (
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2 px-1">
            <span>{getSearchHint()}</span>
          </div>
        )}
      </div>

      {/* 进程列表 */}
      <div className="flex-1 overflow-y-auto bg-transparent">
        {filteredProcesses.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <p className="text-6xl mb-4 opacity-30">
                {searching ? '⟳' : '🔍'}
              </p>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                {searching ? '搜索中...' : loading ? '加载中...' : '未找到进程'}
              </p>
              {!searching && !loading && searchQuery && (
                <p className="text-sm mt-2 text-gray-500 dark:text-gray-500">
                  尝试更换搜索关键词
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-0.5 px-2 py-2">
            {/* 列标题 */}
            <div className="flex items-center gap-3 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200/50 dark:border-white/[0.08] mb-1">
              <div className="w-20 flex-shrink-0">PID</div>
              <div className="flex-1 min-w-0">进程名称</div>
              <div className="w-20 text-right flex-shrink-0">CPU</div>
              <div className="w-24 text-right flex-shrink-0">内存</div>
              <div className="w-20 text-center flex-shrink-0">操作</div>
            </div>
            
            {filteredProcesses.map((process, index) => {
              const isSelected = selectedProcess?.pid === process.pid;
              
              return (
                <div
                  key={process.pid}
                  onClick={() => viewDetails(process)}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    isSelected 
                      ? 'bg-black/5 dark:bg-white/[0.14]' 
                      : 'hover:bg-black/5 dark:hover:bg-white/[0.08]'
                  }`}
                >
                  {/* PID */}
                  <div className="w-20 flex-shrink-0">
                    <span className="font-mono text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                      {process.pid}
                    </span>
                  </div>
                  
                  {/* 进程名称和端口 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-[15px] font-medium truncate tracking-tight ${
                        isSelected 
                          ? 'text-gray-900 dark:text-gray-50' 
                          : 'text-gray-700 dark:text-gray-200'
                      }`}>
                        {process.name}
                      </h3>
                      {process.ports && process.ports.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {process.ports.slice(0, 2).map(port => (
                            <span 
                              key={port} 
                              className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-black/5 dark:bg-white/[0.1] text-blue-600 dark:text-blue-400 rounded border border-gray-300/50 dark:border-white/[0.08] backdrop-blur-sm"
                            >
                              🔌 {port}
                            </span>
                          ))}
                          {process.ports.length > 2 && (
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">+{process.ports.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* CPU */}
                  <div className="w-20 text-right flex-shrink-0">
                    <span className={`font-mono text-xs font-medium ${
                      process.cpu > 50 ? 'text-red-600 dark:text-red-400' :
                      process.cpu > 20 ? 'text-orange-600 dark:text-orange-400' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {process.cpu.toFixed(1)}%
                    </span>
                  </div>
                  
                  {/* 内存 */}
                  <div className="w-24 text-right flex-shrink-0">
                    <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                      {formatMemory(process.memory)}
                    </span>
                  </div>
                  
                  {/* 操作按钮 */}
                  <div className="w-20 text-center flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        killProcess(process.pid);
                      }}
                      className="opacity-0 group-hover:opacity-100 px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-md transition-all shadow-sm hover:shadow-md transform hover:scale-105"
                      title="强制终止进程"
                    >
                      🛑 终止
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="flex-shrink-0 px-6 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 text-xs flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            共 {filteredProcesses.length} 个进程
          </span>
          {searchQuery && (
            <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px] font-medium border border-blue-200 dark:border-blue-800">
              搜索: "{searchQuery}"
            </span>
          )}
        </div>
        <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-3">
          <span>💡 点击行查看详情</span>
          <span>•</span>
          <span>{autoRefresh ? '🔄 自动刷新' : '⏸ 手动模式'}</span>
        </div>
      </div>

      {/* 详情弹窗 */}
      {showDetails && selectedProcess && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
          onClick={() => setShowDetails(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-750 dark:to-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl shadow-lg">
                  ℹ️
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    进程详情
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    PID: {selectedProcess.pid}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>
            
            {/* 弹窗内容 */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* 基本信息网格 */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">PID</div>
                  <div className="font-mono text-lg font-semibold text-blue-600 dark:text-blue-400">{selectedProcess.pid}</div>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">CPU 使用率</div>
                  <div className={`text-lg font-semibold ${
                    selectedProcess.cpu > 50 ? 'text-red-600 dark:text-red-400' :
                    selectedProcess.cpu > 20 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-purple-600 dark:text-purple-400'
                  }`}>
                    {selectedProcess.cpu.toFixed(2)}%
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">内存占用</div>
                  <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {formatMemory(selectedProcess.memory)}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">用户</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedProcess.user}</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">线程数</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedProcess.threads}</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">句柄数</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedProcess.handles}</div>
                </div>
              </div>

              {/* 进程名称 */}
              <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-700/30 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">进程名称</div>
                <div className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <span className="text-xl">📦</span>
                  {selectedProcess.name}
                </div>
              </div>

              {/* 命令行 */}
              {selectedProcess.commandLine && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                    <span>💻</span> 命令行参数
                  </div>
                  <div className="text-xs font-mono bg-gray-100 dark:bg-gray-700 p-3 rounded-lg overflow-x-auto border-l-4 border-blue-500">
                    {selectedProcess.commandLine}
                  </div>
                </div>
              )}

              {/* 监听端口 */}
              {selectedProcess.ports && selectedProcess.ports.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                    <span>🔌</span> 监听端口 ({selectedProcess.ports.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedProcess.ports.map(port => (
                      <span 
                        key={port} 
                        className="px-3 py-1.5 text-sm bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 text-blue-800 dark:text-blue-200 rounded-lg font-mono shadow-sm"
                      >
                        {port}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 打开的文件 */}
              {selectedProcess.files && selectedProcess.files.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                    <span>📁</span> 打开的文件 ({selectedProcess.files.length})
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2">
                    {selectedProcess.files.slice(0, 10).map((file, idx) => (
                      <div 
                        key={idx} 
                        className="text-xs font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded border-l-2 border-gray-400 dark:border-gray-500 truncate hover:border-blue-500 transition-colors"
                        title={file}
                      >
                        {file}
                      </div>
                    ))}
                    {selectedProcess.files.length > 10 && (
                      <div className="text-xs text-gray-500 text-center py-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                        ... 还有 {selectedProcess.files.length - 10} 个文件
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 弹窗底部按钮 */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex gap-3">
              <button
                onClick={() => killProcess(selectedProcess.pid, false)}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg transition-all shadow-md hover:shadow-lg font-medium flex items-center justify-center gap-2"
              >
                <span>🛑</span>
                强制终止
              </button>
              <button
                onClick={() => killProcess(selectedProcess.pid, true)}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg font-medium flex items-center justify-center gap-2"
              >
                <span>✨</span>
                优雅终止
              </button>
              <button
                onClick={() => setShowDetails(false)}
                className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-gray-300 dark:border-gray-600 rounded-lg transition-all font-medium text-gray-700 dark:text-gray-300"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS 动画 */}
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
        
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default App;
