import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { convertFileSrc } from '@tauri-apps/api/core';
import { PluginUI } from './components/PluginUI';
import { Plugin } from './types/plugin';

export function PluginApp() {
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 确保窗口可拖拽
  useEffect(() => {
    const ensureDraggable = async () => {
      try {
        const currentWindow = getCurrentWindow();
        // 确保窗口 resizable（拖拽必需）
        await currentWindow.setResizable(true);
        console.log('[PluginApp] Window set to resizable');
      } catch (err) {
        console.error('[PluginApp] Failed to set resizable:', err);
      }
    };
    
    ensureDraggable();
  }, []);

  // 从 sessionStorage 或 URL 参数获取插件信息
  const parsePluginInfo = useCallback(() => {
    // 首先尝试从 sessionStorage 获取（窗口池方案）
    const storedId = sessionStorage.getItem('__PLUGIN_ID__');
    const storedEntry = sessionStorage.getItem('__PLUGIN_ENTRY__');
    
    if (storedId) {
      console.log('[PluginApp] Found plugin info from sessionStorage');
      return {
        pluginId: storedId,
        entry: storedEntry || 'index.js',
      };
    }
    
    // 否则从 URL 参数获取（备用方案）
    const params = new URLSearchParams(window.location.search);
    const pluginId = params.get('id');
    const entry = params.get('entry') || 'index.js';
    
    console.log('[PluginApp] === PARSING PLUGIN INFO ===');
    console.log('[PluginApp] Full URL:', window.location.href);
    console.log('[PluginApp] Search:', window.location.search);
    console.log('[PluginApp] sessionStorage ID:', storedId);
    console.log('[PluginApp] Parsed - pluginId:', pluginId, ', entry:', entry);
    console.log('[PluginApp] ==========================');
    
    return { pluginId: pluginId || '', entry };
  }, []);

  // 加载插件模块
  const loadPluginModule = useCallback(async (pluginData: Plugin) => {
    // 如果是 ESM/JS 插件，需要先加载模块
    let pluginToRender: Plugin = pluginData;
    
    if (pluginData.entry_type === 'esm' || pluginData.entry_type === 'js') {
      try {
        console.log('[Plugin Window] Loading ESM/JS module...');
        
        // 获取插件路径
        const pluginPath = await invoke<string>('get_plugin_path', { id: pluginData.id });
        
        const normalizedPath = pluginPath.replace(/\\/g, '/');
        const entryPath = `${normalizedPath}/${pluginData.entry}`;
        
        const assetUrl = convertFileSrc(entryPath);
        
        // 动态导入模块
        const module = await import(/* @vite-ignore */ assetUrl);
        
        const pluginModule = module.default || module;
        
        if (typeof pluginModule.render === 'function') {
          // 将模块附加到 plugin 对象
          pluginToRender = { ...pluginData, customUI: pluginModule } as any;
        } else {
          console.warn('[Plugin Window] Module does not have render method. Available methods:', Object.keys(pluginModule));
        }
      } catch (error) {
        console.error('[Plugin Window] Error loading module:', error);
      }
    }
    
    return pluginToRender;
  }, []);

  useEffect(() => {
    console.log('[PluginApp] useEffect mounted');
    console.log('[PluginApp] window.location.search:', window.location.search);
    console.log('[PluginApp] window.location.href:', window.location.href);
    
    const setupPluginWindow = async () => {
      const { pluginId, entry } = parsePluginInfo();
      
      console.log('[PluginApp] Parsed plugin info - pluginId:', pluginId, ', entry:', entry);
      
      if (!pluginId) {
        console.error('[Plugin Window] No plugin ID in URL');
        setError('未找到插件 ID');
        setLoading(false);
        return;
      }

      console.log('[Plugin Window] === LOADING PLUGIN ===');
      console.log('[Plugin Window] pluginId:', pluginId);
      console.log('[Plugin Window] entry:', entry);

      try {
        // 获取所有插件列表
        console.log('[Plugin Window] Fetching plugins list...');
        const pluginsList = await invoke<any[]>('get_plugins');
        console.log('[Plugin Window] Found', pluginsList.length, 'plugins');
        
        const pluginMeta = pluginsList.find(p => p.id === pluginId);
        console.log('[Plugin Window] Plugin meta:', pluginMeta ? 'found' : 'NOT FOUND');
        
        if (!pluginMeta) {
          console.error('[Plugin Window] Plugin not found:', pluginId);
          setError(`插件 "${pluginId}" 不存在`);
          setLoading(false);
          return;
        }

        const pluginData: Plugin = {
          id: pluginMeta.id,
          name: pluginMeta.name,
          version: pluginMeta.version,
          description: pluginMeta.description,
          icon: pluginMeta.icon,
          keywords: pluginMeta.keywords || [],
          entry: pluginMeta.entry || entry,
          entry_type: pluginMeta.entry_type || 'esm',
        };

        console.log('[Plugin Window] Loading plugin:', pluginData.name);
        console.log('[Plugin Window] Plugin entry:', pluginData.entry);
        console.log('[Plugin Window] Plugin entry_type:', pluginData.entry_type);

        // 加载插件模块
        const pluginToRender = await loadPluginModule(pluginData);
        
        console.log('[Plugin Window] Plugin loaded:', pluginToRender);
        console.log('[Plugin Window] Has customUI?:', !!(pluginToRender as any).customUI);
        
        setSelectedPlugin(pluginToRender);
        setLoading(false);

        // 确保窗口显示并获得焦点
        const currentWindow = getCurrentWindow();
        console.log('[Plugin Window] Current window label:', currentWindow.label);
        await currentWindow.show();
        await currentWindow.setFocus();
        console.log('[Plugin Window] Plugin loaded and window shown');
      } catch (error) {
        console.error('[Plugin Window] === ERROR ===');
        console.error('[Plugin Window] Error:', error);
        console.error('[Plugin Window] Stack:', error instanceof Error ? error.stack : 'N/A');
        setError(`加载失败: ${error instanceof Error ? error.message : String(error)}`);
        setLoading(false);
      }
    };

    // 同时监听事件（兼容旧方式）
    const unlisten = listen('load-plugin', async (event) => {
      console.log('[Plugin Window] Received load-plugin event:', event);
      const pluginData = event.payload as Plugin;
      
      // 从全局变量或 URL 获取入口文件（如果事件中没提供）
      const { entry: urlEntry } = parsePluginInfo();
      const effectiveEntry = pluginData.entry || urlEntry;
      pluginData.entry = effectiveEntry;

      const pluginToRender = await loadPluginModule(pluginData);
      
      setSelectedPlugin(pluginToRender);
      setLoading(false);
      
      const currentWindow = getCurrentWindow();
      await currentWindow.show();
      await currentWindow.setFocus();
    });

    // 立即从 URL 加载
    setupPluginWindow();
    
    // 监听 ESC 键退出
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log('[Plugin Window] ESC pressed, closing plugin');
        handleClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      console.log('[Plugin Window] Cleaning up');
      unlisten.then(fn => fn());
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [parsePluginInfo, loadPluginModule]);

  const handleClose = async () => {
    // 隐藏窗口而不是关闭
    const currentWindow = getCurrentWindow();
    await currentWindow.hide();
    setSelectedPlugin(null);
    
    // 通知主窗口插件已关闭
    await invoke('emit_event', { 
      event: 'plugin-closed',
      payload: {} 
    });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center ios-frosted" data-tauri-drag-region>
        <div className="text-white text-lg">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center ios-frosted" data-tauri-drag-region>
        <div className="text-red-400 text-lg">
          <div className="mb-2">❌ 加载失败</div>
          <div className="text-sm text-gray-400">{error}</div>
        </div>
      </div>
    );
  }

  if (!selectedPlugin) {
    return (
      <div className="h-screen flex items-center justify-center ios-frosted" data-tauri-drag-region>
        <div className="text-white text-lg">等待插件加载...</div>
      </div>
    );
  }

  return (
    <div className="h-screen ios-frosted" data-tauri-drag-region>
      <PluginUI 
        plugin={selectedPlugin} 
        onClose={handleClose}
      />
    </div>
  );
}
