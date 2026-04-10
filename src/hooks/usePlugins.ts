import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Plugin, PluginResult } from '../types/plugin';
import { createPluginAPI } from '../utils/pluginAPI';

export function usePlugins() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loadedPlugins, setLoadedPlugins] = useState<Map<string, Plugin>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadPlugins = async () => {
    try {
      setLoading(true);
      const pluginList = await invoke<Plugin[]>('get_plugins');
      const ids = pluginList.map(p => p.id).join(', ');
      invoke('log_frontend_message', { level: 'info', message: `Loaded ${pluginList.length} plugins: [${ids}]` });
      setPlugins(pluginList);
    } catch (error) {
      invoke('log_frontend_message', { level: 'error', message: `Failed to load plugins: ${error}` });
      console.error('Failed to load plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPluginModule = useCallback(async (plugin: Plugin): Promise<Plugin | null> => {
    try {
      const pluginPath = await invoke<string>('get_plugin_path', { id: plugin.id });
      const entryType = plugin.entry_type || 'js';

      if (entryType === 'js') {
        // 标准化路径：将反斜杠转换为正斜杠
        const normalizedPath = pluginPath.replace(/\\/g, '/');
        const entryPath = `${normalizedPath}/${plugin.entry}`;
        const assetUrl = convertFileSrc(entryPath);
        console.log('Loading JS plugin from:', assetUrl);

        const module = await import(/* @vite-ignore */ assetUrl);
        const pluginModule = module.default || module;

        if (typeof pluginModule.execute === 'function') {
          const api = createPluginAPI(plugin.id);
          return {
            ...plugin,
            execute: async (query: string) => {
              return pluginModule.execute(query, api);
            },
          };
        }
      } else if (entryType === 'esm') {
        // ESM 插件：加载并创建 execute 函数
        const normalizedPath = pluginPath.replace(/\\/g, '/');
        const entryPath = `${normalizedPath}/${plugin.entry}`;
        const assetUrl = convertFileSrc(entryPath);
        console.log('Loading ESM plugin from:', assetUrl);

        const module = await import(/* @vite-ignore */ assetUrl);
        const pluginModule = module.default || module;

        // 如果插件提供了 render 方法，说明是 UI 插件
        if (typeof pluginModule.render === 'function') {
          return {
            ...plugin,
            execute: async (_query: string) => {
              // 返回带有 customUI 的结果
              return [{
                title: plugin.name,
                description: plugin.description,
                icon: plugin.icon,
                customUI: pluginModule, // 传递整个模块作为 customUI
                action: async () => {
                  // action 不需要做任何事，PluginUI 会使用 customUI
                },
              }];
            },
          };
        }
      }

      return plugin;
    } catch (error) {
      console.error(`Failed to load plugin module ${plugin.id}:`, error);
      return null;
    }
  }, []);

  const executePlugin = useCallback(async (id: string, query: string): Promise<PluginResult[]> => {
    try {
      // 先尝试从已加载的插件中获取
      let plugin = loadedPlugins.get(id);

      // 如果没有加载过，先加载
      if (!plugin) {
        const targetPlugin = plugins.find(p => p.id === id);
        if (targetPlugin) {
          const loadedPlugin = await loadPluginModule(targetPlugin);
          if (loadedPlugin) {
            plugin = loadedPlugin;
            setLoadedPlugins(prev => new Map(prev).set(id, loadedPlugin));
          }
        }
      }

      if (plugin?.execute) {
        return await plugin.execute(query);
      }

      // 如果是 HTML 插件，提供默认行为
      const htmlPlugin = plugins.find(p => p.id === id && p.entry_type === 'html');
      if (htmlPlugin) {
        const pluginPath = await invoke<string>('get_plugin_path', { id });
        const normalizedPath = pluginPath.replace(/\\/g, '/');
        const assetUrl = convertFileSrc(`${normalizedPath}/${htmlPlugin.entry}`);
        return [{
          title: htmlPlugin.name,
          description: '点击打开插件界面',
          action: () => { window.open(assetUrl, '_blank'); },
        }];
      }

      console.warn(`Plugin ${id} has no execute function`);
      return [];
    } catch (error) {
      console.error(`Failed to execute plugin ${id}:`, error);
      return [];
    }
  }, [plugins, loadedPlugins, loadPluginModule]);

  const installPlugin = async (path: string) => {
    try {
      await invoke('install_plugin', { path });
      await loadPlugins();
    } catch (error) {
      console.error('Failed to install plugin:', error);
      throw error;
    }
  };

  const uninstallPlugin = async (id: string) => {
    try {
      await invoke('uninstall_plugin', { id });
      await loadPlugins();
      // 触发重新索引
      window.dispatchEvent(new CustomEvent('plugins-changed'));
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadPlugins();
  }, []);

  return {
    plugins,
    loading,
    loadPlugins,
    executePlugin,
    installPlugin,
    uninstallPlugin,
  };
}
