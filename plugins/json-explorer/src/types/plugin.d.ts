/**
 * Quick Actions Plugin API Types
 * 
 * This file provides robust type inference for the plugin environment.
 */

export interface PluginAPI {
  fs: {
    /** Read file content from allowed paths */
    readFile: (path: string) => Promise<string>;
    /** Write content to a file in allowed paths */
    writeFile: (path: string, content: string) => Promise<void>;
    /** List directory contents */
    listDir: (path: string) => Promise<string[]>;
  };
  shell: {
    /** Execute a system command with arguments */
    execute: (command: string, args?: string[]) => Promise<string>;
  };
  notification: {
    /** Show a system notification */
    show: (title: string, body: string) => Promise<void>;
  };
  clipboard: {
    /** Write text to clipboard */
    writeText: (text: string) => Promise<void>;
    /** Read text from clipboard */
    readText: () => Promise<string>;
  };
}

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  icon?: string;
  keywords?: string[];
}

export interface PluginResult {
  title: string;
  description?: string;
  icon?: string;
  action?: () => void | Promise<void>;
  customUI?: any; // For React components
}

export interface PluginModule {
  metadata: PluginMetadata;
  render?: (options: { query?: string; onResult?: (result: PluginResult) => void }) => HTMLElement;
  execute?: (query: string, api: PluginAPI) => Promise<PluginResult[]>;
}
