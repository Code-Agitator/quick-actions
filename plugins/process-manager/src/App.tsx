import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  status: string;
  user: string;
}

const App: React.FC = () => {
  const [allProcesses, setAllProcesses] = useState<ProcessInfo[]>([]); // 进程缓存
  const [portCache, setPortCache] = useState<Map<number, number[]>>(new Map()); // 端口缓存（PID -> 端口列表）
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [dynamicPortResults, setDynamicPortResults] = useState<number[]>([]); // 动态端口搜索结果
  const [confirmDialog, setConfirmDialog] = useState<{ show: boolean; pid: number; name: string } | null>(null); // 确认对话框
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actions = (window as any).ACTIONS;

  // 自动聚焦
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 输入处理 - 防抖
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // 清除动态端口搜索结果
    setDynamicPortResults([]);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedQuery(value);
    }, 200);
  };

  // 加载进程列表（不阻塞 UI）
  const loadProcesses = useCallback(async () => {
    if (!actions?.process) return;

    try {
      const processList = await actions.process.listProcesses();
      
      // 智能更新：只在数据真正变化时更新
      setAllProcesses(prev => {
        if (prev.length === processList.length && 
            prev.length > 0 && 
            prev[0].pid === processList[0].pid) {
          return prev;
        }
        return processList;
      });
      
      setLastRefresh(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Failed to load processes:', error);
      setLoading(false);
    }
  }, [actions]);

  // 初始加载
  useEffect(() => {
    loadProcesses();
  }, [loadProcesses]);

  // 后台静默刷新（5秒），不影响搜索
  useEffect(() => {
    const interval = setInterval(() => {
      loadProcesses(); // 后台刷新，不会阻塞 UI
    }, 5000);
    return () => clearInterval(interval);
  }, [loadProcesses]);

  // 预加载可见进程的端口（批量加载）
  useEffect(() => {
    const preloadPorts = async () => {
      // 只预加载前 20 个进程的端口（避免过多请求）
      const processesToLoad = allProcesses.slice(0, 20);
      
      for (const process of processesToLoad) {
        // 如果缓存中已有，跳过
        if (portCache.has(process.pid)) continue;
        
        try {
          const ports = await actions.process.getListeningPorts(process.pid);
          setPortCache(prev => new Map(prev).set(process.pid, ports || []));
        } catch (error) {
          console.error(`Failed to load ports for PID ${process.pid}:`, error);
        }
      }
    };

    // 延迟预加载，避免与初始加载冲突
    const timer = setTimeout(preloadPorts, 500);
    return () => clearTimeout(timer);
  }, [allProcesses, portCache, actions]);

  // 动态端口搜索：当输入数字时，实时查询端口
  useEffect(() => {
    const query = debouncedQuery.trim();
    
    // 检查是否是纯数字且可能是端口号
    const isNumeric = /^\d+$/.test(query);
    if (!isNumeric) {
      setDynamicPortResults([]);
      return;
    }

    const port = parseInt(query);
    if (port < 1 || port > 65535) {
      setDynamicPortResults([]);
      return;
    }

    // 异步查询端口
    const searchPort = async () => {
      try {
        const results = await actions.process.findByPort(port);
        const pids = results.map((p: ProcessInfo) => p.pid);
        setDynamicPortResults(pids);
        
        // ⭐ 将查询结果更新到端口缓存中，以便显示端口标签
        for (const process of results) {
          // 获取该进程的完整端口列表
          try {
            const ports = await actions.process.getListeningPorts(process.pid);
            setPortCache(prev => new Map(prev).set(process.pid, ports || []));
          } catch (error) {
            console.error(`Failed to load ports for PID ${process.pid}:`, error);
          }
        }
      } catch (error) {
        console.error('Port search failed:', error);
        setDynamicPortResults([]);
      }
    };

    searchPort();
  }, [debouncedQuery, actions]);

  // 实时搜索（基于内存缓存 + 端口缓存 + 动态端口搜索）
  const filteredProcesses = useMemo(() => {
    const query = debouncedQuery.toLowerCase().trim();
    
    if (!query) {
      return allProcesses;
    }

    // 检查是否是纯数字（可能是端口或 PID）
    const isNumeric = /^\d+$/.test(query);
    
    if (isNumeric) {
      const searchNum = parseInt(query);
      
      // 多模式搜索：名称 + PID + 端口（缓存）+ 端口（动态）
      return allProcesses.filter(p => {
        // 1. 名称匹配
        const nameMatch = p.name.toLowerCase().includes(query);
        
        // 2. PID 匹配
        const pidMatch = p.pid.toString().includes(query);
        
        // 3. 端口匹配（从缓存中查找）
        const ports = portCache.get(p.pid) || [];
        const portMatch = ports.includes(searchNum);
        
        // 4. 动态端口搜索结果
        const dynamicPortMatch = dynamicPortResults.includes(p.pid);
        
        return nameMatch || pidMatch || portMatch || dynamicPortMatch;
      });
    }

    // 普通搜索：名称 + PID
    return allProcesses.filter(p => {
      const nameMatch = p.name.toLowerCase().includes(query);
      const pidMatch = p.pid.toString().includes(query);
      return nameMatch || pidMatch;
    });
  }, [debouncedQuery, allProcesses, portCache, dynamicPortResults]);

  // 终止进程
  const killProcess = async (pid: number) => {
    try {
      const success = await actions.process.killProcess(pid);
      if (success) {
        setAllProcesses(prev => prev.filter(p => p.pid !== pid));
        setPortCache(prev => {
          const newCache = new Map(prev);
          newCache.delete(pid);
          return newCache;
        });
      }
    } catch (error) {
      console.error('Kill process failed:', error);
    }
  };

  // 显示确认对话框
  const showConfirmDialog = (pid: number, name: string) => {
    setConfirmDialog({ show: true, pid, name });
  };

  // 确认关闭进程
  const handleConfirmKill = () => {
    if (confirmDialog) {
      killProcess(confirmDialog.pid);
      setConfirmDialog(null);
    }
  };

  // 取消关闭进程
  const handleCancelKill = () => {
    setConfirmDialog(null);
  };

  // 格式化内存
  const formatMemory = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化时间
  const formatTime = (date: Date | null) => {
    if (!date) return '--:--:--';
    return date.toLocaleTimeString('zh-CN', { hour12: false });
  };

  // 进程列表项组件
  const ProcessItem = React.memo(({ 
    process, 
    onKill 
  }: { 
    process: ProcessInfo; 
    onKill: (pid: number, name: string) => void 
  }) => {
    const ports = portCache.get(process.pid) || [];

    return (
      <div 
        className="group px-4 py-3 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-start gap-3 cursor-pointer border-l-4 border-transparent hover:border-red-500"
        onClick={() => onKill(process.pid, process.name)}
        title="点击终止进程"
      >
        {/* PID */}
        <div className="w-16 flex-shrink-0 pt-0.5">
          <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
            {process.pid}
          </span>
        </div>
        
        {/* 进程名称和端口 */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mb-1 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
            {process.name}
          </h3>
          
          {/* 端口标签 - 从缓存读取，无延迟 */}
          {ports.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {ports.slice(0, 5).map(port => (
                <span 
                  key={port}
                  className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800"
                >
                  🔌 {port}
                </span>
              ))}
              {ports.length > 5 && (
                <span className="text-[10px] text-gray-500 dark:text-gray-400 px-1">
                  +{ports.length - 5}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* CPU */}
        <div className="w-16 text-right flex-shrink-0 pt-0.5">
          <span className={`text-xs font-mono ${
            process.cpu > 50 ? 'text-red-600' :
            process.cpu > 20 ? 'text-orange-600' :
            'text-gray-600 dark:text-gray-400'
          }`}>
            {process.cpu.toFixed(1)}%
          </span>
        </div>
        
        {/* 内存 */}
        <div className="w-20 text-right flex-shrink-0 pt-0.5">
          <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
            {formatMemory(process.memory)}
          </span>
        </div>
      </div>
    );
  });

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* 头部 */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              进程管理
            </h1>
            {lastRefresh && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                最后更新: {formatTime(lastRefresh)} • 共 {allProcesses.length} 个进程
              </p>
            )}
          </div>
          
          <button
            onClick={loadProcesses}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
          >
            {loading ? '刷新中...' : '🔄 刷新'}
          </button>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="🔍 搜索进程名称、PID 或端口..."
            className="w-full px-4 py-2.5 text-sm border-2 border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors pr-20"
          />
          {/* 搜索模式提示 */}
          {debouncedQuery && /^\d+$/.test(debouncedQuery) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
              <span className="px-2 py-0.5 text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded font-medium">
                🔌 端口+PID
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 进程列表 */}
      <div className="flex-1 overflow-y-auto">
        {loading && allProcesses.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-4xl mb-2 animate-spin">⟳</p>
              <p>正在加载...</p>
            </div>
          </div>
        ) : filteredProcesses.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-4xl mb-2">🔍</p>
              <p>{searchQuery ? '未找到匹配的进程' : '暂无进程'}</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {filteredProcesses.map((process) => (
              <ProcessItem
                key={process.pid}
                process={process}
                onKill={showConfirmDialog}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="flex-shrink-0 px-4 py-2 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
        <span>显示 {filteredProcesses.length} / {allProcesses.length} 个进程</span>
        <span>💡 点击进程即可终止 • 5秒自动刷新</span>
      </div>

      {/* 自定义确认对话框 */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 transform transition-all animate-scale-in">
            {/* 图标和标题 */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  确认终止进程
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  此操作不可撤销
                </p>
              </div>
            </div>

            {/* 进程信息 */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">进程名称:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate ml-4">
                    {confirmDialog.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">PID:</span>
                  <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                    {confirmDialog.pid}
                  </span>
                </div>
              </div>
            </div>

            {/* 警告提示 */}
            <div className="mb-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                ⚠️ 强制终止进程可能导致数据丢失或程序异常，请谨慎操作！
              </p>
            </div>

            {/* 按钮组 */}
            <div className="flex gap-3">
              <button
                onClick={handleCancelKill}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmKill}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-lg shadow-red-600/30"
              >
                🗑️ 确认终止
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
