/**
 * 插件安全 API - ACTIONS 对象
 * 
 * 这个对象提供给插件使用，封装了 Tauri API，只提供安全的功能
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * 通知 API
 */
interface NotificationAPI {
  /**
   * 显示通知
   * @param title 标题
   * @param body 内容
   */
  show: (title: string, body: string) => Promise<void>;
}

/**
 * 剪贴板 API
 */
interface ClipboardAPI {
  /**
   * 写入文本到剪贴板
   * @param text 要复制的文本
   */
  writeText: (text: string) => Promise<void>;
  
  /**
   * 从剪贴板读取文本
   */
  readText: () => Promise<string>;
}

/**
 * 文件系统 API（受限）
 */
interface FileSystemAPI {
  /**
   * 列出目录内容
   * @param path 目录路径
   */
  listDir: (path: string) => Promise<any[]>;
  
  /**
   * 获取文件信息
   * @param path 文件路径
   */
  getInfo: (path: string) => Promise<any>;
  
  /**
   * 搜索文件
   * @param path 搜索路径
   * @param query 搜索关键词
   * @param maxResults 最大结果数
   */
  searchFiles: (path: string, query: string, maxResults?: number) => Promise<any[]>;
}

/**
 * Shell API（受限的命令执行）
 */
interface ShellAPI {
  /**
   * 执行命令
   * @param command 命令
   * @param args 参数
   */
  execute: (command: string, args: string[]) => Promise<string>;
}

/**
 * 配置 API
 */
interface ConfigAPI {
  /**
   * 保存配置
   * @param key 配置键
   * @param value 配置值
   */
  set: (key: string, value: any) => Promise<void>;
  
  /**
   * 加载配置
   * @param key 配置键
   */
  get: (key: string) => Promise<any>;
  
  /**
   * 删除配置
   * @param key 配置键
   */
  remove: (key: string) => Promise<void>;
}

/**
 * 工具 API
 */
interface UtilsAPI {
  /**
   * 格式化文件大小
   * @param bytes 字节数
   */
  formatFileSize: (bytes: number) => string;
  
  /**
   * 格式化日期
   * @param date 日期对象或时间戳
   * @param format 格式字符串（可选）
   */
  formatDate: (date: Date | number, format?: string) => string;
}

/**
 * HTTP API
 */
interface HTTPAPI {
  /**
   * 发送 GET 请求
   * @param url 请求 URL
   * @param options 请求选项
   */
  get: (url: string, options?: HTTPRequestOptions) => Promise<HTTPResponse>;
  
  /**
   * 发送 POST 请求
   * @param url 请求 URL
   * @param data 请求数据
   * @param options 请求选项
   */
  post: (url: string, data?: any, options?: HTTPRequestOptions) => Promise<HTTPResponse>;
}

/**
 * HTTP 请求选项
 */
interface HTTPRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * HTTP 响应
 */
interface HTTPResponse {
  status: number;
  statusText: string;
  data: any;
  headers: Record<string, string>;
}
interface UtilsAPI {
  /**
   * 格式化日期
   * @param date 日期对象或时间戳
   * @param format 格式字符串（可选）
   */
  formatDate: (date: Date | number, format?: string) => string;
  
  /**
   * 防抖函数
   * @param fn 要防抖的函数
   * @param delay 延迟时间（毫秒）
   */
  debounce: <F extends (...args: any[]) => any>(fn: F, delay: number) => ((...args: Parameters<F>) => void);
  
  /**
   * 节流函数
   * @param fn 要节流的函数
   * @param limit 限制时间（毫秒）
   */
  throttle: <F extends (...args: any[]) => any>(fn: F, limit: number) => ((...args: Parameters<F>) => void);
  
  /**
   * 深拷贝
   * @param obj 要拷贝的对象
   */
  deepClone: <T>(obj: T) => T;
  
  /**
   * 生成唯一 ID
   */
  generateId: () => string;
}

/**
 * 本地存储 API
 */
interface StorageAPI {
  /**
   * 获取数据
   * @param key 键名
   */
  get: (key: string) => any;
  
  /**
   * 设置数据
   * @param key 键名
   * @param value 值
   */
  set: (key: string, value: any) => void;
  
  /**
   * 删除数据
   * @param key 键名
   */
  remove: (key: string) => void;
  
  /**
   * 清空所有数据
   */
  clear: () => void;
}

/**
 * 插件元数据
 */
interface PluginMetadata {
  id: string;
  name: string;
  version: string;
}

/**
 * ACTIONS API - 插件可用的所有功能
 */
export interface ActionsAPI {
  /**
   * 插件元数据
   */
  plugin: PluginMetadata;
  
  /**
   * 通知功能
   */
  notification: NotificationAPI;
  
  /**
   * 剪贴板功能
   */
  clipboard: ClipboardAPI;
  
  /**
   * 文件系统功能（受限）
   */
  fs: FileSystemAPI;
  
  /**
   * Shell 命令执行（受限）
   */
  shell: ShellAPI;
  
  /**
   * HTTP 请求
   */
  http: HTTPAPI;
  
  /**
   * 配置管理
   */
  config: ConfigAPI;
  
  /**
   * 实用工具
   */
  utils: UtilsAPI;
  
  /**
   * 本地存储
   */
  storage: StorageAPI;
}

