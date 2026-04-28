import { SearchResult, PluginResult, ApplicationResult } from '../types/searchResult';
import { getPinyinInitials, getPinyinFull } from './pinyinSearch';
import { debugLog, debugTimer } from './debugLogger';
import { userBehaviorTracker } from './userBehavior';

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
  pinned?: boolean;         // 是否固定
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
    console.log('[SearchCache] Rebuilding index with', plugins.length, 'plugins and', applications.length, 'applications');
    
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
      } as PluginResult, plugin.keywords || [], plugin.pinned);
      this.index.set(item.id, item);
    });

    // 索引应用程序
    applications.forEach(app => {
      const item = this.createIndexItem(app);
      this.index.set(item.id, item);
    });

    endTimer();
    console.log('[SearchCache] Index rebuilt with', this.index.size, 'total items');
    debugLog('cacheStats', `Indexed ${this.index.size} items, cache cleared`);
  }

  /**
   * 创建索引项
   */
  private createIndexItem(result: SearchResult, keywords: string[] = [], pinned?: boolean): SearchIndexItem {
    const title = result.title;
    const titleLower = title.toLowerCase();
    const keywordsLower = keywords.map(k => k.toLowerCase());

    return {
      id: result.id,
      title,
      titleLower,
      titlePinyin: getPinyinFull(title),
      titleInitials: getPinyinInitials(title),
      keywords,
      keywordsLower,
      result,
      pinned,
    };
  }

  /**
   * 搜索（带缓存）
   */
  search(query: string): SearchResult[] {
    if (!query || !query.trim()) {
      // 空查询，返回所有结果（插件 + 应用）
      debugLog('searchTiming', 'Empty query, returning all indexed items');
      return this.getAllIndexedItems();
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
    const results: Array<{ result: SearchResult; score: number; pinned?: boolean }> = [];
    const pinnedItems: Array<{ result: SearchResult; score: number; pinned?: boolean }> = [];

    // 获取用户行为相关的结果ID
    const relatedHistoryIds = userBehaviorTracker.getRelatedHistory(query);
    const frequentIds = userBehaviorTracker.getFrequentResults(20);

    for (const item of this.index.values()) {
      const baseScore = this.calculateMatchScore(item, queryLower);
      
      // 有匹配分数的项目加入搜索结果
      if (baseScore > 0) {
        // 计算用户行为加分
        const behaviorBonus = this.calculateBehaviorBonus(item.id, query, relatedHistoryIds, frequentIds);
        const finalScore = baseScore + behaviorBonus;
        
        results.push({ result: item.result, score: finalScore, pinned: item.pinned });
      } else if (item.pinned) {
        // 没有匹配但固定的插件，放入待显示列表
        pinnedItems.push({ result: item.result, score: 0, pinned: true });
      }
    }

    // 按匹配度排序（分数高的在前）
    results.sort((a, b) => b.score - a.score);

    // 将固定但未匹配的插件追加到末尾
    const finalResults = [...results, ...pinnedItems];

    return finalResults.map(r => r.result);
  }

  /**
   * 计算用户行为加分
   */
  private calculateBehaviorBonus(
    itemId: string,
    _query: string,
    relatedHistoryIds: string[],
    frequentIds: string[]
  ): number {
    let bonus = 0;

    // 1. 历史相关加分（最高30分）
    const historyIndex = relatedHistoryIds.indexOf(itemId);
    if (historyIndex !== -1) {
      // 排名越靠前，加分越多
      const historyBonus = Math.max(0, 30 - historyIndex * 3);
      bonus += historyBonus;
      debugLog('cacheStats', `History bonus for ${itemId}: +${historyBonus}`);
    }

    // 2. 常用结果加分（最高20分）
    const frequentIndex = frequentIds.indexOf(itemId);
    if (frequentIndex !== -1) {
      const frequentBonus = Math.max(0, 20 - frequentIndex * 2);
      bonus += frequentBonus;
      debugLog('cacheStats', `Frequent bonus for ${itemId}: +${frequentBonus}`);
    }

    // 3. 偏好分数加成（最高15分）
    const preferenceScore = userBehaviorTracker.getPreferenceScore(itemId);
    if (preferenceScore > 0) {
      const preferenceBonus = Math.round(preferenceScore * 0.15); // 0-100 -> 0-15
      bonus += preferenceBonus;
      debugLog('cacheStats', `Preference bonus for ${itemId}: +${preferenceBonus}`);
    }

    return bonus;
  }

  /**
   * 计算匹配度分数
   * 分数越高表示匹配度越好
   */
  private calculateMatchScore(item: SearchIndexItem, queryLower: string): number {
    if (!queryLower) return 0;

    let score = 0;

    // 0. 关键词匹配 - 最高优先级 (120-150分)
    for (const keyword of item.keywordsLower) {
      if (keyword === queryLower) {
        // 完全匹配关键词 - 最高分
        return 150;
      }
      if (keyword.includes(queryLower)) {
        // 关键词包含查询 - 高分
        const matchBonus = Math.min(20, keyword.length - queryLower.length);
        score = Math.max(score, 130 + matchBonus);
      }
      if (this.isSubsequence(queryLower, keyword)) {
        // 子序列匹配关键词 - 中高分
        const gapScore = this.calculateGapScore(queryLower, keyword);
        score = Math.max(score, 110 + gapScore);
      }
    }

    // ✅ 如果关键词匹配成功，直接返回，不再进行其他匹配
    if (score > 0) {
      return score;
    }

    // 1. 直接包含匹配 - 最高分 (100分)
    if (item.titleLower.includes(queryLower)) {
      // 连续匹配的字符越多，分数越高
      const matchLength = queryLower.length;
      // ✅ 限制标题匹配的最高分为 99，确保低于关键词匹配
      score = Math.min(99, Math.max(score, 80 + matchLength));

      // 如果从开头开始匹配，额外加分
      if (item.titleLower.startsWith(queryLower)) {
        score = Math.min(99, score + 10);
      }

      // 如果是完整单词匹配，额外加分
      const words = item.titleLower.split(/\s+/);
      if (words.some(word => word === queryLower)) {
        score = Math.min(99, score + 9);
      }

      return score;
    }

    // 2. 单词首字母匹配 - 高分 (80-95分)
    if (this.matchesWordInitials(item.titleLower, queryLower)) {
      const initials = this.getWordInitials(item.titleLower);
      // 检查是否是连续的子序列
      const isConsecutive = this.isConsecutiveSubsequence(queryLower, initials);
      score = Math.max(score, isConsecutive ? 95 : 85);

      // 查询长度占首字母长度的比例越高，分数越高
      const ratio = queryLower.length / initials.length;
      score += ratio * 10;

      return score;
    }

    // 3. 子序列模糊匹配 - 中等分数 (60-80分)
    if (this.isSubsequence(queryLower, item.titleLower)) {
      // 计算匹配的紧密程度
      const gapScore = this.calculateGapScore(queryLower, item.titleLower);
      score = Math.max(score, 60 + gapScore);

      return score;
    }

    // 4. 拼音首字母匹配 - 中等分数 (50-70分)
    if (item.titleInitials.includes(queryLower) || this.isSubsequence(queryLower, item.titleInitials)) {
      const isConsecutive = item.titleInitials.includes(queryLower);
      score = Math.max(score, isConsecutive ? 70 : 55);

      return score;
    }

    // 5. 完整拼音匹配 - 较低分数 (40-60分)
    if (item.titlePinyin.includes(queryLower) || this.isSubsequence(queryLower, item.titlePinyin)) {
      const isConsecutive = item.titlePinyin.includes(queryLower);
      score = Math.max(score, isConsecutive ? 60 : 45);

      return score;
    }

    return 0;
  }

  /**
   * 获取单词首字母
   */
  private getWordInitials(text: string): string {
    const words = text.split(/\s+/);
    return words
        .map(word => word[0])
        .filter(char => char && /[a-z0-9]/.test(char))
        .join('');
  }

  /**
   * 检查是否是连续子序列
   */
  private isConsecutiveSubsequence(query: string, target: string): boolean {
    return target.includes(query);
  }

  /**
   * 计算间隙分数（匹配越紧密分数越高）
   * 返回 0-20 的分数
   */
  private calculateGapScore(query: string, target: string): number {
    let queryIndex = 0;
    let lastMatchIndex = -1;
    let totalGap = 0;
    let matches = 0;

    for (let i = 0; i < target.length && queryIndex < query.length; i++) {
      if (target[i] === query[queryIndex]) {
        if (lastMatchIndex !== -1) {
          totalGap += i - lastMatchIndex - 1;
        }
        lastMatchIndex = i;
        queryIndex++;
        matches++;
      }
    }

    if (matches === 0) return 0;

    // 平均间隙越小，分数越高
    const avgGap = totalGap / (matches - 1 || 1);
    const maxScore = 20;

    // 间隙为0时得满分，间隙越大分数越低
    return Math.max(0, maxScore - avgGap * 2);
  }

  /**
   * 检查是否匹配单词首字母
   * 例如: "goc" 匹配 "google chrome" (g-o-c)
   */
  private matchesWordInitials(text: string, query: string): boolean {
    if (!query) return true;

    // 提取所有单词的首字母
    const words = text.split(/\s+/);
    const initials = words
        .map(word => word[0])
        .filter(char => char && /[a-z0-9]/.test(char))
        .join('');

    // 检查查询是否是首字母的子序列
    return this.isSubsequence(query, initials);
  }

  /**
   * 检查 query 是否是 target 的子序列
   * 例如: "et" 是 "everything" 的子序列
   */
  private isSubsequence(query: string, target: string): boolean {
    let queryIndex = 0;
    let targetIndex = 0;

    while (queryIndex < query.length && targetIndex < target.length) {
      if (query[queryIndex] === target[targetIndex]) {
        queryIndex++;
      }
      targetIndex++;
    }

    return queryIndex === query.length;
  }

  /**
   * 获取所有索引项（默认显示）
   */
  private getAllIndexedItems(): SearchResult[] {
    const items: Array<{ result: SearchResult; pinned?: boolean }> = [];

    for (const item of this.index.values()) {
      items.push({ result: item.result, pinned: item.pinned });
    }

    // 固定的项目排在前面
    items.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

    return items.map(r => r.result);
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
   * 清除所有搜索缓存（当用户行为变化时调用）
   */
  clearSearchCache() {
    this.searchCache.clear();
    debugLog('cacheStats', 'Search cache cleared due to user behavior change');
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
