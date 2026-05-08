import { useState, useEffect, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

import { motion, AnimatePresence } from 'framer-motion';
import { SearchBar, SearchBarRef } from "./components/SearchBar";
import { SearchResultListMemo } from "./components/SearchResultList";
import { QuickButtons } from './components/QuickButtons';
import { Settings } from "./components/Settings";
import { usePlugins } from "./hooks/usePlugins";
import { useApplications } from "./hooks/useApplications";
import { useAppSettings } from "./hooks/useAppSettings";
import { SearchResult } from "./types/searchResult";
import { searchCache } from "./utils/searchCache";
import { useDebug } from "./context/DebugContext";
import { initDebug, debugTimer } from "./utils/debugLogger";
import { userBehaviorTracker } from "./utils/userBehavior";
import { WINDOW_SIZES } from "./constants";

function App() {
  // 【性能监控】记录前端启动时间
  const appStartRef = useRef<DOMHighResTimeStamp>(performance.now());
  
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [interactionSource, setInteractionSource] = useState<'keyboard' | 'mouse'>('keyboard');
  const [indexReady, setIndexReady] = useState(false); // 标记索引是否就绪
  const [showSettings, setShowSettings] = useState(false); // 显示设置页面
  const [isExpanded, setIsExpanded] = useState(false); // 窗口是否展开
  const [isQuickMode, setIsQuickMode] = useState(false); // 快捷模式（缩短搜索框）
  const searchBarRef = useRef<SearchBarRef>(null);
  const resizeTimerRef = useRef<number | null>(null); // 窗口调整防抖定时器
  const lastResizeHeightRef = useRef<number>(WINDOW_SIZES.COLLAPSED_HEIGHT); // 记录上次窗口高度
  const lastQueryChangeTimeRef = useRef<number>(0); // 记录上次查询变化时间
  const isExecutingRef = useRef<boolean>(false); // ✅ 防止重复执行标志
  
  console.log(`[Frontend] App component initialized at ${(performance.now() - appStartRef.current).toFixed(2)}ms`);
  
  const { plugins } = usePlugins();
  const { applications, reload: reloadApplications, loadVisibleIcons } = useApplications();
  const { getPinnedPlugins, togglePluginPin } = useAppSettings();
  
  console.log(`[Frontend] Hooks initialized at ${(performance.now() - appStartRef.current).toFixed(2)}ms`);
  
  // 确保主题在应用启动时初始化（useAppSettings 的 useEffect 会自动应用主题）
  useAppSettings();
  const { settings: debugSettings } = useDebug();

  // 【性能监控】应用挂载完成
  useEffect(() => {
    const mountTime = performance.now() - appStartRef.current;
    console.log(`[Frontend] ========================================`);
    console.log(`[Frontend] App mounted successfully in ${mountTime.toFixed(2)}ms`);
    console.log(`[Frontend] ========================================`);
  }, []);

  // 同步 debug 设置到 debugLogger
  useEffect(() => {
    const debugStart = performance.now();
    initDebug(debugSettings);
    console.log(`[Frontend] Debug initialized in ${(performance.now() - debugStart).toFixed(2)}ms`);
  }, [debugSettings]);

  // 【新特性】应用启动时注册全局快捷键
  useEffect(() => {
    const registerStart = performance.now();
    const registerShortcut = async () => {
      try {
        const settingsStr = localStorage.getItem('quick-actions-settings');
        if (settingsStr) {
          const settings = JSON.parse(settingsStr);
          const shortcut = settings.globalShortcut || 'Ctrl+Space';
          console.log(`[Frontend] [${(performance.now() - registerStart).toFixed(2)}ms] Registering global shortcut:`, shortcut);
          
          await invoke('update_global_shortcut', { shortcut });
          console.log(`[Frontend] [${(performance.now() - registerStart).toFixed(2)}ms] ✓ Global shortcut registered`);
        }
      } catch (error) {
        console.error(`[Frontend] [${(performance.now() - registerStart).toFixed(2)}ms] ✗ Failed to register global shortcut:`, error);
      }
    };
    
    // 延迟执行，确保后端已就绪
    const timer = setTimeout(() => {
      console.log(`[Frontend] [${(performance.now() - registerStart).toFixed(2)}ms] Starting shortcut registration...`);
      registerShortcut();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // 监听 query 变化，动态调整窗口高度（立即响应版）
  useEffect(() => {
    const shouldExpand = query.length > 0;
    const newHeight = shouldExpand ? WINDOW_SIZES.EXPANDED_HEIGHT : WINDOW_SIZES.COLLAPSED_HEIGHT;
    
    // 如果目标高度与上次相同，跳过调整
    if (newHeight === lastResizeHeightRef.current) {
      return;
    }
    
    const now = performance.now();
    const timeSinceLastChange = now - lastQueryChangeTimeRef.current;
    const isRapidInput = timeSinceLastChange < 100; // 100ms 内视为快速输入
    
    console.log('[App] Query changed:', JSON.stringify(query), '-> expanding:', shouldExpand, 'newHeight:', newHeight, 'rapid:', isRapidInput);
    
    // 清除之前的防抖定时器
    if (resizeTimerRef.current) {
      clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = null;
    }
    
    // 1. 立即更新状态，触发 UI 准备（无延迟）
    setIsExpanded(shouldExpand);
    
    // 2. 使用极短防抖：8ms（几乎立即响应）
    // Rust 端会立即调整窗口高度，无动画
    const delay = 8;
    
    resizeTimerRef.current = window.setTimeout(() => {
      lastResizeHeightRef.current = newHeight;
      invoke('set_main_window_size', { height: newHeight })
        .then(() => console.log('[App] Window resized immediately to:', newHeight))
        .catch(err => console.error('[App] Failed to resize:', err));
      resizeTimerRef.current = null;
    }, delay);
    
    // 更新最后变化时间
    lastQueryChangeTimeRef.current = now;
    
    // 清理函数
    return () => {
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
    };
  }, [query]);

  // 监听 showSettings 变化，重置窗口大小
  useEffect(() => {
    if (!showSettings) {
      // 回到搜索页时，根据 query 状态设置窗口高度
      const newHeight = query.length > 0 ? WINDOW_SIZES.EXPANDED_HEIGHT : WINDOW_SIZES.COLLAPSED_HEIGHT;
      invoke('set_main_window_size', { height: newHeight })
        .then(() => console.log('[App] Settings closed, window resized to:', newHeight))
        .catch(err => console.error('[App] Failed to resize after settings close:', err));
    } else {
      // 进入设置页时，设置为固定高度
      invoke('set_main_window_size', { height: WINDOW_SIZES.SETTINGS_HEIGHT })
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
        
        // 直接设置状态，不经过清空步骤，避免窗口抽搐
        setQuery(currentValue);
        setIsExpanded(true);
        
        // 关键：手动调用窗口大小调整，确保窗口展开
        // 这样可以绕过 React 的优化，直接执行
        invoke('set_main_window_size', { height: 480 })
          .then(() => {
            console.log('[App] Window expanded to 480px');
          })
          .catch(err => {
            console.error('[App] Failed to expand window:', err);
          });
        
        // 选中文本（延迟确保状态更新完成）
        setTimeout(() => {
          input.select();
          console.log('[App] Text selected');
        }, 50);
      } else {
        console.log('[App] No existing query, keeping window collapsed');
        // 如果没有内容，保持收起状态
        setIsExpanded(false);
        invoke('set_main_window_size', { height: 64 })
          .catch(err => console.error('[App] Failed to collapse window:', err));
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
    console.log('[App] Plugins or applications changed, rebuilding index...', {
      pluginsCount: plugins.length,
      applicationsCount: applications.length
    });
    
    // 只要有数据就重建索引（即使只有一个有数据）
    if (plugins.length > 0 || applications.length > 0) {
      // 获取固定的插件列表
      const pinnedSet = getPinnedPlugins();
      
      // 为插件添加固定状态
      const pluginsWithPinned = plugins.map(plugin => ({
        ...plugin,
        pinned: plugin.pinned || pinnedSet.has(plugin.id)
      }));
      
      searchCache.rebuildIndex(pluginsWithPinned, applications);
      
      // 标记索引已就绪，触发重新渲染
      setIndexReady(true);
      console.log('[App] Index rebuilt and ready');
    }
  }, [plugins, applications]);

  // 监听 pinned 状态变化，重建索引
  useEffect(() => {
    const handlePinnedChanged = () => {
      console.log('[App] Pinned state changed, rebuilding index...');
      const pinnedSet = getPinnedPlugins();
      
      // 为插件添加固定状态
      const pluginsWithPinned = plugins.map(plugin => ({
        ...plugin,
        pinned: plugin.pinned || pinnedSet.has(plugin.id)
      }));
      
      searchCache.rebuildIndex(pluginsWithPinned, applications);
      
      // 如果当前有搜索词，强制重新计算搜索结果
      if (query) {
        // 通过更新 indexReady 触发 useMemo 重新计算
        setIndexReady(false);
        setTimeout(() => setIndexReady(true), 0);
      }
    };

    window.addEventListener('plugin-pinned-changed', handlePinnedChanged);
    return () => {
      window.removeEventListener('plugin-pinned-changed', handlePinnedChanged);
    };
  }, [plugins, applications, query, getPinnedPlugins]);

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

  // ✅ 监听用户行为变化，清除搜索缓存
  useEffect(() => {
    const handleBehaviorChanged = () => {
      console.log('[App] User behavior changed, clearing search cache...');
      searchCache.clearSearchCache();
    };

    window.addEventListener('user-behavior-changed', handleBehaviorChanged);
    return () => {
      window.removeEventListener('user-behavior-changed', handleBehaviorChanged);
    };
  }, []);

  // 使用缓存搜索（极速）
  const searchResults = useMemo(() => {
    console.log('[App] searchResults useMemo triggered', {
      query,
      indexReady,
      pluginsLength: plugins.length,
      applicationsLength: applications.length
    });
    
    // 如果索引未就绪且没有任何数据，返回空数组
    if (!indexReady && plugins.length === 0 && applications.length === 0) {
      console.log('[App] Index not ready and no data, returning empty results');
      return [];
    }
    
    // 只要有数据或索引就绪，就执行搜索
    const endTimer = debugTimer('searchTiming', `搜索 "${query}"`);
    const result = searchCache.search(query);
    endTimer();
    
    console.log('[App] Search returned', result.length, 'results for query:', query);
    
    // 性能优化：限制最多展示20条结果
    const MAX_RESULTS = 20;
    return result.slice(0, MAX_RESULTS);
  }, [query, indexReady]); // 只依赖 query 和 indexReady

  // 【图标加载】当搜索结果变化时，加载可见应用的图标
  useEffect(() => {
    if (searchResults.length > 0 && loadVisibleIcons) {
      // 提取搜索结果中的应用
      const visibleApps = searchResults
        .filter(result => result.type === 'application')
        .slice(0, 10); // 只加载前 10 个应用的图标
      
      if (visibleApps.length > 0) {
        loadVisibleIcons(visibleApps);
      }
    }
  }, [searchResults, loadVisibleIcons]);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 快捷模式切换：Alt (切换逻辑)
      if (e.key === 'Alt' && !e.repeat) {
        e.preventDefault(); // 阻止系统默认的菜单激活行为
        setIsQuickMode(prev => !prev);
        return;
      }
      
      // 只处理我们关心的键
      if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
        return;
      }
      
      // 阻止默认行为，防止光标移动
      e.preventDefault();
      
      switch (e.key) {
        case 'ArrowDown':
          setInteractionSource('keyboard');
          setSelectedIndex(prev => 
            prev < searchResults.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          setInteractionSource('keyboard');
          setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        case 'Enter':
          if (searchResults[selectedIndex]) {
            const result = searchResults[selectedIndex];
            
            // ✅ 记录用户选择行为
            userBehaviorTracker.recordSelection(query, result.id, result.type as 'plugin' | 'app');
            
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
          
          // 【修复】如果在设置页面，先返回搜索页
          if (showSettings) {
            console.log('[Main Window] In settings page, closing settings...');
            setShowSettings(false);
            return;
          }
          
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

    const handleKeyUp = (_e: KeyboardEvent) => {
      // 移除自动退出逻辑，改为完全由 Alt 键切换控制
      // if (!e.altKey) {
      //   setIsQuickMode(false);
      // }
    };

    // 使用 capture 阶段捕获，确保优先于其他事件处理
    // 只监听 keydown，避免重复触发
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [searchResults, selectedIndex, plugins, showSettings, query]);

  // 当搜索结果变化时，重置选中索引
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleExecute = async (result: SearchResult) => {
    console.log('[Main Window] Executing result:', result);

    // ✅ 防止重复执行：检查是否正在执行中
    if (isExecutingRef.current) {
      console.log('[Main Window] Execution already in progress, ignoring duplicate call');
      return;
    }

    isExecutingRef.current = true;

    try {
      // ✅ 记录用户选择行为
      userBehaviorTracker.recordSelection(query, result.id, result.type as 'plugin' | 'app');

      if (result.type === 'plugin') {
        // 执行插件
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
      } else if (result.type === 'application') {
        // 启动应用程序
        console.log('[Main Window] Launching application:', result.executable);
        await invoke('launch_application', { path: result.path });
        await invoke('hide_window');
      }
    } catch (error) {
      console.error('[Main Window] Error executing result:', error);
    } finally {
      // ✅ 延迟重置标志，防止快速连续点击
      setTimeout(() => {
        isExecutingRef.current = false;
      }, 500);
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
        <Settings 
          onClose={() => setShowSettings(false)} 
          onTogglePin={togglePluginPin}
        />
      ) : (
        // 主界面 - 全透明背景 + CSS 动画展开
        <>
          {/* 外层容器 - 全透明背景 */}
          <div 
            className="flex-1 flex flex-col overflow-hidden h-full bg-transparent"
          >
            {/* 搜索栏 - 与 Spotlight 一致的极简设计 */}
            <div className="flex-shrink-0 flex items-center w-full px-4" style={{ height: '64px' }}>
              <SearchBar 
                ref={searchBarRef}
                value={query} 
                onChange={setQuery}
                onOpenSettings={() => setShowSettings(true)}
                isQuickMode={isQuickMode}
              />
              <AnimatePresence mode="wait">
                {isQuickMode && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'auto', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="flex-shrink-0 overflow-visible"
                  >
                    <div className="flex items-center gap-2 pl-2 py-2">
                      <QuickButtons 
                        onExecute={(item) => {
                          // 执行快捷按钮逻辑
                          console.log('Quick button executed:', item.id);
                          if (item.id === 'settings') {
                            setShowSettings(true);
                          }
                          setIsQuickMode(false);
                        }} 
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 分隔线 - 仅在展开时显示 */}
            <motion.div 
              className="mx-4 h-[1px] bg-gray-200 dark:bg-white/5"
              animate={{
                opacity: isExpanded ? 1 : 0,
              }}
              transition={{
                duration: 0.15,
                ease: "easeOut",
                opacity: { delay: isExpanded ? 0.05 : 0 }
              }}
            />

            {/* 内容区域 - 使用 CSS max-height 动画展开搜索结果 */}
            <div 
              className={`flex flex-col overflow-hidden transition-all duration-200 ease-out ${
                isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="flex-1 overflow-y-auto scrollbar-thin py-1 min-h-0">
                {/* 搜索结果列表 - 使用优化后的组件 */}
                <SearchResultListMemo 
                  results={searchResults} 
                  onExecute={handleExecute}
                  selectedIndex={selectedIndex}
                  onSelectIndex={setSelectedIndex}
                  interactionSource={interactionSource}
                  onInteractionChange={setInteractionSource}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
