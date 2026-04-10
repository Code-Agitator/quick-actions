import { useState, useEffect, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SearchBar, SearchBarRef } from "./components/SearchBar";
import { SearchResultList } from "./components/SearchResultList";
import { DebugPanel } from "./components/DebugPanel";
import { Settings } from "./components/Settings";
import { usePlugins } from "./hooks/usePlugins";
import { useApplications } from "./hooks/useApplications";
import { SearchResult } from "./types/searchResult";
import { searchCache } from "./utils/searchCache";
import { useDebug } from "./context/DebugContext";
import { initDebug, debugTimer } from "./utils/debugLogger";

function App() {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [indexReady, setIndexReady] = useState(false); // 标记索引是否就绪
  const [showSettings, setShowSettings] = useState(false); // 显示设置页面
  const searchBarRef = useRef<SearchBarRef>(null);
  const { plugins } = usePlugins();
  const { applications } = useApplications();
  const { settings: debugSettings } = useDebug();

  // 同步 debug 设置到 debugLogger
  useEffect(() => {
    initDebug(debugSettings);
  }, [debugSettings]);

  useEffect(() => {
    // Escape 键已在键盘导航中处理
  }, []);

  // 监听窗口焦点事件，自动聚焦搜索框
  useEffect(() => {
    // 禁用右键菜单 - 在最早期阻止
    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };

    const focusInput = () => {
      // 多重保障：立即聚焦 + 延迟重试
      searchBarRef.current?.focus();
      
      setTimeout(() => {
        searchBarRef.current?.focus();
      }, 50);
      
      setTimeout(() => {
        searchBarRef.current?.focus();
      }, 150);
    };

    const handleFocus = () => {
      focusInput();
    };

    const handleBlur = () => {
      // Window lost focus
    };

    // 使用 capture 阶段确保最早拦截
    document.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    // 初始加载时立即聚焦
    focusInput();

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // 当插件或应用加载完成时，重建索引
  useEffect(() => {
    // 只要有数据就重建索引（即使只有一个有数据）
    if (plugins.length > 0 || applications.length > 0) {
      searchCache.rebuildIndex(plugins, applications);
      
      // 标记索引已就绪，触发重新渲染
      setIndexReady(true);
    }
  }, [plugins, applications]);

  // 监听插件变化事件（卸载/安装后自动刷新索引）
  useEffect(() => {
    const handlePluginsChanged = () => {
      searchCache.rebuildIndex(plugins, applications);
      setQuery(''); // 清空搜索框以显示最新列表
      setSelectedIndex(0);
    };

    window.addEventListener('plugins-changed', handlePluginsChanged);
    return () => {
      window.removeEventListener('plugins-changed', handlePluginsChanged);
    };
  }, [plugins, applications]);

  // 使用缓存搜索（极速）
  const searchResults = useMemo(() => {
    // 如果索引未就绪，返回空数组
    if (!indexReady && plugins.length === 0 && applications.length === 0) {
      return [];
    }
    
    const endTimer = debugTimer('searchTiming', `搜索 "${query}"`);
    const result = searchCache.search(query);
    endTimer();
    
    return result;
  }, [query, plugins.length, applications.length, indexReady]);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只处理我们关心的键
      if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
        return;
      }
      
      switch (e.key) {
        case 'ArrowDown':
          setSelectedIndex(prev => 
            prev < searchResults.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        case 'Enter':
          if (searchResults[selectedIndex]) {
            // 直接在这里执行，避免循环依赖
            const result = searchResults[selectedIndex];
            
            if (result.type === 'plugin') {
              // 查找插件元数据以获取正确的入口文件
              const plugin = plugins.find(p => p.id === result.pluginId);
              const entryFile = plugin?.entry || 'index.js';
              
              // 使用动态窗口创建
              (async () => {
                await invoke('open_plugin_window', {
                  pluginId: result.pluginId,
                  pluginName: result.title,
                  entry: entryFile,
                });
                await invoke('hide_window');
              })();
            } else if (result.type === 'application') {
              invoke('launch_application', { path: (result as any).path })
                .then(() => invoke('hide_window'));
            }
          }
          break;
        case 'Escape':
          console.log('[Main Window] ESC pressed, attempting to hide window');
          console.log('[Main Window] Calling invoke hide_window...');
          const result = invoke('hide_window');
          result
            .then(() => console.log('[Main Window] hide_window succeeded'))
            .catch(err => console.error('[Main Window] hide_window failed:', err));
          break;
      }
    };

    // 使用 capture 阶段捕获，确保优先于其他事件处理
    // 只监听 keydown，避免重复触发
    window.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [searchResults, selectedIndex, plugins]);

  // 当搜索结果变化时，重置选中索引
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleExecute = async (result: SearchResult) => {
    console.log('[Main Window] Executing result:', result);

    if (result.type === 'plugin') {
      // 执行插件
      try {
        console.log('[Main Window] Opening plugin:', result.pluginId);
        
        // 查找插件元数据以获取正确的入口文件
        const plugin = plugins.find(p => p.id === result.pluginId);
        const entryFile = plugin?.entry || 'index.js';
        
        // 使用动态窗口创建
        await invoke('open_plugin_window', {
          pluginId: result.pluginId,
          pluginName: result.title,
          entry: entryFile,
        });
        await invoke('hide_window');
      } catch (error) {
        console.error('[Main Window] Error opening plugin:', error);
      }
    } else if (result.type === 'application') {
      // 启动应用程序
      try {
        console.log('[Main Window] Launching application:', result.executable);
        await invoke('launch_application', { path: result.path });
        await invoke('hide_window');
      } catch (error) {
        console.error('[Main Window] Error launching application:', error);
      }
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {showSettings ? (
        // 设置页面
        <Settings onClose={() => setShowSettings(false)} />
      ) : (
        // 主界面
        <>
          {/* 外层容器 - 提供圆角和背景 */}
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
            {/* 顶部搜索栏 - 固定在顶部，顶部圆角与窗体融合 */}
            <div className="flex-shrink-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
              <SearchBar 
                ref={searchBarRef}
                value={query} 
                onChange={setQuery}
                onOpenSettings={() => setShowSettings(true)}
              />
            </div>

            {/* 内容区域 - 可滚动 */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
              {/* 搜索结果列表 */}
              <SearchResultList 
                results={searchResults} 
                onExecute={handleExecute}
                selectedIndex={selectedIndex}
                onSelectIndex={setSelectedIndex}
              />
            </div>
          </div>
          
          {/* Debug Panel - 只在开发环境显示 */}
          {import.meta.env.DEV && <DebugPanel />}
        </>
      )}
    </div>
  );
}

export default App;
