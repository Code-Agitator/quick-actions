import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SearchBar } from "./components/SearchBar";
import { PluginList } from "./components/PluginList";
import { PluginUI } from "./components/PluginUI";
import { usePlugins } from "./hooks/usePlugins";
import { Plugin } from "./types/plugin";
import { Spinner } from "@heroui/react";

function App() {
  const [query, setQuery] = useState("");
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const { plugins, loading, executePlugin } = usePlugins();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        invoke("hide_window");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 当查询变化时，执行当前选中的插件（如果有）
  useEffect(() => {
    if (selectedPlugin && query) {
      const execute = async () => {
        try {
          await executePlugin(selectedPlugin.id, query);
        } catch (error) {
          console.error('Error executing plugin:', error);
        }
      };
      
      // 防抖，延迟 300ms 执行
      const timer = setTimeout(execute, 300);
      return () => clearTimeout(timer);
    }
  }, [query, selectedPlugin, executePlugin]);

  const handleExecute = async (id: string, query: string) => {
    console.log('handleExecute called:', { id, query });

    const plugin = plugins.find(p => p.id === id);
    if (!plugin) {
      console.error('Plugin not found:', id);
      return;
    }

    // 如果是 HTML 插件，直接打开 PluginUI
    if (plugin.entry_type === 'html') {
      setSelectedPlugin(plugin);
    } else if (plugin.entry_type === 'esm' || plugin.entry_type === 'js') {
      // ESM 和 JS 插件：先执行以获取 customUI
      try {
        const results = await executePlugin(id, query);
        if (results && results.length > 0 && results[0].customUI) {
          // 将 customUI 附加到 plugin 对象
          const pluginWithUI = { ...plugin, customUI: results[0].customUI };
          setSelectedPlugin(pluginWithUI as any);
        } else {
          // 如果没有 customUI，仍然打开 PluginUI（可能插件有自己的处理方式）
          setSelectedPlugin(plugin);
        }
      } catch (error) {
        console.error('Error executing plugin:', error);
      }
    } else {
      // 其他插件：执行
      try {
        await executePlugin(id, query);
      } catch (error) {
        console.error('Error executing plugin:', error);
      }
    }
  };

  const handleClosePlugin = () => {
    setSelectedPlugin(null);
    setQuery('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Quick Actions
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            快速启动您的插件工具
          </p>
        </div>

        {/* 搜索栏 */}
        <SearchBar value={query} onChange={setQuery} />

        {/* 加载状态 */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Spinner size="lg" color="success" />
            <p className="text-gray-600 dark:text-gray-400 text-sm">正在加载插件...</p>
          </div>
        ) : selectedPlugin ? (
          /* 插件 UI 界面 */
          <PluginUI 
            plugin={selectedPlugin} 
            onClose={handleClosePlugin}
          />
        ) : (
          /* 插件列表 */
          <PluginList plugins={plugins} onExecute={handleExecute} query={query} />
        )}
      </div>
    </div>
  );
}

export default App;
