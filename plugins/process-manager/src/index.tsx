import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css'; // 导入自定义样式
import type { PluginModule, PluginResult, PluginAPI } from './types/plugin';

/**
 * Render the plugin UI
 * @param options - Plugin options including search query and result callback
 */
export function render({ query, onResult }: { query?: string; onResult?: (result: PluginResult) => void }) {
  const container = document.createElement('div');
  container.id = 'process-manager-new-root';
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
  // Example: Return a simple result
  return [
    {
      title: 'Hello process-manager-new',
      description: `You searched for: ${query}`,
      icon: '✨',
      action: () => {
        console.log('Action triggered!');
      }
    }
  ];
}

export const metadata = {
  id: 'process-manager',
  name: '进程管理',
  version: '1.0.0',
  description: 'A standalone React plugin for Quick Actions'
};

export default { render, execute, metadata };
