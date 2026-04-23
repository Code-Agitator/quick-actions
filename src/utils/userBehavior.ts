/**
 * 用户搜索行为统计
 * 记录用户的搜索习惯，用于优化搜索结果排序
 */

interface SearchHistoryItem {
  query: string;        // 搜索关键词
  selectedId: string;   // 用户选择的结果ID
  timestamp: number;    // 时间戳
  type: 'plugin' | 'app'; // 结果类型
}

interface UserPreference {
  id: string;           // 结果ID
  score: number;        // 偏好分数（基于选择频率和最近性）
  lastSelected: number; // 最后选择时间
  selectCount: number;  // 被选择次数
}

const SEARCH_HISTORY_KEY = 'quick-actions-search-history';
const USER_PREFERENCES_KEY = 'quick-actions-user-preferences';
const MAX_HISTORY_SIZE = 200; // 最多保存200条历史记录

export class UserBehaviorTracker {
  private history: SearchHistoryItem[] = [];
  private preferences: Map<string, UserPreference> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * 记录用户选择
   */
  recordSelection(query: string, resultId: string, type: 'plugin' | 'app') {
    const now = Date.now();
    
    // 添加到历史记录
    const historyItem: SearchHistoryItem = {
      query: query.toLowerCase().trim(),
      selectedId: resultId,
      timestamp: now,
      type,
    };
    
    this.history.unshift(historyItem);
    
    // 限制历史记录大小
    if (this.history.length > MAX_HISTORY_SIZE) {
      this.history = this.history.slice(0, MAX_HISTORY_SIZE);
    }
    
    // 更新用户偏好
    this.updatePreference(resultId, now);
    
    // 保存到 localStorage
    this.saveToStorage();
    
    // ✅ 发送事件通知搜索缓存已更新
    window.dispatchEvent(new CustomEvent('user-behavior-changed'));
    
    console.log('[UserBehavior] Recorded selection:', { query, resultId, type });
  }

  /**
   * 获取用户偏好分数
   * @param resultId 结果ID
   * @returns 偏好分数 (0-100)
   */
  getPreferenceScore(resultId: string): number {
    const pref = this.preferences.get(resultId);
    if (!pref) return 0;
    
    // 计算分数：基于选择次数和时间衰减
    const now = Date.now();
    const daysSinceLastSelect = (now - pref.lastSelected) / (1000 * 60 * 60 * 24);
    
    // 时间衰减因子（7天内无衰减，之后每天衰减5%）
    const timeDecay = daysSinceLastSelect <= 7 ? 1 : Math.max(0.1, 1 - (daysSinceLastSelect - 7) * 0.05);
    
    // 频率分数（最多50分）
    const frequencyScore = Math.min(50, pref.selectCount * 5);
    
    // 最近性分数（最多50分）
    const recencyScore = 50 * timeDecay;
    
    return Math.round(frequencyScore + recencyScore);
  }

  /**
   * 获取常用搜索结果（基于历史）
   * @param limit 返回数量
   */
  getFrequentResults(limit: number = 10): string[] {
    const sorted = Array.from(this.preferences.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    return sorted.map(p => p.id);
  }

  /**
   * 获取与当前查询相关的历史选择
   * @param query 当前查询
   * @returns 相关结果ID列表（按相关性排序）
   */
  getRelatedHistory(query: string): string[] {
    const queryLower = query.toLowerCase().trim();
    if (!queryLower) return [];
    
    // 查找历史中包含当前查询的记录
    const relatedHistory = this.history.filter(item => 
      item.query.includes(queryLower) || queryLower.includes(item.query)
    );
    
    // 统计每个结果的出现次数和最近时间
    const relevanceMap = new Map<string, { count: number; lastTime: number }>();
    
    relatedHistory.forEach(item => {
      const existing = relevanceMap.get(item.selectedId);
      if (existing) {
        existing.count++;
        existing.lastTime = Math.max(existing.lastTime, item.timestamp);
      } else {
        relevanceMap.set(item.selectedId, { count: 1, lastTime: item.timestamp });
      }
    });
    
    // 按相关性和时间排序
    const sorted = Array.from(relevanceMap.entries())
      .sort((a, b) => {
        // 先按出现次数
        if (b[1].count !== a[1].count) {
          return b[1].count - a[1].count;
        }
        // 再按最近时间
        return b[1].lastTime - a[1].lastTime;
      })
      .map(([id]) => id);
    
    return sorted;
  }

  /**
   * 清除历史记录
   */
  clearHistory() {
    this.history = [];
    this.preferences.clear();
    this.saveToStorage();
    console.log('[UserBehavior] History cleared');
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      historySize: this.history.length,
      preferencesCount: this.preferences.size,
      topPreferences: Array.from(this.preferences.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(p => ({
          id: p.id,
          score: p.score,
          selectCount: p.selectCount,
        })),
    };
  }

  /**
   * 从 localStorage 加载
   */
  private loadFromStorage() {
    try {
      // 加载历史记录
      const savedHistory = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (savedHistory) {
        this.history = JSON.parse(savedHistory);
      }
      
      // 加载用户偏好
      const savedPrefs = localStorage.getItem(USER_PREFERENCES_KEY);
      if (savedPrefs) {
        const prefsArray = JSON.parse(savedPrefs);
        this.preferences = new Map(prefsArray.map((p: UserPreference) => [p.id, p]));
      }
      
      console.log('[UserBehavior] Loaded from storage:', {
        history: this.history.length,
        preferences: this.preferences.size,
      });
    } catch (error) {
      console.error('[UserBehavior] Failed to load from storage:', error);
    }
  }

  /**
   * 保存到 localStorage
   */
  private saveToStorage() {
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(this.history));
      localStorage.setItem(
        USER_PREFERENCES_KEY,
        JSON.stringify(Array.from(this.preferences.values()))
      );
    } catch (error) {
      console.error('[UserBehavior] Failed to save to storage:', error);
    }
  }

  /**
   * 更新用户偏好
   */
  private updatePreference(resultId: string, timestamp: number) {
    const existing = this.preferences.get(resultId);
    
    if (existing) {
      existing.selectCount++;
      existing.lastSelected = timestamp;
      // 重新计算分数
      existing.score = this.calculatePreferenceScore(existing);
    } else {
      const newPref: UserPreference = {
        id: resultId,
        score: 10, // 初始分数
        lastSelected: timestamp,
        selectCount: 1,
      };
      newPref.score = this.calculatePreferenceScore(newPref);
      this.preferences.set(resultId, newPref);
    }
  }

  /**
   * 计算偏好分数
   */
  private calculatePreferenceScore(pref: UserPreference): number {
    const now = Date.now();
    const daysSinceLastSelect = (now - pref.lastSelected) / (1000 * 60 * 60 * 24);
    
    // 时间衰减因子
    const timeDecay = daysSinceLastSelect <= 7 ? 1 : Math.max(0.1, 1 - (daysSinceLastSelect - 7) * 0.05);
    
    // 频率分数（最多50分）
    const frequencyScore = Math.min(50, pref.selectCount * 5);
    
    // 最近性分数（最多50分）
    const recencyScore = 50 * timeDecay;
    
    return Math.round(frequencyScore + recencyScore);
  }
}

// 单例实例
export const userBehaviorTracker = new UserBehaviorTracker();
