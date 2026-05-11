/**
 * 动态插件加载器
 * 
 * 提供动态import()加载插件ES模块的功能，包括：
 * - 模块缓存管理
 * - 加载超时控制
 * - 热更新支持
 * - 错误隔离
 * 
 * @module utils/dynamicLoader
 */

import { convertFileSrc } from '@tauri-apps/api/core';
import { invoke } from '@tauri-apps/api/core';

/**
 * 已加载插件的缓存条目
 */
interface LoadedPlugin {
  /** 插件模块对象 */
  module: any;
  /** 插件元数据 */
  manifest: any;
  /** 加载时间戳 */
  loadedAt: number;
  /** 入口路径 */
  entryPath: string;
}

/**
 * 插件加载选项
 */
interface LoadOptions {
  /** 加载超时时间（毫秒），默认5000ms */
  timeout?: number;
  /** 是否强制重新加载（忽略缓存） */
  forceReload?: boolean;
}

/**
 * 动态插件加载器类
 * 
 * 管理插件模块的动态加载、缓存和卸载。
 * 使用单例模式确保全局只有一个加载器实例。
 */
class DynamicPluginLoader {
  /** 插件模块缓存 */
  private cache: Map<string, LoadedPlugin> = new Map();

  /** 默认加载超时时间（5秒） */
  private readonly DEFAULT_TIMEOUT = 5000;

  /**
   * 加载插件模块
   * 
   * 通过动态import()加载插件的ES模块，支持缓存和超时控制。
   * 
   * @param pluginId - 插件唯一标识符
   * @param entryPath - 插件入口文件路径（相对于插件目录）
   * @param options - 加载选项
   * @returns 插件模块对象
   * @throws {Error} 当加载失败或超时时抛出错误
   * 
   * @example
   * ```typescript
   * const module = await pluginLoader.loadPlugin('my-plugin', 'dist/index.js');
   * ```
   */
  async loadPlugin(
    pluginId: string,
    entryPath: string,
    options: LoadOptions = {}
  ): Promise<any> {
    const { timeout = this.DEFAULT_TIMEOUT, forceReload = false } = options;

    // 检查缓存（除非强制重新加载）
    if (!forceReload && this.cache.has(pluginId)) {
      const cached = this.cache.get(pluginId)!;
      console.log(`♻️ Using cached plugin: ${pluginId} (loaded at ${new Date(cached.loadedAt).toLocaleTimeString()})`);
      return cached.module;
    }

    console.log(`📦 Loading plugin: ${pluginId} from ${entryPath}`);
    const startTime = Date.now();

    try {
      // 获取插件的实际路径
      const pluginBasePath = await invoke<string>('get_plugin_path', { id: pluginId });
      
      // 标准化路径（将反斜杠转换为正斜杠）
      const normalizedPath = pluginBasePath.replace(/\\/g, '/');
      const fullPath = `${normalizedPath}/${entryPath}`;
      
      // 转换为asset URL
      const assetUrl = convertFileSrc(fullPath);
      console.log(`Loading from asset URL: ${assetUrl}`);

      // 创建带超时的加载Promise
      const loadPromise = this.performImport(assetUrl);
      const timeoutPromise = this.createTimeout(timeout, pluginId);

      // 竞争执行
      const module = await Promise.race([loadPromise, timeoutPromise]);

      const loadTime = Date.now() - startTime;
      console.log(`✅ Plugin loaded successfully: ${pluginId} (${loadTime}ms)`);

      // 缓存模块
      const loadedPlugin: LoadedPlugin = {
        module,
        manifest: module.metadata || module.default?.metadata || {},
        loadedAt: Date.now(),
        entryPath
      };

      this.cache.set(pluginId, loadedPlugin);

      // 触发加载完成事件
      window.dispatchEvent(new CustomEvent('plugin-module-loaded', {
        detail: {
          pluginId,
          loadTime,
          hasExecute: typeof module.execute === 'function',
          hasRender: typeof module.render === 'function'
        }
      }));

      return module;
    } catch (error) {
      const loadTime = Date.now() - startTime;
      console.error(`❌ Failed to load plugin ${pluginId} after ${loadTime}ms:`, error);

      // 清除可能的部分缓存
      this.cache.delete(pluginId);

      // 触发加载失败事件
      window.dispatchEvent(new CustomEvent('plugin-module-load-error', {
        detail: {
          pluginId,
          error: error instanceof Error ? error.message : String(error),
          loadTime
        }
      }));

      throw error;
    }
  }

  /**
   * 执行实际的import操作
   * 
   * @param assetUrl - 资源的URL
   * @returns 导入的模块
   * @private
   */
  private async performImport(assetUrl: string): Promise<any> {
    // 使用动态import加载模块
    // @vite-ignore 告诉Vite不要分析这个import
    const module = await import(/* @vite-ignore */ assetUrl);
    
    // 返回模块的default导出或整个模块
    return module.default || module;
  }

