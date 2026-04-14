import { useState, useEffect, ReactElement, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plugin } from '../types/plugin';
import { X } from 'lucide-react';
import { createActionsAPI } from '../utils/actionsAPI';

interface PluginUIProps {
  plugin: Plugin;
  onClose: () => void;
}

// JS 插件的 UI 组件类型
interface JSPluginUI {
  render: (props: { query: string; onResult?: (result: any) => void }) => ReactElement | HTMLElement;
  execute?: (query: string) => Promise<any[]>;
}

export function PluginUI({ plugin, onClose }: PluginUIProps) {
  const [iframeUrl, setIframeUrl] = useState<string>('');
  const [pluginModule, setPluginModule] = useState<JSPluginUI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadPlugin = async () => {
      try {
        const pluginPath = await invoke<string>('get_plugin_path', { id: plugin.id });
        const normalizedPath = pluginPath.replace(/\\/g, '/');
        const entryType = plugin.entry_type || 'js';

        if (entryType === 'html') {
          // HTML 插件：直接构建文件路径 URL
          const assetUrl = `file://${normalizedPath}/${plugin.entry}`;
          setIframeUrl(assetUrl);
          setLoading(false);
        } else if (entryType === 'esm') {
          // ESM 插件：直接使用 customUI（已在 pluginLoader 中加载）
          if ((plugin as any).customUI) {
            setPluginModule((plugin as any).customUI);
            setLoading(false);
          } else {
            setError('ESM 插件未提供 UI 模块');
            setLoading(false);
          }
        } else if (entryType === 'js') {
          // JS 插件：使用 Tauri 命令读取文件内容并动态评估
          try {
            // 读取插件文件内容
            const pluginContent = await invoke<string>('read_plugin_file', {
              pluginId: plugin.id,
              entry: plugin.entry
            });
            
            // 创建一个 Blob 并生成 URL
            const blob = new Blob([pluginContent], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            
            // 动态导入模块
            const module = await import(/* @vite-ignore */ url);
            const pluginModule = module.default || module;
            
            if (pluginModule.render && typeof pluginModule.render === 'function') {
              // 如果插件提供了 render 方法，使用自定义 UI
              setPluginModule(pluginModule);
            } else {
              setError('插件未提供 UI 渲染方法');
            }
            
            // 清理 Blob URL
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          } catch (importError) {
            console.error('Failed to import plugin module:', importError);
            setError(`无法加载插件模块：${importError instanceof Error ? importError.message : String(importError)}`);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load plugin:', err);
        setError('无法加载插件');
        setLoading(false);
      }
    };

    loadPlugin();
  }, [plugin]);

  // 当 pluginModule 加载完成且 containerRef 可用时，渲染 DOM 元素
  useEffect(() => {
    if (pluginModule && containerRef.current) {
      try {
        console.log('[PluginUI] pluginModule type:', typeof pluginModule);
        console.log('[PluginUI] pluginModule keys:', Object.keys(pluginModule || {}));
        console.log('[PluginUI] Has render?:', typeof (pluginModule as any).render);
        
        // 创建安全的 ACTIONS API 对象
        const actionsAPI = createActionsAPI(plugin.id);
        
        // 注入到 window.ACTIONS（而不是 window.__TAURI__）
        if (typeof window !== 'undefined') {
          (window as any).ACTIONS = actionsAPI;
        }
        
        // 检查是否有 render 方法
        if (typeof (pluginModule as any).render !== 'function') {
          console.error('[PluginUI] pluginModule does not have render method');
          console.error('[PluginUI] pluginModule:', pluginModule);
          setError('插件模块格式不正确：缺少 render 方法');
          return;
        }
        
        const result = (pluginModule as any).render({ 
          query: '', 
          onResult: (result: any) => console.log('Plugin result:', result)
        });
        
        // 如果是 React 元素，跳过（在 JSX 中处理）
        // 如果是 DOM 元素，挂载到 container
        if (result instanceof HTMLElement) {
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(result);
        }
      } catch (renderError) {
        console.error('Render error:', renderError);
        setError('渲染插件界面时出错');
      }
    }
  }, [pluginModule, plugin.id]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col h-screen ios-frosted">
      {/* 头部 - iOS 风格毛玻璃（紧凑版 + 可拖拽） */}
      <div 
        className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-transparent backdrop-blur-xl select-none"
        data-tauri-drag-region
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl p-2 bg-gradient-to-br from-blue-500/80 to-purple-600/80 rounded-md shadow-lg backdrop-blur-sm border border-white/10">
            {plugin.icon || '🔌'}
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-100 tracking-tight">
              {plugin.name}
            </h2>
            <p className="text-xs text-gray-400/80 mt-0.5 line-clamp-1">
              {plugin.description}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-md hover:bg-white/10 transition-colors duration-150 group"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <X className="w-5 h-5 text-gray-400 group-hover:text-red-400 transition-colors" />
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto relative w-full bg-transparent">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 dark:text-gray-400">加载中...</p>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-6xl mb-4">❌</div>
              <p className="text-red-500 dark:text-red-400 text-lg">{error}</p>
            </div>
          </div>
        ) : plugin.entry_type === 'html' && iframeUrl ? (
          <iframe
            src={iframeUrl}
            className="w-full h-full border-0"
            title={plugin.name}
          />
        ) : pluginModule ? (
          <div ref={containerRef} className="w-full min-h-full" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-6xl mb-4">⚠️</div>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                该插件未提供 UI 界面
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