/**
 * 创建 ACTIONS API 实例
 * @param pluginId 插件 ID
 */
export function createActionsAPI(pluginId: string): ActionsAPI {
  return {
    plugin: {
      id: pluginId,
      name: '', // 将在使用时填充
      version: ''
    },
    
    notification: {
      show: async (title: string, body: string) => {
        try {
          await invoke('plugin_show_notification', {
            pluginId,
            title,
            body
          });
        } catch (error) {
          console.error('[ACTIONS] Notification failed:', error);
          throw error;
        }
      }
    },
    
    clipboard: {
      writeText: async (text: string) => {
        try {
          await navigator.clipboard.writeText(text);
        } catch (error) {
          console.error('[ACTIONS] Clipboard write failed:', error);
          throw error;
        }
      },
      
      readText: async () => {
        try {
          return await navigator.clipboard.readText();
        } catch (error) {
          console.error('[ACTIONS] Clipboard read failed:', error);
          throw error;
        }
      }
    },
    
    fs: {
      listDir: async (path: string) => {
        try {
          return await invoke('plugin_list_dir', {
            pluginId,
            path
          });
        } catch (error) {
          console.error('[ACTIONS] List directory failed:', error);
          throw error;
        }
      },
      
      getInfo: async (path: string) => {
        try {
          return await invoke('plugin_get_file_info', {
            pluginId,
            path
          });
        } catch (error) {
          console.error('[ACTIONS] Get file info failed:', error);
          throw error;
        }
      },
      
      searchFiles: async (path: string, query: string, maxResults: number = 100) => {
        try {
          return await invoke('plugin_search_files', {
            pluginId,
            path,
            query,
            maxResults
          });
        } catch (error) {
          console.error('[ACTIONS] Search files failed:', error);
          throw error;
        }
      }
    },
    
    shell: {
      execute: async (command: string, args: string[]) => {
        try {
          return await invoke('plugin_execute_command', {
            pluginId,
            command,
            args
          });
        } catch (error) {
          console.error('[ACTIONS] Execute command failed:', error);
          throw error;
        }
      }
    },
    
    http: {
      get: async (url: string, options?: HTTPRequestOptions) => {
        try {
          const result = await invoke<any>('plugin_http_request', {
            pluginId,
            method: 'GET',
            url,
            headers: options?.headers,
            body: null,
            timeout: options?.timeout
          });
          return result as HTTPResponse;
        } catch (error) {
          console.error('[ACTIONS] HTTP GET failed:', error);
          throw error;
        }
      },
      
      post: async (url: string, data?: any, options?: HTTPRequestOptions) => {
        try {
          const result = await invoke<any>('plugin_http_request', {
            pluginId,
            method: 'POST',
            url,
            headers: options?.headers,
            body: data ? JSON.stringify(data) : null,
            timeout: options?.timeout
          });
          return result as HTTPResponse;
        } catch (error) {
          console.error('[ACTIONS] HTTP POST failed:', error);
          throw error;
        }
      }
    },
    
    config: {
      set: async (key: string, value: any) => {
        try {
          await invoke('plugin_save_config', {
            pluginId,
            key,
            value
          });
        } catch (error) {
          console.error('[ACTIONS] Save config failed:', error);
          throw error;
        }
      },
      
      get: async (key: string) => {
        try {
          return await invoke('plugin_load_config', {
            pluginId,
            key
          });
        } catch (error) {
          console.error('[ACTIONS] Load config failed:', error);
          throw error;
        }
      },
      
      remove: async (key: string) => {
        try {
          await invoke('plugin_remove_config', {
            pluginId,
            key
          });
        } catch (error) {
          console.error('[ACTIONS] Remove config failed:', error);
          throw error;
        }
      }
    },
    
    utils: {
      formatFileSize: (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      },
      
      formatDate: (date: Date | number, format?: string) => {
        const d = typeof date === 'number' ? new Date(date) : date;
        
        if (format === 'timestamp') {
          return d.getTime().toString();
        }
        
        return d.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      },
      
      debounce: <F extends (...args: any[]) => any>(fn: F, delay: number) => {
        let timer: ReturnType<typeof setTimeout>;
        return (...args: Parameters<F>) => {
          clearTimeout(timer);
          timer = setTimeout(() => fn(...args), delay);
        };
      },
      
      throttle: <F extends (...args: any[]) => any>(fn: F, limit: number) => {
        let inThrottle: boolean;
        return (...args: Parameters<F>) => {
          if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
          }
        };
      },
      
      deepClone: <T,>(obj: T): T => {
        return JSON.parse(JSON.stringify(obj));
      },
      
      generateId: () => {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
    },
    
    storage: {
      get: (key: string) => {
        try {
          const data = localStorage.getItem(`plugin_${pluginId}_${key}`);
          return data ? JSON.parse(data) : null;
        } catch {
          return null;
        }
      },
      
      set: (key: string, value: any) => {
        localStorage.setItem(`plugin_${pluginId}_${key}`, JSON.stringify(value));
      },
      
      remove: (key: string) => {
        localStorage.removeItem(`plugin_${pluginId}_${key}`);
      },
      
      clear: () => {
        // 只清除当前插件的数据
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(`plugin_${pluginId}_`)) {
            localStorage.removeItem(key);
          }
        });
      }
    }
  };
}
