import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';

interface AppProps {
  query?: string;
  onResult?: (result: any) => void;
}

interface ConsoleEntry {
  type: 'input' | 'output';
  content: string;
  timestamp: Date;
  isError?: boolean;
}

interface VariableInfo {
  name: string;
  value: any;
  type: string;
  expanded: boolean;
  children?: VariableInfo[];
  // 新增：对象 introspection 信息
  properties?: string[];  // 属性名列表
  methods?: string[];     // 方法名列表
  prototype?: string;     // 原型名称
}

// 特殊对象处理器接口
interface SpecialObjectHandler {
  // 检测是否是该类型的对象
  test: (value: any) => boolean;
  // 获取显示类型名称
  getTypeName: (value: any) => string;
  // 格式化显示文本
  formatDisplay: (value: any) => string;
  // 格式化拷贝内容
  formatCopy: (value: any) => string;
  // 是否应该展开子属性（默认 false）
  shouldExpand?: boolean;
}

// 特殊对象处理器注册表
const specialObjectHandlers: SpecialObjectHandler[] = [
  {
    test: (value) => value instanceof Date,
    getTypeName: () => 'date',
    formatDisplay: (value) => value.toISOString(),
    formatCopy: (value) => value.toISOString(),
  },
  {
    test: (value) => value instanceof RegExp,
    getTypeName: () => 'regexp',
    formatDisplay: (value) => value.toString(),
    formatCopy: (value) => value.toString(),
  },
  {
    test: (value) => value instanceof Error,
    getTypeName: (value) => value.name.toLowerCase(),
    formatDisplay: (value) => `${value.name}: ${value.message}`,
    formatCopy: (value) => `${value.name}: ${value.message}\n${value.stack || ''}`,
  },
  {
    test: (value) => value instanceof URL,
    getTypeName: () => 'url',
    formatDisplay: (value) => value.href,
    formatCopy: (value) => value.href,
  },
  {
    test: (value) => value instanceof Map,
    getTypeName: () => 'map',
    formatDisplay: (value) => `Map(${value.size})`,
    formatCopy: (value) => JSON.stringify(Array.from(value.entries()), null, 2),
    shouldExpand: true,
  },
  {
    test: (value) => value instanceof Set,
    getTypeName: () => 'set',
    formatDisplay: (value) => `Set(${value.size})`,
    formatCopy: (value) => JSON.stringify(Array.from(value), null, 2),
    shouldExpand: true,
  },
];

// 查找特殊对象处理器
const findSpecialHandler = (value: any): SpecialObjectHandler | null => {
  return specialObjectHandlers.find(handler => handler.test(value)) || null;
};

// 对象内省：获取对象的属性和方法
const introspectObject = (obj: any) => {
  if (!obj || typeof obj !== 'object') return null;
  
  const properties: string[] = [];
  const methods: string[] = [];
  const prototype = Object.getPrototypeOf(obj)?.constructor?.name || 'Object';
  
  // 获取所有自有属性
  const ownProps = Object.getOwnPropertyNames(obj);
  const symbols = Object.getOwnPropertySymbols(obj);
  
  [...ownProps, ...symbols.map(s => s.toString())].forEach(prop => {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
      if (descriptor) {
        if (typeof descriptor.value === 'function') {
          methods.push(prop);
        } else {
          properties.push(prop);
        }
      }
    } catch (e) {
      // 忽略访问错误的属性
    }
  });
  
  // 获取原型链上的方法（最多3层）
  let proto = Object.getPrototypeOf(obj);
  let depth = 0;
  while (proto && depth < 3) {
    const protoProps = Object.getOwnPropertyNames(proto);
    protoProps.forEach(prop => {
      if (!methods.includes(prop) && !properties.includes(prop)) {
        try {
          const desc = Object.getOwnPropertyDescriptor(proto, prop);
          if (desc && typeof desc.value === 'function' && prop !== 'constructor') {
            methods.push(prop);
          }
        } catch (e) {}
      }
    });
    proto = Object.getPrototypeOf(proto);
    depth++;
  }
  
  return {
    properties: properties.slice(0, 50),  // 限制数量
    methods: methods.slice(0, 50),
    prototype,
  };
};

