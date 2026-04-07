import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { convertFileSrc } from '@tauri-apps/api/core';
import { PluginUI } from './components/PluginUI';
import { Plugin } from './types/plugin';

export function PluginApp() {
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[Plugin Window] Setting up event listener');
    
    // 监听来自主窗口的插件加载事件
    const unlisten = listen('load-plugin', async (event) => {
      console.log('[Plugin Window] Received load-plugin event:', event);
      const pluginData = event.payload as Plugin;
      console.log('[Plugin Window] Plugin data:', pluginData);
      
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
          
          console.log('[Plugin Window] Loading from:', assetUrl);
          
          // 动态导入模块
          const module = await import(/* @vite-ignore */ assetUrl);
          const pluginModule = module.default || module;
          
          console.log('[Plugin Window] Module loaded, has render?:', typeof pluginModule.render);
          
          if (typeof pluginModule.render === 'function') {
            // 将模块附加到 plugin 对象
            pluginToRender = { ...pluginData, customUI: pluginModule } as any;
            console.log('[Plugin Window] CustomUI attached');
          } else {
            console.warn('[Plugin Window] Module does not have render method');
          }
        } catch (error) {
          console.error('[Plugin Window] Error loading module:', error);
        }
      }
      
      setSelectedPlugin(pluginToRender);
      setLoading(false);
      
      // 显示窗口
      try {
        const currentWindow = getCurrentWindow();
        console.log('[Plugin Window] Showing window...');
        await currentWindow.show();
        await currentWindow.setFocus();
        console.log('[Plugin Window] Window shown and focused');
      } catch (error) {
        console.error('[Plugin Window] Error showing window:', error);
      }
    });

    console.log('[Plugin Window] Event listener registered');
    
    return () => {
      console.log('[Plugin Window] Cleaning up event listener');
      unlisten.then(fn => fn());
    };
  }, []);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-lg">加载中...</div>
      </div>
    );
  }

  if (!selectedPlugin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-lg">等待插件加载...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <PluginUI 
        plugin={selectedPlugin} 
        onClose={handleClose}
      />
    </div>
  );
}
