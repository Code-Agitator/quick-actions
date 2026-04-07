import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { emitTo } from '@tauri-apps/api/event';
import { SearchBar } from "./components/SearchBar";
import { SearchResultList } from "./components/SearchResultList";
import { usePlugins } from "./hooks/usePlugins";
import { useApplications } from "./hooks/useApplications";
import { SearchResult, createPluginResult } from "./types/searchResult";
import { matchesPinyinSearch } from "./utils/pinyinSearch";

function App() {
  const [query, setQuery] = useState("");
  const { plugins } = usePlugins();
  const { applications } = useApplications();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        invoke("hide_window");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 合并搜索结果
  const searchResults = useMemo(() => {
    const results: SearchResult[] = [];
    
    // 添加插件结果
    plugins.forEach(plugin => {
      if (matchesPinyinSearch(plugin.name, query) ||
          plugin.keywords.some(keyword => matchesPinyinSearch(keyword, query))) {
        results.push(
          createPluginResult(
            plugin.id,
            plugin.name,
            query,
            {
              description: plugin.description,
              icon: plugin.icon,
            }
          )
        );
      }
    });
    
    // 添加应用程序结果
    applications.forEach(app => {
      if (matchesPinyinSearch(app.title, query) ||
          (app.description && matchesPinyinSearch(app.description, query))) {
        results.push(app);
      }
    });
    
    return results;
  }, [query, plugins, applications]);

  const handleExecute = async (result: SearchResult) => {
    console.log('[Main Window] Executing result:', result);

    if (result.type === 'plugin') {
      // 执行插件
      try {
        console.log('[Main Window] Opening plugin:', result.pluginId);
        await emitTo('plugin', 'load-plugin', {
          id: result.pluginId,
          name: result.title,
          entry_type: 'esm',
          entry: 'dist/index.js',
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
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* 顶部搜索栏 - 与窗体融为一体 */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <SearchBar value={query} onChange={setQuery} />
      </div>

      {/* 内容区域 */}
      <div className="p-2">
        {/* 搜索结果列表 */}
        <SearchResultList results={searchResults} onExecute={handleExecute} />
      </div>
    </div>
  );
}

export default App;
