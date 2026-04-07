export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  icon?: string;
  keywords: string[];
  entry: string;
  entry_type?: 'js' | 'html' | 'esm';
  permissions?: string[];
  execute?: (query: string) => Promise<PluginResult[]>;
}

export interface PluginResult {
  title: string;
  description?: string;
  icon?: string;
  action: () => void | Promise<void>;
  customUI?: any; // 用于传递自定义 UI 模块
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  icon?: string;
  keywords: string[];
  entry: string;
  entry_type?: 'js' | 'html' | 'esm';
  permissions?: string[];
}