  /**
   * 创建超时Promise
   * 
   * @param timeout - 超时时间（毫秒）
   * @param pluginId - 插件ID（用于错误消息）
   * @returns 会在超时时reject的Promise
   * @private
   */
  private createTimeout(timeout: number, pluginId: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Plugin ${pluginId} load timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * 卸载插件模块
   * 
   * 从缓存中移除插件模块，释放内存。
   * 
   * @param pluginId - 要卸载的插件ID
   * 
   * @example
   * ```typescript
   * pluginLoader.unloadPlugin('my-plugin');
   * ```
   */
  unloadPlugin(pluginId: string): void {
    const existed = this.cache.delete(pluginId);
    
    if (existed) {
      console.log(`🗑️ Plugin unloaded: ${pluginId}`);
      
      // 触发卸载事件
      window.dispatchEvent(new CustomEvent('plugin-module-unloaded', {
        detail: { pluginId }
      }));
    } else {
      console.warn(`⚠️ Plugin not found in cache: ${pluginId}`);
    }
  }

  /**
   * 重新加载插件
   * 
   * 先卸载旧版本，然后强制重新加载。
   * 用于开发模式下的热更新。
   * 
   * @param pluginId - 插件ID
   * @param entryPath - 入口文件路径
   * @param options - 加载选项
   * @returns 重新加载后的模块
   * 
   * @example
   * ```typescript
   * const newModule = await pluginLoader.reloadPlugin('my-plugin', 'dist/index.js');
   * ```
   */
  async reloadPlugin(
    pluginId: string,
    entryPath: string,
    options: LoadOptions = {}
  ): Promise<any> {
    console.log(`🔄 Reloading plugin: ${pluginId}`);
    
    // 先卸载
    this.unloadPlugin(pluginId);
    
    // 强制重新加载
    return this.loadPlugin(pluginId, entryPath, {
      ...options,
      forceReload: true
    });
  }

  /**
   * 清除所有缓存
   * 
   * 卸载所有已加载的插件模块。
   * 通常在应用关闭或重置时使用。
   */
  clearCache(): void {
    const count = this.cache.size;
    
    if (count > 0) {
      console.log(`🧹 Clearing plugin cache (${count} plugins)`);
      
      // 为每个插件触发卸载事件
      this.cache.forEach((_, pluginId) => {
        window.dispatchEvent(new CustomEvent('plugin-module-unloaded', {
          detail: { pluginId }
        }));
      });
      
      this.cache.clear();
      
      console.log('✨ Cache cleared');
    }
  }

  /**
   * 获取已加载的插件列表
   * 
   * @returns 已加载插件的信息数组
   * 
   * @example
   * ```typescript
   * const loaded = pluginLoader.getLoadedPlugins();
   * console.log(loaded.map(p => p.pluginId));
   * ```
   */
  getLoadedPlugins(): Array<{
    pluginId: string;
    loadedAt: number;
    entryPath: string;
    hasExecute: boolean;
    hasRender: boolean;
  }> {
    const result: Array<{
      pluginId: string;
      loadedAt: number;
      entryPath: string;
      hasExecute: boolean;
      hasRender: boolean;
    }> = [];

    this.cache.forEach((loaded, pluginId) => {
      result.push({
        pluginId,
        loadedAt: loaded.loadedAt,
        entryPath: loaded.entryPath,
        hasExecute: typeof loaded.module.execute === 'function',
        hasRender: typeof loaded.module.render === 'function'
      });
    });

    return result;
  }

  /**
   * 检查插件是否已加载
   * 
   * @param pluginId - 插件ID
   * @returns 是否已加载
   */
  isLoaded(pluginId: string): boolean {
    return this.cache.has(pluginId);
  }

  /**
   * 获取插件的加载时间
   * 
   * @param pluginId - 插件ID
   * @returns 加载时间戳，如果未加载则返回null
   */
  getLoadTime(pluginId: string): number | null {
    const cached = this.cache.get(pluginId);
    return cached ? cached.loadedAt : null;
  }

  /**
   * 获取缓存统计信息
   * 
   * @returns 缓存统计信息
   */
  getCacheStats(): {
    size: number;
    pluginIds: string[];
  } {
    return {
      size: this.cache.size,
      pluginIds: Array.from(this.cache.keys())
    };
  }
}

/**
 * 全局插件加载器实例（单例）
 * 
 * 在整个应用中共享同一个加载器实例，确保缓存一致性。
 * 
 * @example
 * ```typescript
 * import { pluginLoader } from '../utils/dynamicLoader';
 * 
 * const module = await pluginLoader.loadPlugin('my-plugin', 'dist/index.js');
 * ```
 */
export const pluginLoader = new DynamicPluginLoader();

/**
 * 便捷函数：带重试机制的插件加载
 * 
 * 在加载失败时自动重试指定次数。
 * 
 * @param pluginId - 插件ID
 * @param entryPath - 入口路径
 * @param maxRetries - 最大重试次数（默认3次）
 * @param retryDelay - 重试间隔（毫秒，默认1000ms）
 * @param options - 加载选项
 * @returns 插件模块
 * @throws {Error} 当所有重试都失败时抛出最后一次错误
 * 
 * @example
 * ```typescript
 * const module = await loadPluginWithRetry('my-plugin', 'dist/index.js', 3, 1000);
 * ```
 */
export async function loadPluginWithRetry(
  pluginId: string,
  entryPath: string,
  maxRetries: number = 3,
  retryDelay: number = 1000,
  options: LoadOptions = {}
): Promise<any> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries} to load plugin: ${pluginId}`);
      return await pluginLoader.loadPlugin(pluginId, entryPath, options);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`⚠️ Attempt ${attempt} failed:`, lastError.message);

      // 如果不是最后一次尝试，等待后重试
      if (attempt < maxRetries) {
        console.log(`⏳ Waiting ${retryDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  // 所有重试都失败了
  throw new Error(
    `Failed to load plugin ${pluginId} after ${maxRetries} attempts. Last error: ${lastError?.message}`
  );
}

export default pluginLoader;
