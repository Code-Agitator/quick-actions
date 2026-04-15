import { useState, useEffect, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SearchBar, SearchBarRef } from "./components/SearchBar";
import { SearchResultList } from "./components/SearchResultList";
import { Settings } from "./components/Settings";
import { usePlugins } from "./hooks/usePlugins";
import { useApplications } from "./hooks/useApplications";
import { useAppSettings } from "./hooks/useAppSettings";
import { SearchResult } from "./types/searchResult";
import { searchCache } from "./utils/searchCache";
import { useDebug } from "./context/DebugContext";
import { initDebug, debugTimer } from "./utils/debugLogger";

function App() {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [indexReady, setIndexReady] = useState(false); // 标记索引是否就绪
  const [showSettings, setShowSettings] = useState(false); // 显示设置页面
  const [isExpanded, setIsExpanded] = useState(false); // 窗口是否展开
  const searchBarRef = useRef<SearchBarRef>(null);
  const { plugins } = usePlugins();
  const { applications, reload: reloadApplications } = useApplications();
  // 确保主题在应用启动时初始化（useAppSettings 的 useEffect 会自动应用主题）
  useAppSettings();
  const { settings: debugSettings } = useDebug();

  // 同步 debug 设置到 debugLogger
  useEffect(() => {
    initDebug(debugSettings);
  }, [debugSettings]);

  // 监听 query 变化，动态调整窗口高度
  useEffect(() => {
    const shouldExpand = query.length > 0;
    const newHeight = shouldExpand ? 480 : 64;
    
    console.log('[App] Query changed:', JSON.stringify(query), '-> expanding:', shouldExpand, 'newHeight:', newHeight);
    
    // 先更新状态
    setIsExpanded(shouldExpand);
    
    // 通过 Rust 后端调整窗口大小
    invoke('set_main_window_size', { height: newHeight })
      .then(() => console.log('[App] Window resized to height:', newHeight))
      .catch(err => console.error('[App] Failed to resize:', err));
  }, [query]);

  // 监听 showSettings 变化，重置窗口大小
  useEffect(() => {
    if (!showSettings) {
      // 回到搜索页时，根据 query 状态设置窗口高度
      const newHeight = query.length > 0 ? 480 : 64;
      invoke('set_main_window_size', { height: newHeight })
        .then(() => console.log('[App] Settings closed, window resized to:', newHeight))
        .catch(err => console.error('[App] Failed to resize after settings close:', err));
    } else {
      // 进入设置页时，设置为固定高度
      invoke('set_main_window_size', { height: 600 })
        .then(() => console.log('[App] Settings opened, window resized to 600'))
        .catch(err => console.error('[App] Failed to resize for settings:', err));
    }
  }, [showSettings, query]);

  useEffect(() => {
    // Escape 键已在键盘导航中处理
  }, []);

  // 监听窗口焦点事件，自动聚焦搜索框并重置到搜索页
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
      // 窗口重新获得焦点时，确保聚焦搜索框
      focusInput();
    };

    const handleBlur = () => {
      // Window lost focus
    };

    // 【关键优化】窗口隐藏时立即重置状态，避免下次呼出时闪现设置页
    const resetSearchState = () => {
      console.log('[App] Window hidden, resetting search state');
      if (showSettings) {
        setShowSettings(false);
      }
      setQuery('');
      setSelectedIndex(0);
      setIsExpanded(false);
    };

    // 【新特性】呼出窗口时，如果有内容则重新触发搜索
    const handleShowWithSearch = () => {
      console.log('[App] Window shown, checking for existing query...');
      const input = document.querySelector('input[type="text"], input:not([type])') as HTMLInputElement;
      
      if (input && input.value && input.value.trim().length > 0) {
        const currentValue = input.value;
        console.log('[App] Found existing query:', currentValue, '- re-triggering search');
        
        // 关键：先清空再设置，强制 React 检测到变化并触发 useEffect
        setQuery('');
        setIsExpanded(false);
        
        // 下一帧再设置真实值，确保触发更新
        requestAnimationFrame(() => {
          setQuery(currentValue);
          setIsExpanded(true);
          console.log('[App] Query set to:', currentValue, ', expanded:', true);
        });
        
        // 选中文本（延迟确保状态更新完成）
        setTimeout(() => {
          input.select();
          console.log('[App] Text selected');
        }, 100);
      } else {
        console.log('[App] No existing query, keeping window collapsed');
        // 如果没有内容，保持收起状态
        setIsExpanded(false);
      }
    };
    
    // 【新特性】退出设置页面
    const exitSettings = () => {
      console.log('[App] Exiting settings page');
      if (showSettings) {
        setShowSettings(false);
      }
    };

    // 暴露给 Rust 调用的全局函数
    (window as any).__resetSearch = resetSearchState;
    (window as any).__handleShowWithSearch = handleShowWithSearch;
    (window as any).__exitSettings = exitSettings;

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
      // 清理全局函数
      delete (window as any).__resetSearch;
      delete (window as any).__handleShowWithSearch;
      delete (window as any).__exitSettings;
    };
  }, [showSettings]);

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
      
      // 阻止默认行为，防止光标移动
      e.preventDefault();
      
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
          console.log('[Main Window] ESC pressed');
          // 【新交互】如果搜索框有内容则清空，否则隐藏窗口
          if (query.length > 0) {
            console.log('[Main Window] Clearing search query');
            setQuery('');
            setSelectedIndex(0);
            setIsExpanded(false);
          } else {
            console.log('[Main Window] No query, hiding window');
            invoke('hide_window')
              .then(() => console.log('[Main Window] Window hidden'))
              .catch(err => console.error('[Main Window] Failed to hide:', err));
          }
          break;
        case 'F5':
          e.preventDefault();
          console.log('[Main Window] F5 pressed, reloading applications...');
          reloadApplications();
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
    <div 
      className="h-screen flex flex-col overflow-hidden bg-transparent" 
      style={{ 
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale'
      }}
      data-tauri-drag-region
    >
      {showSettings ? (
        // 设置页面
        <Settings onClose={() => setShowSettings(false)} />
      ) : (
        // 主界面 - Spotlight 风格
        <>
          {/* 外层容器 - iOS 毛玻璃质感，确保背景一致 */}
          <div 
            className="flex-1 flex flex-col overflow-hidden ios-frosted h-full"
          >
            {/* 搜索栏 - 与 Spotlight 一致的极简设计 */}
            <div className="flex-shrink-0 px-4 flex items-center" style={{ height: '64px' }}>
              <SearchBar 
                ref={searchBarRef}
                value={query} 
                onChange={setQuery}
                onOpenSettings={() => setShowSettings(true)}
              />
            </div>

            {/* 分隔线 - 仅在展开时显示 */}
            {isExpanded && (
              <div className="mx-4 h-px bg-white/10" />
            )}

            {/* 内容区域 - 仅在展开时显示 */}
            {isExpanded && (
              <div className="flex-1 overflow-y-auto scrollbar-thin py-1">
                {/* 搜索结果列表 */}
                <SearchResultList 
                  results={searchResults} 
                  onExecute={handleExecute}
                  selectedIndex={selectedIndex}
                  onSelectIndex={setSelectedIndex}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
