import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import type { PluginModule, PluginResult, PluginAPI } from './types/plugin';

/**
 * Render the plugin UI
 * @param options - Plugin options including search query and result callback
 */
export function render({ query, onResult }: { query?: string; onResult?: (result: PluginResult) => void }) {
  const container = document.createElement('div');
  container.id = 'uuid-generator-root';
  container.className = 'plugin-container h-full w-full';
  
  const root = ReactDOM.createRoot(container);
  root.render(<App query={query} onResult={onResult} />);
  
  return container;
}

/**
 * Optional: Handle search queries directly without UI
 * @param query - The user's search input
 * @param api - The secure plugin API instance
 */
export async function execute(query: string, api: PluginAPI): Promise<PluginResult[]> {
  // Generate UUID v4
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Format UUID based on query keywords
  const formatUUID = (uuid: string, query: string): { formatted: string; label: string } => {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('upper') || queryLower.includes('大写')) {
      if (queryLower.includes('no-dash') || queryLower.includes('无横杠')) {
        return { formatted: uuid.replace(/-/g, '').toUpperCase(), label: '大写无横杠' };
      }
      return { formatted: uuid.toUpperCase(), label: '大写' };
    }
    
    if (queryLower.includes('no-dash') || queryLower.includes('无横杠')) {
      return { formatted: uuid.replace(/-/g, ''), label: '无横杠' };
    }
    
    return { formatted: uuid, label: '标准' };
  };

  const uuid = generateUUID();
  const { formatted, label } = formatUUID(uuid, query);
  
  // 只返回一个结果：直接生成并复制 UUID
  return [
    {
      title: `生成 ${label} UUID: ${formatted}`,
      description: `点击复制到剪贴板 (${label})`,
      icon: '🔑',
      action: async () => {
        if (api?.clipboard) {
          await api.clipboard.writeText(formatted);
        }
      }
    }
  ];
}

export const metadata = {
  id: 'uuid-generator',
  name: 'UUID 生成器',
  version: '1.0.0',
  description: '快速生成和复制 UUID v4'
};

export default { render, execute, metadata };
