import React, { useState, useEffect, useCallback, useRef } from 'react';

// ==================== 类型定义 ====================

interface SearchResult {
  name: string;
  filename: string;
  path: string;
  size: number;
  date_modified: string;
  extension: string;
  is_folder: boolean;
  file_type: string;
}

interface FilePreview {
  content: string;
  encoding: string;
  size: number;
  lines: number;
  truncated: boolean;
  mime_type: string;
}

interface FileInfo {
  name: string;
  path: string;
  size: number;
  size_formatted: string;
  created: string;
  modified: string;
  accessed: string;
  is_file: boolean;
  is_dir: boolean;
  extension: string;
  mime_type: string;
}

type FileFilterType = 'all' | 'folder' | 'excel' | 'word' | 'ppt' | 'pdf' | 'image' | 'video' | 'audio' | 'archive';
type SortByType = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc';

interface AppProps {
  query?: string;
  onResult?: (result: any) => void;
}

// ==================== 工具函数 ====================

/**
 * 高亮文本中的关键词
 */
const highlightText = (text: string, keyword: string): React.ReactNode => {
  if (!keyword || !text) return text;
  
  const parts = text.split(new RegExp(`(${escapeRegex(keyword)})`, 'gi'));
  return parts.map((part, i) => 
    part.toLowerCase() === keyword.toLowerCase() ? (
      <mark key={i} className="bg-yellow-300 text-gray-900 px-0.5 rounded">{part}</mark>
    ) : (
      part
    )
  );
};

/**
 * 转义正则表达式特殊字符
 */
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * 格式化文件大小
 */
const formatSize = (bytes: number): string => {
  if (bytes === 0) return '-';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 格式化日期（ISO-8601 到本地时间）
 */
const formatDate = (isoString: string): string => {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN');
  } catch {
    return isoString;
  }
};

/**
 * 获取文件类型图标
 */
const getFileIcon = (fileType: string, isFolder: boolean): string => {
  if (isFolder) return '📁';
  
  const iconMap: Record<string, string> = {
    excel: '📊',
    word: '📝',
    ppt: '📊',
    pdf: '📕',
    image: '🖼️',
    video: '🎥',
    audio: '🎵',
    archive: '📦',
  };
  
  return iconMap[fileType] || '📄';
};

// ==================== 主组件 ====================

