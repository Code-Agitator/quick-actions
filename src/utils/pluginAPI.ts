import { invoke } from '@tauri-apps/api/core';

export interface PluginAPI {
  fs: {
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<void>;
    listDir: (path: string) => Promise<string[]>;
  };
  shell: {
    execute: (command: string, args: string[]) => Promise<string>;
  };
  notification: {
    show: (title: string, body: string) => Promise<void>;
  };
  clipboard: {
    writeText: (text: string) => Promise<void>;
    readText: () => Promise<string>;
  };
}

export function createPluginAPI(pluginId: string): PluginAPI {
  return {
    fs: {
      readFile: async (path: string) => {
        return invoke<string>('plugin_read_file', { pluginId, path });
      },
      writeFile: async (path: string, content: string) => {
        return invoke('plugin_write_file', { pluginId, path, content });
      },
      listDir: async (path: string) => {
        return invoke<string[]>('plugin_list_dir', { pluginId, path });
      },
    },
    shell: {
      execute: async (command: string, args: string[]) => {
        return invoke<string>('plugin_execute_command', {
          pluginId,
          command,
          args
        });
      },
    },
    notification: {
      show: async (title: string, body: string) => {
        return invoke('plugin_show_notification', { pluginId, title, body });
      },
    },
    clipboard: {
      writeText: async (text: string) => {
        await navigator.clipboard.writeText(text);
      },
      readText: async () => {
        return navigator.clipboard.readText();
      },
    },
  };
}
