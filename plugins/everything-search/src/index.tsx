import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * Render the Everything Search plugin UI
 * @param options - Plugin options
 * @returns DOM element containing the plugin UI
 */
export function render({ query, onResult }: { query?: string; onResult?: (result: any) => void }) {
  // Create container
  const container = document.createElement('div');
  container.id = 'everything-search-root';
  container.className = 'plugin-container';
  
  // Render React component
  const root = ReactDOM.createRoot(container);
  root.render(<App query={query} onResult={onResult} />);
  
  return container;
}

/**
 * Plugin metadata
 */
export const metadata = {
  id: 'everything-search',
  name: 'Everything 搜索',
  version: '1.0.0',
  description: '通过 Everything 快速搜索本地文件'
};

// Default export for compatibility
export default { render, metadata };