const App: React.FC<AppProps> = ({ query, onResult }) => {
  // 状态管理
  const [searchQuery, setSearchQuery] = useState(query || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // 筛选和排序
  const [activeFilter, setActiveFilter] = useState<FileFilterType>('all');
  const [sortBy, setSortBy] = useState<SortByType>('date-desc');
  const [showPreview, setShowPreview] = useState(true);
  
  // 预览相关
  const [previewContent, setPreviewContent] = useState<FilePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // 防抖定时器
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const selectedRowRef = useRef<HTMLTableRowElement>(null);

  // ==================== 搜索逻辑 ====================

  /**
   * 执行搜索（静默更新，无 loading）
   */
  const executeSearch = useCallback(async (keyword: string, filter: FileFilterType, sort: SortByType) => {
    if (!keyword.trim()) {
      setResults([]);
      setPreviewContent(null);
      return;
    }

    // 不设置 loading，直接重置选中索引
    setSelectedIndex(0);

    try {
      // 映射排序类型
      const sortMap: Record<SortByType, string> = {
        'date-desc': 'DateDesc',
        'date-asc': 'DateAsc',
        'name-asc': 'NameAsc',
        'name-desc': 'NameDesc',
        'size-desc': 'SizeDesc',
        'size-asc': 'SizeAsc',
      };

      // 映射过滤类型
      const filterMap: Record<FileFilterType, string> = {
        all: 'All',
        folder: 'Folder',
        excel: 'Excel',
        word: 'Word',
        ppt: 'PPT',
        pdf: 'PDF',
        image: 'Image',
        video: 'Video',
        audio: 'Audio',
        archive: 'Archive',
      };

      // 使用 ACTIONS API 调用后端扩展命令
      const actions = (window as any).ACTIONS;
      if (!actions?.everything?.searchExtended) {
        throw new Error('ACTIONS.everything.searchExtended 不可用');
      }

      const searchResults = await actions.everything.searchExtended(
        keyword,
        filterMap[filter],
        sortMap[sort],
        100
      );

      console.log('[Everything Plugin] Search results received:', searchResults);
      console.log('[Everything Plugin] Results count:', searchResults?.length);
      if (searchResults && searchResults.length > 0) {
        console.log('[Everything Plugin] First result:', searchResults[0]);
      }

      // 直接更新结果，无论是否为空
      setResults(searchResults);
    } catch (err) {
      console.error('Search error:', err);
      // 不显示错误，只清空结果
      setResults([]);
    }
  }, []);

  /**
   * 防抖搜索（优化版：减少延迟）
   */
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // 如果查询为空，立即清空结果
    if (!searchQuery.trim()) {
      setResults([]);
      setPreviewContent(null);
      return;
    }

    // 缩短防抖时间到 150ms，提升响应速度
    searchTimeoutRef.current = setTimeout(() => {
      executeSearch(searchQuery, activeFilter, sortBy);
    }, 150); // 从 300ms 优化到 150ms

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, activeFilter, sortBy, executeSearch]);

  // 监听外部 query 变化
  useEffect(() => {
    if (query !== undefined && query !== searchQuery) {
      setSearchQuery(query);
    }
  }, [query]);

  // ==================== 预览逻辑 ====================

  /**
   * 加载文件预览
   */
  const loadPreview = useCallback(async (file: SearchResult) => {
    if (file.is_folder || !showPreview) {
      setPreviewContent(null);
      return;
    }

    // 只预览文本文件
    const textExtensions = ['txt', 'md', 'json', 'xml', 'yaml', 'yml', 'js', 'ts', 'py', 'rs', 'go', 
                           'html', 'css', 'csv', 'log', 'cfg', 'ini', 'conf'];
    
    if (!textExtensions.includes(file.extension.toLowerCase())) {
      setPreviewContent(null);
      return;
    }

    setPreviewLoading(true);
    
    try {
      const actions = (window as any).ACTIONS;
      if (!actions?.everything?.previewFile) {
        throw new Error('ACTIONS.everything.previewFile 不可用');
      }

      const preview = await actions.everything.previewFile(
        file.filename,
        100_000 // 最大 100KB
      );
      
      setPreviewContent(preview as FilePreview);
    } catch (err) {
      console.error('Preview error:', err);
      setPreviewContent(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [showPreview]);

  /**
   * 选择文件
   */
  const selectFile = useCallback(async (index: number) => {
    if (index >= 0 && index < results.length) {
      setSelectedIndex(index);
      await loadPreview(results[index]);
      
      // 滚动到选中项
      if (selectedRowRef.current) {
        selectedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [results, loadPreview]);

  // ==================== 键盘导航 ====================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+P 切换预览
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setShowPreview(prev => !prev);
        return;
      }

      // 只在有结果时处理导航键
      if (results.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (selectedIndex < results.length - 1) {
          selectFile(selectedIndex + 1);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectedIndex > 0) {
          selectFile(selectedIndex - 1);
        }
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        const selected = results[selectedIndex];
        const fullPath = selected.filename;
        
        // 使用 ACTIONS API 打开文件或文件夹
        const actions = (window as any).ACTIONS;
        if (actions?.everything?.open) {
          actions.everything.open(fullPath);
        } else {
          console.error('ACTIONS.everything.open 不可用');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedIndex, selectFile]);

  // ==================== 筛选按钮配置 ====================

  const filterButtons: Array<{ type: FileFilterType; label: string; icon: string }> = [
    { type: 'all', label: '全部', icon: '📋' },
    { type: 'folder', label: '文件夹', icon: '📁' },
    { type: 'excel', label: 'EXCEL', icon: '📊' },
    { type: 'word', label: 'WORD', icon: '📝' },
    { type: 'ppt', label: 'PPT', icon: '📊' },
    { type: 'pdf', label: 'PDF', icon: '📕' },
    { type: 'image', label: '图片', icon: '🖼️' },
    { type: 'video', label: '视频', icon: '🎥' },
    { type: 'audio', label: '音频', icon: '🎵' },
    { type: 'archive', label: '压缩文件', icon: '📦' },
  ];

  // ==================== 排序选项 ====================

  const sortOptions: Array<{ value: SortByType; label: string }> = [
    { value: 'date-desc', label: '修改时间 ↓' },
    { value: 'date-asc', label: '修改时间 ↑' },
    { value: 'name-asc', label: '名称 A-Z' },
    { value: 'name-desc', label: '名称 Z-A' },
    { value: 'size-desc', label: '大小 ↓' },
    { value: 'size-asc', label: '大小 ↑' },
  ];

  // ==================== 渲染 ====================

  return (
    <div className="h-full flex bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-white overflow-hidden">
      {/* 左侧筛选面板 - 固定宽度 */}
      <div className="w-36 bg-gray-50 dark:bg-[#252526] border-r border-gray-200 dark:border-[#3e3e42] flex flex-col flex-shrink-0">
        <div className="p-2 border-b border-gray-200 dark:border-[#3e3e42]">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">文件类型</div>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {filterButtons.map(btn => (
            <button
              key={btn.type}
              onClick={() => setActiveFilter(btn.type)}
              className={`w-full text-left px-2 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                activeFilter === btn.type
                  ? 'bg-blue-600 dark:bg-[#094771] text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2d2e]'
              }`}
            >
              <span className="text-sm">{btn.icon}</span>
              <span className="truncate">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 中间主区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部搜索栏 */}
        <div className="pl-36 pr-3 py-2 border-b border-gray-200 dark:border-[#3e3e42] bg-gray-50 dark:bg-[#252526] flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入关键词搜索文件..."
              className="flex-1 px-2 py-1.5 bg-white dark:bg-[#3c3c3c] border border-gray-300 dark:border-[#3e3e42] rounded text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              autoFocus
            />
            {/* 快速操作按钮 */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`px-2 py-1.5 rounded text-xs transition-colors flex-shrink-0 ${
                showPreview ? 'bg-blue-600 dark:bg-[#094771] text-white' : 'bg-gray-200 dark:bg-[#3c3c3c] text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-[#4a4a4a]'
              }`}
              title="切换预览面板 (Ctrl+P)"
            >
              👁️ 预览
            </button>
          </div>
        </div>

        {/* 结果列表 - 唯一可滚动区域 */}
        <div className="flex-1 overflow-y-auto" ref={resultsRef}>
          {/* 空结果提示 */}
          {results.length === 0 && searchQuery && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-base mb-1">搜索结果为空</p>
              <p className="text-xs text-gray-500">请尝试其他关键词或筛选条件</p>
            </div>
          )}

          {/* 初始状态 */}
          {!searchQuery && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <div className="text-5xl mb-3 opacity-50">⌨️</div>
              <p className="text-sm mb-2">开始输入以搜索文件</p>
              <div className="text-xs space-y-1 text-gray-600">
                <p>↑↓ 导航 • Enter 打开 • Ctrl+P 预览</p>
              </div>
            </div>
          )}

          {/* 结果列表 - 无表头 */}
          {results.length > 0 && (
            <div className="py-1">
              {results.map((item, index) => (
                <div
                  key={item.filename}
                  ref={index === selectedIndex ? selectedRowRef : null}
                  className={`px-3 py-2 cursor-pointer border-l-2 transition-all ${
                    index === selectedIndex
                      ? 'bg-blue-50 dark:bg-[#094771] border-l-blue-600 dark:border-l-[#007acc]'
                      : 'border-l-transparent hover:bg-gray-50 dark:hover:bg-[#2a2d2e]'
                  }`}
                  onClick={() => selectFile(index)}
                  onDoubleClick={() => {
                    const actions = (window as any).ACTIONS;
                    if (actions?.everything?.open) {
                      actions.everything.open(item.filename);
                    }
                  }}
                >
                  {/* 文件名 */}
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-base flex-shrink-0">{getFileIcon(item.file_type, item.is_folder)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 dark:text-white truncate font-medium">
                        {highlightText(item.name, searchQuery)}
                      </div>
                    </div>
                  </div>
                  {/* 路径 */}
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate ml-6">
                    {item.path}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部状态栏 - 固定 */}
        <div className="bg-blue-600 dark:bg-[#007acc] text-white px-3 py-1 text-xs flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span>{results.length} 个结果</span>
            {activeFilter !== 'all' && (
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
                {filterButtons.find(f => f.type === activeFilter)?.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* 排序选择 */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortByType)}
              className="bg-transparent border-none text-white text-xs cursor-pointer focus:outline-none"
              title="排序方式"
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#252526] text-gray-900 dark:text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 右侧预览面板 - 可选 */}
      {showPreview && previewContent && (
        <div className="w-80 bg-white dark:bg-[#1e1e1e] border-l border-gray-200 dark:border-[#3e3e42] flex flex-col flex-shrink-0">
          {/* 预览头部 */}
          <div className="px-3 py-2 border-b border-gray-200 dark:border-[#3e3e42] bg-gray-50 dark:bg-[#252526]">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-400">文件预览</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500">
                {previewContent.encoding} • {previewContent.lines} 行
                {previewContent.truncated && ' • 已截断'}
              </div>
            </div>
          </div>

          {/* 预览内容 */}
          <div className="flex-1 overflow-auto p-3">
            {previewLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <pre className="text-xs text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap break-words leading-relaxed">
                {previewContent.content}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
