import React, { useState, useRef, useEffect } from 'react';

interface CommandHistory {
  command: string;
  output: string;
  error?: string;
  timestamp: Date;
  success: boolean;
}

interface AppProps {
  query?: string;
  onResult?: (result: any) => void;
}

const App: React.FC<AppProps> = ({ query, onResult }) => {
  const [command, setCommand] = useState(query || '');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<CommandHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  // 自动滚动到输出底部
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, error]);

  // 执行命令
  const executeCommand = async () => {
    if (!command.trim()) return;

    setLoading(true);
    setError('');
    setOutput('');

    try {
      // 检查 ACTIONS API 是否可用
      if (!(window as any).ACTIONS || !(window as any).ACTIONS.shell) {
        throw new Error('ACTIONS API 不可用');
      }

      // 解析命令
      const parts = command.trim().split(/\s+/);
      const cmd = parts[0];
      const args = parts.slice(1);

      // 调用 ACTIONS shell API
      const result = await (window as any).ACTIONS.shell.execute(cmd, args);

      setOutput(result || '');
      
      // 添加到历史记录
      const historyItem: CommandHistory = {
        command: command.trim(),
        output: result || '',
        timestamp: new Date(),
        success: true
      };
      setHistory(prev => [historyItem, ...prev].slice(0, 50)); // 保留最近50条

    } catch (err: any) {
      const errorMsg = err.message || err.toString();
      setError(errorMsg);
      
      // 添加错误到历史记录
      const historyItem: CommandHistory = {
        command: command.trim(),
        output: '',
        error: errorMsg,
        timestamp: new Date(),
        success: false
      };
      setHistory(prev => [historyItem, ...prev].slice(0, 50));
    } finally {
      setLoading(false);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand();
    } else if (e.key === 'ArrowUp' && history.length > 0) {
      // 上箭头显示上一条命令
      e.preventDefault();
      setCommand(history[0].command);
    }
  };

  // 清除输出
  const clearOutput = () => {
    setOutput('');
    setError('');
  };

  // 复制输出
  const copyOutput = async () => {
    const textToCopy = error || output;
    if (textToCopy) {
      await navigator.clipboard.writeText(textToCopy);
      // 可以显示一个提示
    }
  };

  // 快速命令
  const quickCommands = [
    { label: '查看目录', cmd: 'dir', icon: '📁' },
    { label: '系统信息', cmd: 'systeminfo', icon: '💻' },
    { label: '网络状态', cmd: 'ipconfig', icon: '🌐' },
    { label: '进程列表', cmd: 'tasklist', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* 标题栏 */}
        <div className="flex items-center justify-between bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="text-3xl">⚡</div>
            <div>
              <h1 className="text-2xl font-bold text-white">命令执行器</h1>
              <p className="text-sm text-gray-400">Command Runner</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <span>📜</span>
            <span>历史 ({history.length})</span>
          </button>
        </div>

        {/* 快速命令 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickCommands.map((qc, idx) => (
            <button
              key={idx}
              onClick={() => setCommand(qc.cmd)}
              className="p-3 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-blue-500 rounded-lg transition-all group"
            >
              <div className="text-2xl mb-1">{qc.icon}</div>
              <div className="text-sm text-gray-300 group-hover:text-white">{qc.label}</div>
              <div className="text-xs text-gray-500 font-mono mt-1">{qc.cmd}</div>
            </button>
          ))}
        </div>

        {/* 命令输入 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            命令
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入命令，例如: dir, ipconfig, ping google.com"
              className="flex-1 px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono"
            />
            <button
              onClick={executeCommand}
              disabled={loading || !command.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>执行中...</span>
                </>
              ) : (
                <>
                  <span>▶</span>
                  <span>执行</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 提示: 按 Enter 执行命令，按 ↑ 查看上一条命令
          </p>
        </div>

        {/* 输出区域 */}
        {(output || error) && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
            {/* 输出工具栏 */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-900/50 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <span className={`text-sm ${error ? 'text-red-400' : 'text-green-400'}`}>
                  {error ? '❌ 错误' : '✅ 输出'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyOutput}
                  className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                >
                  📋 复制
                </button>
                <button
                  onClick={clearOutput}
                  className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                >
                  🗑️ 清除
                </button>
              </div>
            </div>

            {/* 输出内容 */}
            <div
              ref={outputRef}
              className="p-4 max-h-96 overflow-y-auto font-mono text-sm"
            >
              {error ? (
                <pre className="text-red-400 whitespace-pre-wrap">{error}</pre>
              ) : (
                <pre className="text-green-400 whitespace-pre-wrap">{output}</pre>
              )}
            </div>
          </div>
        )}

        {/* 历史记录 */}
        {showHistory && history.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
            <div className="px-4 py-3 bg-gray-900/50 border-b border-gray-700">
              <h3 className="text-sm font-medium text-gray-300">执行历史</h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setCommand(item.command)}
                  className="p-3 border-b border-gray-700 hover:bg-gray-700/30 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <code className="text-sm text-blue-400 font-mono">{item.command}</code>
                    <span className="text-xs text-gray-500">
                      {item.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className={`text-xs ${item.success ? 'text-green-400' : 'text-red-400'}`}>
                    {item.success ? '✅ 成功' : `❌ 失败: ${item.error}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 安全提示 */}
        <div className="bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h4 className="text-sm font-semibold text-yellow-400 mb-1">安全警告</h4>
              <p className="text-xs text-yellow-300/80">
                请谨慎执行命令，特别是来自不可信来源的命令。恶意命令可能会损害您的系统或泄露敏感信息。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
