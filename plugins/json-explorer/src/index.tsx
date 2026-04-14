import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import type { PluginModule, PluginResult, PluginAPI } from './types/plugin';

/**
 * Render the JSON Explorer plugin UI
 * @param options - Plugin options including search query and result callback
 */
export function render({ query, onResult }: { query?: string; onResult?: (result: PluginResult) => void }) {
  const container = document.createElement('div');
  container.id = 'json-explorer-root';
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
  // Try to parse as JSON
  try {
    const parsed = JSON.parse(query);
    return [
      {
        title: 'JSON Explorer',
        description: `Valid JSON detected - ${typeof parsed === 'object' ? Object.keys(parsed).length : 1} root keys`,
        icon: '📋',
        action: () => {
          console.log('Opening JSON Explorer...');
        }
      }
    ];
  } catch {
    return [
      {
        title: 'JSON Explorer',
        description: 'Paste JSON to explore, format, and navigate',
        icon: '📋',
        action: () => {
          console.log('Opening JSON Explorer...');
        }
      }
    ];
  }
}

export const metadata = {
  id: 'json-explorer',
  name: 'JSON Explorer',
  version: '1.0.0',
  description: 'Modern JSON viewer with formatting, path access, and tree visualization'
};

export default { render, execute, metadata };