const App: React.FC<AppProps> = ({ query, onResult }) => {
  const [code, setCode] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);  // 控制台历史记录
  const [variables, setVariables] = useState<VariableInfo[]>([]);
  const [context, setContext] = useState<Record<string, any>>({});
  const [selectedVar, setSelectedVar] = useState<VariableInfo | null>(null);  // 选中的变量
  const [activeTab, setActiveTab] = useState<'variables' | 'inspector'>('variables');  // 活动标签
  const [isMultiLine, setIsMultiLine] = useState(false);  // 是否多行模式
  
  const editorRef = useRef<any>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const executeCodeRef = useRef<() => void>(() => {});
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 检测系统主题
  useEffect(() => {
    const checkTheme = () => {
      const dark = document.documentElement.classList.contains('dark');
      setIsDarkMode(dark);
    };
    
    checkTheme();
    
    // 监听主题变化
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  // 自动滚动到输出底部
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [consoleEntries]);

  // 解析变量
  const parseVariables = useCallback((ctx: Record<string, any>): VariableInfo[] => {
    return Object.entries(ctx).map(([name, value]) => {
      return analyzeValue(name, value);
    });
  }, []);

  // 分析值的类型和结构
  const analyzeValue = (name: string, value: any, depth: number = 0): VariableInfo => {
    // 检查是否有特殊对象处理器
    const handler = findSpecialHandler(value);
    
    let type: string;
    let children: VariableInfo[] | undefined;
    let properties: string[] | undefined;
    let methods: string[] | undefined;
    let prototype: string | undefined;
    
    if (handler) {
      // 使用特殊处理器
      type = handler.getTypeName(value);
      
      // 如果允许展开且有子元素
      if (handler.shouldExpand && depth < 3) {
        if (value instanceof Map) {
          children = Array.from(value.entries()).slice(0, 20).map(([key, val], idx) => 
            analyzeValue(`[${idx}]`, { key, value: val }, depth + 1)
          );
        } else if (value instanceof Set) {
          children = Array.from(value).slice(0, 20).map((item, idx) => 
            analyzeValue(`[${idx}]`, item, depth + 1)
          );
        }
      }
    } else {
      // 普通对象处理
      type = typeof value;
      
      if (depth < 3 && type === 'object' && value !== null) {
        if (Array.isArray(value)) {
          children = value.slice(0, 20).map((item, idx) => 
            analyzeValue(`[${idx}]`, item, depth + 1)
          );
        } else {
          // 对普通对象进行内省
          const introspection = introspectObject(value);
          if (introspection) {
            properties = introspection.properties;
            methods = introspection.methods;
            prototype = introspection.prototype;
          }
          
          children = Object.entries(value).slice(0, 20).map(([key, val]) => 
            analyzeValue(key, val, depth + 1)
          );
        }
      }
    }
    
    const info: VariableInfo = {
      name,
      value,
      type,
      expanded: false,
      children,
      properties,
      methods,
      prototype,
    };

    return info;
  };

  // 格式化值显示
  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`;
    
    // 检查特殊对象处理器
    const handler = findSpecialHandler(value);
    if (handler) {
      return handler.formatDisplay(value);
    }
    
    if (typeof value === 'object') {
      if (Array.isArray(value)) return `Array(${value.length})`;
      return `{${Object.keys(value).length} keys}`;
    }
    return String(value);
  };

  // 执行代码 - 浏览器控制台风格
  const executeCode = useCallback(() => {
    if (!code.trim()) return;

    // 获取最后一行代码（当前输入的命令）
    const lines = code.split('\n');
    const currentLine = lines[lines.length - 1].trim();
    
    if (!currentLine) return;
    
    const inputCode = currentLine;
    
    // 添加到历史记录
    setHistory(prev => [...prev, inputCode]);
    setHistoryIndex(-1);
    
    // 添加输入到控制台历史
    setConsoleEntries(prev => [
      ...prev,
      { type: 'input', content: inputCode, timestamp: new Date() }
    ]);

    // 创建安全的执行环境
    try {
      // 捕获控制台输出
      const outputs: string[] = [];
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;
      const originalInfo = console.info;

      console.log = (...args: any[]) => {
        outputs.push(args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '));
      };

      console.error = (...args: any[]) => {
        outputs.push(args.map(arg => String(arg)).join(' '));
      };

      console.warn = (...args: any[]) => {
        outputs.push(args.map(arg => String(arg)).join(' '));
      };

      console.info = (...args: any[]) => {
        outputs.push(args.map(arg => String(arg)).join(' '));
      };

      // 使用 Function 构造器创建沙箱环境，保持上下文
      const contextKeys = Object.keys(context);
      const contextValues = Object.values(context);
      
      const func = new Function(...contextKeys, `
        "use strict";
        try {
          return eval(${JSON.stringify(inputCode)});
        } catch (e) {
          throw e;
        }
      `);

      const result = func(...contextValues);

      // 恢复原始控制台
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;

      // 添加控制台输出
      outputs.forEach(output => {
        setConsoleEntries(prev => [
          ...prev,
          { type: 'output', content: output, timestamp: new Date() }
        ]);
      });

      // 添加返回值（如果不是 undefined）
      if (result !== undefined) {
        setConsoleEntries(prev => [
          ...prev,
          { 
            type: 'output', 
            content: formatValue(result),
            timestamp: new Date(),
            isError: false
          }
        ]);
      }

      // 更新上下文（捕获新定义的变量）
      const newContext = { ...context };
      
      // 尝试从代码中提取变量定义
      const varMatches = inputCode.match(/(?:const|let|var)\s+(\w+)\s*=/g);
      if (varMatches) {
        varMatches.forEach(match => {
          const varName = match.match(/(?:const|let|var)\s+(\w+)/)?.[1];
          if (varName) {
            try {
              const varFunc = new Function(...contextKeys, `
                "use strict";
                ${inputCode}
                return ${varName};
              `);
              newContext[varName] = varFunc(...contextValues);
            } catch (e) {
              // 忽略错误
            }
          }
        });
      }

      setContext(newContext);
      setVariables(parseVariables(newContext));
      
      // 自动选中最后一个变量（通常是执行结果）
      const newVars = parseVariables(newContext);
      if (newVars.length > 0) {
        setSelectedVar(newVars[newVars.length - 1]);
        setActiveTab('inspector');
      }
      
      // 不清空代码，而是添加新行，保持 Monaco 的上下文用于类型推断
      setCode(code + '\n');

    } catch (error: any) {
      console.log = () => {};
      console.error = () => {};
      console.warn = () => {};
      console.info = () => {};

      // 添加错误到控制台
      setConsoleEntries(prev => [
        ...prev,
        {
          type: 'output',
          content: error.message || String(error),
          timestamp: new Date(),
          isError: true
        }
      ]);
    }
  }, [code, context, parseVariables, formatValue]);

  // 更新 ref 以始终指向最新的 executeCode
  useEffect(() => {
    executeCodeRef.current = executeCode;
  }, [executeCode]);

  // 键盘快捷键
  const handleEditorKeyDown = (e: any) => {
    // Ctrl/Cmd + Enter 执行
    if ((e.ctrlKey || e.metaKey) && e.keyCode === 13) {
      e.preventDefault();
      executeCode();
    }
    // 上箭头 - 历史上一条
    else if (e.keyCode === 38 && history.length > 0) {
      const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setCode(history[newIndex]);
    }
    // 下箭头 - 历史下一条
    else if (e.keyCode === 40 && history.length > 0) {
      const newIndex = historyIndex === -1 ? -1 : Math.min(history.length - 1, historyIndex + 1);
      if (newIndex === -1) {
        setHistoryIndex(-1);
        setCode('');
      } else {
        setHistoryIndex(newIndex);
        setCode(history[newIndex]);
      }
    }
  };

  // 切换变量展开状态
  const toggleVariable = (path: string[]) => {
    setVariables(prev => {
      const newVars = [...prev];
      let current: any = newVars;
      
      for (let i = 0; i < path.length - 1; i++) {
        const item = current.find((v: VariableInfo) => v.name === path[i]);
        if (item && item.children) {
          current = item.children;
        } else {
          return prev;
        }
      }

      const target = current.find((v: VariableInfo) => v.name === path[path.length - 1]);
      if (target) {
        target.expanded = !target.expanded;
      }

      return newVars;
    });
  };

  // 渲染变量树
  const renderVariableTree = (vars: VariableInfo[], path: string[] = [], level: number = 0) => {
    return vars.map((variable, index) => {
      // 使用特殊对象处理器或默认处理
      const handler = findSpecialHandler(variable.value);
      let variableValue: string;
      
      if (handler) {
        variableValue = handler.formatCopy(variable.value);
      } else if (typeof variable.value === 'object' && variable.value !== null) {
        variableValue = JSON.stringify(variable.value, null, 2);
      } else {
        variableValue = String(variable.value);
      }
      
      return (
        <div key={`${path.join('.')}-${index}`} style={{ marginLeft: level * 16 }}>
          <div
            className="group flex items-center gap-1 py-0.5 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded"
            onClick={(e) => {
              // 如果点击的是拷贝按钮，不触发选择
              if ((e.target as HTMLElement).closest('button')) return;
              
              // 如果是顶层变量，选中它进行检查
              if (level === 0) {
                setSelectedVar(variable);
                setActiveTab('inspector');
              } else {
                // 否则展开/折叠
                toggleVariable([...path, variable.name]);
              }
            }}
          >
            {variable.children && variable.children.length > 0 && (
              <span className="text-xs text-gray-400 w-4">
                {variable.expanded ? '▼' : '▶'}
              </span>
            )}
            {!variable.children && <span className="w-4" />}
            
            <span className="text-purple-600 dark:text-purple-400 font-mono text-sm flex-1">
              {variable.name}
            </span>
            
            <span className="text-gray-400 text-xs">:</span>
            
            <span className={`font-mono text-sm flex-1 min-w-0 truncate ${
              variable.type === 'string' ? 'text-green-600 dark:text-green-400' :
              variable.type === 'number' ? 'text-blue-600 dark:text-blue-400' :
              variable.type === 'boolean' ? 'text-orange-600 dark:text-orange-400' :
              variable.type === 'function' ? 'text-yellow-600 dark:text-yellow-400' :
              variable.type === 'date' ? 'text-cyan-600 dark:text-cyan-400' :
              variable.type === 'regexp' ? 'text-pink-600 dark:text-pink-400' :
              variable.type === 'error' ? 'text-red-600 dark:text-red-400' :
              variable.type === 'url' ? 'text-indigo-600 dark:text-indigo-400' :
              variable.type === 'map' ? 'text-violet-600 dark:text-violet-400' :
              variable.type === 'set' ? 'text-fuchsia-600 dark:text-fuchsia-400' :
              'text-gray-600 dark:text-gray-400'
            }`}>
              {formatValue(variable.value)}
            </span>
            
            {/* 拷贝按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(variableValue, `Variable ${variable.name}`);
              }}
              className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 text-xs bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 rounded transition-all flex-shrink-0"
              title="Copy value to clipboard"
            >
              📋
            </button>
          </div>

          {variable.expanded && variable.children && (
            <div>
              {renderVariableTree(variable.children, [...path, variable.name], level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  // 清空控制台
  const clearConsole = () => {
    setConsoleEntries([]);
  };

  // 清空所有变量
  const clearVariables = () => {
    setContext({});
    setVariables([]);
    setSelectedVar(null);
  };

  // 格式化代码
  const formatCode = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run();
    }
  };

  // 拷贝到剪贴板
  const copyToClipboard = async (text: string, label: string = 'Content') => {
    try {
      await navigator.clipboard.writeText(text);
      // 可以显示一个临时提示
      console.log(`${label} copied to clipboard`);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* 头部工具栏 */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <h1 className="text-base font-semibold">JS Interactive Console</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={formatCode}
            className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
            title="Format Code (Shift+Alt+F)"
          >
            Format Code
          </button>
          <button
            onClick={clearConsole}
            className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
          >
            Clear Console
          </button>
          <button
            onClick={clearVariables}
            className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
          >
            Clear Variables
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：代码编辑器和输出 */}
        <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700">
          {/* 代码编辑器 - 浏览器控制台风格 */}
          <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
            <div className="bg-gray-50 dark:bg-gray-900 px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-green-600 dark:text-green-400">{`>`}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {isMultiLine ? 'Multi-line mode (Shift+Enter to execute)' : 'Single-line mode (Enter to execute)'}
                </span>
              </div>
              <button
                onClick={() => setIsMultiLine(!isMultiLine)}
                className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
                title="Toggle multi-line mode"
              >
                {isMultiLine ? '📄 Single' : '📝 Multi'}
              </button>
            </div>
            <Editor
              height={isMultiLine ? "200px" : "60px"}
              language="javascript"
              theme={isDarkMode ? 'vs-dark' : 'vs-light'}
              value={code}
              onChange={(value) => setCode(value || '')}
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                
                // 浏览器控制台风格：Enter 执行，Shift+Enter 换行
                editor.addCommand(monaco.KeyCode.Enter, () => {
                  if (isMultiLine) {
                    // 多行模式：需要 Shift+Enter 才执行
                    return; // Monaco 默认行为：插入换行
                  } else {
                    // 单行模式：Enter 直接执行
                    executeCodeRef.current();
                  }
                });
                
                // Shift+Enter 在多行模式下执行
                editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
                  if (isMultiLine) {
                    executeCodeRef.current();
                  } else {
                    // 单行模式下 Shift+Enter 也执行
                    executeCodeRef.current();
                  }
                });
                
                // Ctrl+Enter 始终执行（兼容）
                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                  executeCodeRef.current();
                });
                
                // 配置箭头键历史记录
                editor.addCommand(monaco.KeyCode.UpArrow, () => {
                  if (history.length > 0) {
                    const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
                    setHistoryIndex(newIndex);
                    setCode(history[newIndex]);
                  }
                });
                
                editor.addCommand(monaco.KeyCode.DownArrow, () => {
                  if (history.length > 0) {
                    const newIndex = historyIndex === -1 ? -1 : Math.min(history.length - 1, historyIndex + 1);
                    if (newIndex === -1) {
                      setHistoryIndex(-1);
                      setCode('');
                    } else {
                      setHistoryIndex(newIndex);
                      setCode(history[newIndex]);
                    }
                  }
                });
              }}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
                lineNumbers: isMultiLine ? 'on' : 'off',  // 单行模式隐藏行号
                roundedSelection: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                formatOnPaste: true,
                formatOnType: true,
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                parameterHints: { enabled: true },
                hover: { enabled: true },
                // 控制台风格优化
                renderLineHighlight: 'all',
                cursorBlinking: 'smooth',
                smoothScrolling: true,
                padding: { top: 8, bottom: 8 },
                scrollbar: {
                  vertical: isMultiLine ? 'auto' : 'hidden',
                  horizontal: 'hidden',
                },
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
              }}
            />
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <button
                onClick={executeCode}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors flex items-center gap-2 text-sm"
              >
                <span>▶</span>
                Run Code
              </button>
              <div className="text-xs text-gray-400">
                Ctrl+Enter to run • Tab to indent
              </div>
            </div>
          </div>

          {/* 输出区域 - 浏览器控制台风格 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-shrink-0 px-3 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Console</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const allOutput = consoleEntries.map(entry => 
                      entry.type === 'input' ? `> ${entry.content}` : entry.content
                    ).join('\n');
                    copyToClipboard(allOutput, 'All console output');
                  }}
                  className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
                  title="Copy all output"
                >
                  Copy All
                </button>
                <span className="text-xs text-gray-400">{consoleEntries.length} entries</span>
              </div>
            </div>
            <div
              ref={outputRef}
              className="flex-1 overflow-y-auto p-3 font-mono text-sm space-y-1"
            >
              {consoleEntries.length === 0 ? (
                <div className="text-gray-400 text-center py-8">
                  <p className="text-2xl mb-2">💻</p>
                  <p className="text-xs">Start typing and press Enter to execute</p>
                </div>
              ) : (
                consoleEntries.map((entry, index) => (
                  <div
                    key={index}
                    className={`py-1 px-2 rounded ${
                      entry.type === 'input' ? 'border-l-2 border-green-500 pl-3' :
                      entry.isError ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' :
                      'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {entry.type === 'input' ? (
                      <span className="text-green-600 dark:text-green-400 font-semibold">
                        {`> ${entry.content}`}
                      </span>
                    ) : (
                      <span className="break-all">{entry.content}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 右侧：变量预览和对象检查器 */}
        <div className="w-80 flex flex-col bg-gray-50 dark:bg-gray-800">
          {/* 标签页 */}
          <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              <button
                onClick={() => setActiveTab('variables')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'variables'
                    ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Variables ({variables.length})
              </button>
              <button
                onClick={() => setActiveTab('inspector')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'inspector'
                    ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Inspector {selectedVar ? `(${selectedVar.name})` : ''}
              </button>
            </div>
          </div>

          {/* 变量列表 */}
          {activeTab === 'variables' && (
            <>
              <div className="flex-shrink-0 px-3 py-2 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
                <span className="text-xs text-gray-400">Click to inspect</span>
                <button
                  onClick={() => {
                    const allVars = variables.map(v => `${v.name} = ${formatValue(v.value)}`).join('\n');
                    copyToClipboard(allVars, 'All variables');
                  }}
                  className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
                  title="Copy all variables"
                >
                  Copy All
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                {variables.length === 0 ? (
                  <div className="text-gray-400 text-center py-8">
                    <p className="text-2xl mb-2">📦</p>
                    <p className="text-xs">No variables yet</p>
                    <p className="text-xs mt-1">Execute code to see variables</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {renderVariableTree(variables)}
                  </div>
                )}
              </div>
            </>
          )}

          {/* 对象检查器 */}
          {activeTab === 'inspector' && (
            <div className="flex-1 overflow-y-auto">
              {!selectedVar ? (
                <div className="text-gray-400 text-center py-8">
                  <p className="text-2xl mb-2">🔍</p>
                  <p className="text-xs">Select a variable to inspect</p>
                </div>
              ) : (
                <div className="p-3 space-y-3">
                  {/* 基本信息 */}
                  <div className="bg-white dark:bg-gray-900 rounded p-3 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Name</div>
                    <div className="font-mono text-sm text-purple-600 dark:text-purple-400">{selectedVar.name}</div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded p-3 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Type</div>
                    <div className={`font-mono text-sm ${
                      selectedVar.type === 'string' ? 'text-green-600 dark:text-green-400' :
                      selectedVar.type === 'number' ? 'text-blue-600 dark:text-blue-400' :
                      selectedVar.type === 'boolean' ? 'text-orange-600 dark:text-orange-400' :
                      selectedVar.type === 'function' ? 'text-yellow-600 dark:text-yellow-400' :
                      selectedVar.type === 'date' ? 'text-cyan-600 dark:text-cyan-400' :
                      selectedVar.type === 'regexp' ? 'text-pink-600 dark:text-pink-400' :
                      selectedVar.type === 'error' ? 'text-red-600 dark:text-red-400' :
                      selectedVar.type === 'url' ? 'text-indigo-600 dark:text-indigo-400' :
                      selectedVar.type === 'map' ? 'text-violet-600 dark:text-violet-400' :
                      selectedVar.type === 'set' ? 'text-fuchsia-600 dark:text-fuchsia-400' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {selectedVar.type}
                    </div>
                  </div>

                  {selectedVar.prototype && (
                    <div className="bg-white dark:bg-gray-900 rounded p-3 border border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Prototype</div>
                      <div className="font-mono text-sm text-gray-700 dark:text-gray-300">{selectedVar.prototype}</div>
                    </div>
                  )}

                  {/* 值预览 */}
                  <div className="bg-white dark:bg-gray-900 rounded p-3 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Value</div>
                    <div className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {formatValue(selectedVar.value)}
                    </div>
                  </div>

                  {/* 属性列表 */}
                  {selectedVar.properties && selectedVar.properties.length > 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded p-3 border border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center justify-between">
                        <span>Properties ({selectedVar.properties.length})</span>
                        <button
                          onClick={() => copyToClipboard(selectedVar.properties!.join('\n'), 'Properties')}
                          className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"
                          title="Copy properties"
                        >
                          📋
                        </button>
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {selectedVar.properties.map((prop, idx) => (
                          <div key={idx} className="text-xs font-mono text-green-600 dark:text-green-400 py-0.5 px-2 bg-green-50 dark:bg-green-900/20 rounded">
                            {prop}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 方法列表 */}
                  {selectedVar.methods && selectedVar.methods.length > 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded p-3 border border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center justify-between">
                        <span>Methods ({selectedVar.methods.length})</span>
                        <button
                          onClick={() => copyToClipboard(selectedVar.methods!.join('\n'), 'Methods')}
                          className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"
                          title="Copy methods"
                        >
                          📋
                        </button>
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {selectedVar.methods.map((method, idx) => (
                          <div key={idx} className="text-xs font-mono text-blue-600 dark:text-blue-400 py-0.5 px-2 bg-blue-50 dark:bg-blue-900/20 rounded cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40" 
                               onClick={() => {
                                 setCode(`${selectedVar.name}.${method}()`);
                                 editorRef.current?.focus();
                               }}
                               title="Click to use this method"
                          >
                            {method}()
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 底部状态栏 */}
      <div className="flex-shrink-0 px-3 py-1 bg-blue-600 text-white text-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span>Ready</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] ${isMultiLine ? 'bg-yellow-500/30' : 'bg-green-500/30'}`}>
            {isMultiLine ? 'Multi-line' : 'Single-line'}
          </span>
          {history.length > 0 && (
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
              {history.length} commands
            </span>
          )}
        </div>
        <div className="text-[10px] opacity-80">
          {isMultiLine 
            ? 'Enter: New line • Shift+Enter/Ctrl+Enter: Execute • ↑↓ History'
            : 'Enter: Execute • Shift+Enter: New line • ↑↓ History'
          }
        </div>
      </div>
    </div>
  );
};

export default App;
