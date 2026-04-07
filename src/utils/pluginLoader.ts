import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Plugin, PluginManifest } from '../types/plugin';
import { createPluginAPI } from './pluginAPI';

export async function loadPluginFromManifest(manifest: PluginManifest): Promise<Plugin> {
  const pluginPath = await invoke<string>('get_plugin_path', { id: manifest.id });
  const entryType = manifest.entry_type || 'js';

  let execute: Plugin['execute'] | undefined;

  if (entryType === 'js') {
    // 加载 JavaScript 插件
    const entryPath = `${pluginPath}/${manifest.entry}`;
    const assetUrl = convertFileSrc(entryPath);

    try {
      const module = await import(/* @vite-ignore */ assetUrl);
      const pluginModule = module.default || module;

      if (typeof pluginModule.execute === 'function') {
        const api = createPluginAPI(manifest.id);
        execute = async (query: string) => {
          return pluginModule.execute(query, api);
        };
      }
    } catch (error) {
      console.error(`Failed to load plugin ${manifest.id}:`, error);
    }
  } else if (entryType === 'html') {
    // HTML 插件通过 iframe 加载
    execute = async () => {
      return [{
        title: manifest.name,
        description: 'HTML plugin - click to open',
        action: async () => {
          const entryPath = `${pluginPath}/${manifest.entry}`;
          const assetUrl = convertFileSrc(entryPath);
          window.open(assetUrl, '_blank');
        },
      }];
    };
  } else if (entryType === 'esm' || manifest.entry.endsWith('.mjs')) {
    // 新的 ES Module 插件（从独立 React 工程构建）
    const entryPath = `${pluginPath}/${manifest.entry}`;
    const assetUrl = convertFileSrc(entryPath);

    try {
      const module = await import(/* @vite-ignore */ assetUrl);
      const pluginModule = module.default || module;

      // 如果插件提供了 render 方法，说明是 UI 插件
      if (typeof pluginModule.render === 'function') {
        execute = async (_query: string) => {
          return [{
            title: manifest.name,
            description: manifest.description,
            icon: manifest.icon,
            customUI: pluginModule, // 传递模块到 customUI
            action: async () => {
              // action 不需要返回任何内容，PluginUI 会使用 customUI
            },
          }];
        };
      }
    } catch (error) {
      console.error(`Failed to load ESM plugin ${manifest.id}:`, error);
    }
  }

  return {
    ...manifest,
    execute,
  };
}

export function validatePluginManifest(data: unknown): data is PluginManifest {
  if (typeof data !== 'object' || data === null) return false;

  const manifest = data as Record<string, unknown>;

  return (
    typeof manifest.id === 'string' &&
    typeof manifest.name === 'string' &&
    typeof manifest.version === 'string' &&
    typeof manifest.description === 'string' &&
    Array.isArray(manifest.keywords) &&
    manifest.keywords.every((k) => typeof k === 'string') &&
    typeof manifest.entry === 'string'
  );
}
