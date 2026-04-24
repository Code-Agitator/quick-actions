import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Button } from '@heroui/react';
import { IoClose } from 'react-icons/io5';
import { Plugin } from '../types/plugin';

interface PluginViewProps {
  plugin: Plugin;
  onClose: () => void;
}

export function PluginView({ plugin, onClose }: PluginViewProps) {
  const [iframeUrl, setIframeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPlugin = async () => {
      try {
        const pluginPath = await invoke<string>('get_plugin_path', { id: plugin.id });
        const normalizedPath = pluginPath.replace(/\\/g, '/');
        const assetUrl = convertFileSrc(`${normalizedPath}/${plugin.entry}`);
        setIframeUrl(assetUrl);
      } catch (error) {
        console.error('Failed to load plugin:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (plugin.entry_type === 'html') {
      loadPlugin();
    } else {
      setIsLoading(false);
    }
  }, [plugin]);

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900">
      <div className="h-full flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="text-4xl p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
              {plugin.icon || '🔌'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {plugin.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {plugin.description}
              </p>
            </div>
          </div>
          <Button
            isIconOnly
            variant="light"
            size="lg"
            onPress={onClose}
            className="min-w-10 w-10 h-10"
          >
            <IoClose className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </Button>
        </div>

        {/* 插件内容 */}
        <div className="flex-1 overflow-hidden relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 dark:text-gray-400">加载中...</p>
              </div>
            </div>
          ) : plugin.entry_type === 'html' && iframeUrl ? (
            <iframe
              src={iframeUrl}
              className="w-full h-full border-0"
              title={plugin.name}
              onLoad={() => setIsLoading(false)}
            />
          ) : (
            <div className="p-8">
              <div className="max-w-2xl mx-auto text-center py-16">
                <div className="text-6xl mb-4">🚀</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  JS 插件交互界面
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  该插件需要通过 API 调用执行
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
