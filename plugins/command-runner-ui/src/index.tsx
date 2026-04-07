import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * Render the Command Runner plugin UI
 * @param options - Plugin options
 * @returns DOM element containing the plugin UI
 */
export function render({ query, onResult }: { query?: string; onResult?: (result: any) => void }) {
  // Create container
  const container = document.createElement('div');
  container.id = 'command-runner-ui-root';
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
  id: 'command-runner-ui',
  name: '命令执行器 (UI版)',
  version: '2.0.0',
  description: '功能完整的命令执行器，带历史记录和快速命令'
};

// Default export for compatibility
export default { render, metadata };
