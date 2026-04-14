import React, { useState, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';

interface JsonExplorerProps {
  query?: string;
  onResult?: (result: any) => void;
}

const JsonExplorer: React.FC<JsonExplorerProps> = ({ query: _query, onResult: _onResult }) => {
  const [jsonInput, setJsonInput] = useState<string>('');
  const [parsedJson, setParsedJson] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<string>('');
  const [accessPath, setAccessPath] = useState<string>('');
  const [pathResult, setPathResult] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  // 解析 JSON
  const parseJson = useCallback((input: string) => {
    if (!input.trim()) {
      setParsedJson(null);
      setError('');
      setPathResult('');
      return;
    }

    try {
      const parsed = JSON.parse(input);
      setParsedJson(parsed);
      setError('');
      setPathResult('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
      setParsedJson(null);
    }
  }, []);

  // 处理编辑器变化
  const handleEditorChange = (value: string | undefined) => {
    if (value === undefined) return;
    setJsonInput(value);
    parseJson(value);
  };

  // 格式化 JSON
  const formatJson = () => {
    if (!parsedJson) return;
    const formatted = JSON.stringify(parsedJson, null, 2);
    setJsonInput(formatted);
  };

  // 压缩 JSON
  const minifyJson = () => {
    if (!parsedJson) return;
    const minified = JSON.stringify(parsedJson);
    setJsonInput(minified);
  };

  // 拷贝到剪贴板
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // 转义字符串拷贝
  const copyEscapedString = () => {
    if (!jsonInput) return;
    const escaped = JSON.stringify(jsonInput);
    copyToClipboard(escaped, 'Escaped String Copied!');
  };

  // JS 路径访问
  const accessByPath = () => {
    if (!parsedJson || !accessPath) return;
    
    try {
      const pathParts = accessPath
        .replace(/\[(\w+)\]/g, '.$1')
        .split('.')
        .filter(Boolean);
      
      let result: any = parsedJson;
      for (const part of pathParts) {
        if (result === null || result === undefined) {
          throw new Error(`Cannot read property '${part}' of ${result}`);
        }
        result = result[part];
      }
      
      const resultStr = typeof result === 'object' 
        ? JSON.stringify(result, null, 2)
        : String(result);
      
      setPathResult(resultStr);
      // 只预览，不自动拷贝
    } catch (err) {
      setError(`Invalid path: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setPathResult('');
    }
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + Shift + F 格式化
      if (e.altKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        formatJson();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [parsedJson]);

  // 示例 JSON
  const loadExample = () => {
    const example = {
      name: "JSON Explorer",
      version: "1.0.0",
      features: ["Format", "Minify", "Copy", "Path Access"],
      config: {
        theme: "modern",
        autoFormat: true,
        maxDepth: 10
      },
      stats: {
        users: 1234,
        active: true,
        rating: 4.8
      }
    };
    const exampleStr = JSON.stringify(example, null, 2);
    setJsonInput(exampleStr);
    parseJson(exampleStr);
  };

  // 生成路径建议
  const getPathSuggestions = () => {
    if (!parsedJson || typeof parsedJson !== 'object') return [];
    
    const suggestions: string[] = [];
    const collectPaths = (obj: any, prefix: string = '') => {
      Object.keys(obj).forEach(key => {
        const path = prefix ? `${prefix}.${key}` : key;
        suggestions.push(path);
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          collectPaths(obj[key], path);
        }
      });
    };
    collectPaths(parsedJson);
    return suggestions.slice(0, 10);
  };

  // 根据输入前缀生成智能提示
  const getSmartSuggestions = (): string[] => {
    if (!parsedJson || !accessPath) return [];
    
    try {
      // 解析当前路径
      const pathParts = accessPath
        .replace(/\[(\w+)\]/g, '.$1')
        .split('.')
        .filter(Boolean);
      
      // 导航到当前路径的对象
      let currentObj: any = parsedJson;
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (currentObj === null || currentObj === undefined) return [];
        currentObj = currentObj[part];
      }
      
      // 如果当前对象不是对象类型，返回空
      if (typeof currentObj !== 'object' || currentObj === null) return [];
      
      // 获取下一级可用的键名
      const lastPart = pathParts[pathParts.length - 1];
      const keys = Object.keys(currentObj);
      
      // 过滤匹配的键名
      return keys
        .filter(key => key.startsWith(lastPart))
        .map(key => {
          const fullPath = pathParts.slice(0, -1).join('.');
          return fullPath ? `${fullPath}.${key}` : key;
        })
        .slice(0, 8); // 最多显示8个建议
    } catch (err) {
      return [];
    }
  };

  const suggestions = getPathSuggestions();
  const smartSuggestions = getSmartSuggestions();

  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div 
        className="bg-white/80 backdrop-blur-lg border-b border-gray-200 px-6 py-4 shadow-sm select-none"
        data-tauri-drag-region
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md flex items-center justify-center shadow-lg">
              <span className="text-white text-xl">📋</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                JSON Explorer
              </h1>
              <p className="text-xs text-gray-500">Powered by Monaco Editor (VS Code)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded">
              Alt+Shift+F
            </span>
            <button
              onClick={loadExample}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-md hover:shadow-lg transition-all duration-200 text-sm font-medium"
            >
              Load Example ✨
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={formatJson}
            disabled={!parsedJson}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            title="Alt+Shift+F"
          >
            Format 🎨
          </button>
          <button
            onClick={minifyJson}
            disabled={!parsedJson}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            Minify 📦
          </button>
          <button
            onClick={() => copyToClipboard(jsonInput, 'JSON Copied!')}
            disabled={!jsonInput}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            Copy 📋
          </button>
          <button
            onClick={copyEscapedString}
            disabled={!jsonInput}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            Copy Escaped 🔐
          </button>
        </div>
      </div>

      {/* Main Content - Left: Monaco Editor, Right: Path Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Monaco Editor */}
        <div className="flex-1 flex flex-col border-r border-gray-200 bg-white">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">JSON Editor (VS Code)</span>
            <div className="flex items-center gap-2">
              {parsedJson && (
                <span className="text-xs text-green-600 font-medium">✓ Valid</span>
              )}
              <span className="text-xs text-gray-400">Line: {jsonInput.split('\n').length}</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="json"
              value={jsonInput}
              onChange={handleEditorChange}
              theme="vs-light"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                wordWrap: 'on',
                folding: true,
                foldingStrategy: 'indentation',
                showFoldingControls: 'always',
                matchBrackets: 'always',
                autoIndent: 'full',
                formatOnPaste: true,
                formatOnType: true,
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                scrollbar: {
                  vertical: 'auto',
                  horizontal: 'auto',
                  useShadows: false,
                  verticalScrollbarSize: 10,
                  horizontalScrollbarSize: 10,
                },
              }}
            />
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 border-t border-red-200">
              <p className="text-sm text-red-600 flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </p>
            </div>
          )}
        </div>

        {/* Right Panel - JS Path & Preview */}
        <div className="w-96 flex flex-col bg-white/50 backdrop-blur-sm">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-sm font-semibold text-gray-700">JS Path Explorer</span>
          </div>
          
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* Path Input with Smart Suggestions */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                JS Path
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={accessPath}
                  onChange={(e) => {
                    setAccessPath(e.target.value);
                    setShowSuggestions(true);
                    setSuggestionIndex(0);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="e.g., data.users[0].name"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // 如果有选中的建议，先应用
                      if (smartSuggestions.length > 0 && suggestionIndex >= 0) {
                        setAccessPath(smartSuggestions[suggestionIndex]);
                        setShowSuggestions(false);
                      }
                      accessByPath();
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSuggestionIndex(prev => 
                        prev < smartSuggestions.length - 1 ? prev + 1 : prev
                      );
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSuggestionIndex(prev => prev > 0 ? prev - 1 : 0);
                    } else if (e.key === 'Tab' && smartSuggestions.length > 0) {
                      e.preventDefault();
                      setAccessPath(smartSuggestions[suggestionIndex]);
                      setShowSuggestions(false);
                    }
                  }}
                />
                {/* Enter icon indicator */}
                {accessPath && parsedJson && (
                  <div 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    title="Press Enter to execute"
                  >
                    <svg 
                      className="w-4 h-4" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M9 5l7 7-7 7" 
                      />
                    </svg>
                  </div>
                )}
                
                {/* Smart Suggestions Dropdown */}
                {showSuggestions && smartSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto">
                    {smartSuggestions.map((suggestion, index) => (
                      <div
                        key={suggestion}
                        onClick={() => {
                          setAccessPath(suggestion);
                          setShowSuggestions(false);
                        }}
                        className={`px-3 py-2 cursor-pointer text-sm font-mono transition-colors ${
                          index === suggestionIndex 
                            ? 'bg-blue-50 text-blue-600' 
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-mono text-xs">Enter</kbd> to preview
              </p>
            </div>

            {/* Path Result Preview */}
            {pathResult && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Result
                  </label>
                  <button
                    onClick={() => copyToClipboard(pathResult, 'Copied!')}
                    className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors"
                  >
                    Copy 📋
                  </button>
                </div>
                <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                  <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap break-all max-h-64 overflow-auto">
                    {pathResult}
                  </pre>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!pathResult && parsedJson && (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">🎯</div>
                <p className="text-sm">Enter a path to explore</p>
                <p className="text-xs mt-1">or click a suggestion above</p>
              </div>
            )}

            {/* Copy Success Message */}
            {copySuccess && (
              <div className="px-3 py-2 bg-green-100 text-green-700 rounded-md text-sm font-medium animate-pulse">
                ✓ {copySuccess}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JsonExplorer;
