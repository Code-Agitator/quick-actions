import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import type { PluginModule, PluginResult, PluginAPI } from './types/plugin';

/**
 * Render the plugin UI
 */
export function render() {
  const container = document.createElement('div');
  container.id = 'clipboard-manager-root';
  container.className = 'plugin-container h-full w-full';
  
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
  
  return container;
}

/**
 * Execute search logic (optional)
 */
export async function execute(query: string, api: PluginAPI): Promise<PluginResult[]> {
  return [
    {
      title: '打开剪贴板管理器',
      description: '查看和管理您的剪贴板历史记录',
      icon: '📋',
      customUI: { render }, // 触发 UI 渲染
      action: () => {}
    }
  ];
}

export const metadata = {
  id: 'clipboard-manager',
  name: '剪贴板管理器',
  version: '1.0.0',
  description: '智能记录并管理您的剪贴板历史，支持去重和快速搜索'
};

export default { render, execute, metadata };
