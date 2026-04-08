import { SearchResult, PluginResult, ApplicationResult } from '../types/searchResult';
import { getPinyinInitials, getPinyinFull } from './pinyinSearch';
import { debugLog, debugTimer } from './debugLogger';

/**
 * 搜索索引项
 */
interface SearchIndexItem {
  id: string;
  title: string;
  titleLower: string;
  titlePinyin: string;      // 完整拼音
  titleInitials: string;    // 首字母
  keywords: string[];
  keywordsLower: string[];
  result: SearchResult;
}

/**
 * 搜索缓存管理器
 */
export class SearchCache {
  private index: Map<string, SearchIndexItem> = new Map();
  private searchCache: Map<string, SearchResult[]> = new Map();
  private maxCacheSize = 100; // 最多缓存100个搜索结果

  /**
   * 重建索引（应用启动或数据变化时调用）
   */
  rebuildIndex(plugins: any[], applications: ApplicationResult[]) {
    const endTimer = debugTimer('searchTiming', 'Rebuild index');
    this.index.clear();
    this.searchCache.clear();

    // 索引插件
    plugins.forEach(plugin => {
      const item = this.createIndexItem({
        id: `plugin-${plugin.id}`,
        title: plugin.name,
        description: plugin.description,
        icon: plugin.icon,
        type: 'plugin',
        pluginId: plugin.id,
        query: '',
      } as PluginResult);
      this.index.set(item.id, item);
    });

    // 索引应用程序
    applications.forEach(app => {
      const item = this.createIndexItem(app);
      this.index.set(item.id, item);
    });

    endTimer();
    debugLog('cacheStats', `Indexed ${this.index.size} items, cache cleared`);
  }

  /**
   * 创建索引项
   */
  private createIndexItem(result: SearchResult): SearchIndexItem {
    const title = result.title;
    const titleLower = title.toLowerCase();
    
    return {
      id: result.id,
      title,
      titleLower,
      titlePinyin: getPinyinFull(title),
      titleInitials: getPinyinInitials(title),
      keywords: [],
      keywordsLower: [],
      result,
    };
  }

  /**
   * 搜索（带缓存）
   */
  search(query: string): SearchResult[] {
    if (!query || !query.trim()) {
      // 空查询，返回所有插件
      debugLog('searchTiming', 'Empty query, returning all plugins');
      return this.getAllPlugins();
    }

    // 检查缓存
    const cached = this.searchCache.get(query);
    if (cached) {
      debugLog('cacheStats', `Cache hit for query: "${query}" (${cached.length} results)`);
      return cached;
    }

    debugLog('cacheStats', `Cache miss for query: "${query}"`);
    
    // 执行搜索
    const results = this.performSearch(query);

    // 缓存结果
    this.cacheResult(query, results);

    return results;
  }

  /**
   * 执行搜索
   */
  private performSearch(query: string): SearchResult[] {
    const queryLower = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const item of this.index.values()) {
      if (this.matches(item, queryLower)) {
        results.push(item.result);
      }
    }

    return results;
  }

  /**
   * 匹配检查
   */
  private matches(item: SearchIndexItem, queryLower: string): boolean {
    // 标题直接匹配
    if (item.titleLower.includes(queryLower)) {
      return true;
    }

    // 拼音首字母匹配
    if (item.titleInitials.includes(queryLower)) {
      return true;
    }

    // 完整拼音匹配
    if (item.titlePinyin.includes(queryLower)) {
      return true;
    }

    return false;
  }

  /**
   * 获取所有插件（默认显示）
   */
  private getAllPlugins(): SearchResult[] {
    const plugins: SearchResult[] = [];
    
    for (const item of this.index.values()) {
      if (item.result.type === 'plugin') {
        plugins.push(item.result);
      }
    }
    
    return plugins;
  }

  /**
   * 缓存搜索结果
   */
  private cacheResult(query: string, results: SearchResult[]) {
    // LRU 策略：如果缓存满了，删除最旧的
    if (this.searchCache.size >= this.maxCacheSize) {
      const firstKey = this.searchCache.keys().next().value;
      if (firstKey) {
        this.searchCache.delete(firstKey);
      }
    }

    this.searchCache.set(query, results);
  }

  /**
   * 清除缓存
   */
  clear() {
    this.index.clear();
    this.searchCache.clear();
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      indexedItems: this.index.size,
      cachedQueries: this.searchCache.size,
    };
  }
}

// 单例实例
export const searchCache = new SearchCache();
