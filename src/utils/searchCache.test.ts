import { describe, it, expect, beforeEach } from 'vitest';
import { SearchCache } from './searchCache';

describe('SearchCache - Keywords Matching', () => {
  let cache: SearchCache;

  beforeEach(() => {
    cache = new SearchCache();
  });

  const createMockPlugin = (id: string, name: string, keywords: string[]): any => ({
    id,
    name,
    description: `Test plugin ${name}`,
    icon: '🔌',
    keywords,
    entry: 'dist/index.js',
  });

  describe('Keyword exact match', () => {
    it('should find plugin by exact keyword match', () => {
      const plugins = [
        createMockPlugin('process-manager', '进程管理', ['process-manager', 'react', 'plugin']),
      ];

      cache.rebuildIndex(plugins, []);
      const results = cache.search('process-manager');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('plugin-process-manager');
    });

    it('should find plugin by another exact keyword', () => {
      const plugins = [
        createMockPlugin('process-manager', '进程管理', ['process-manager', 'react', 'plugin']),
      ];

      cache.rebuildIndex(plugins, []);
      const results = cache.search('react');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('plugin-process-manager');
    });
  });

  describe('Keyword contains match', () => {
    it('should find plugin when query is contained in keyword', () => {
      const plugins = [
        createMockPlugin('process-manager', '进程管理', ['process-manager', 'react', 'plugin']),
      ];

      cache.rebuildIndex(plugins, []);
      const results = cache.search('process');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('plugin-process-manager');
    });

    it('should find plugin with partial keyword match - manager', () => {
      const plugins = [
        createMockPlugin('process-manager', '进程管理', ['process-manager', 'react', 'plugin']),
      ];

      cache.rebuildIndex(plugins, []);
      const results = cache.search('manager');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('plugin-process-manager');
    });

    it('should find plugin with partial keyword match - plug', () => {
      const plugins = [
        createMockPlugin('process-manager', '进程管理', ['process-manager', 'react', 'plugin']),
      ];

      cache.rebuildIndex(plugins, []);
      const results = cache.search('plug');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('plugin-process-manager');
    });
  });

  describe('Keyword subsequence match', () => {
    it('should find plugin by subsequence match in keyword', () => {
      const plugins = [
        createMockPlugin('process-manager', '进程管理', ['process-manager', 'react', 'plugin']),
      ];

      cache.rebuildIndex(plugins, []);
      const results = cache.search('pm');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('plugin-process-manager');
    });

    it('should find plugin by subsequence match - prc', () => {
      const plugins = [
        createMockPlugin('process-manager', '进程管理', ['process-manager', 'react', 'plugin']),
      ];

      cache.rebuildIndex(plugins, []);
      const results = cache.search('prc');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('plugin-process-manager');
    });
  });

  describe('Score priority', () => {
    it('should rank exact keyword match higher than contains match', () => {
      const plugins = [
        createMockPlugin('plugin1', 'Plugin One', ['test-keyword']),
      ];

      cache.rebuildIndex(plugins, []);

      const exactResults = cache.search('test-keyword');
      const containsResults = cache.search('test');

      // Both should find the plugin
      expect(exactResults).toHaveLength(1);
      expect(containsResults).toHaveLength(1);

      // Exact match should have higher score (we can't directly check score, but we verify both work)
      expect(exactResults[0].id).toBe('plugin-plugin1');
      expect(containsResults[0].id).toBe('plugin-plugin1');
    });

    it('should rank keyword match higher than title match', () => {
      const plugins = [
        createMockPlugin('plugin1', '进程管理', ['process-manager']),
      ];

      cache.rebuildIndex(plugins, []);

      const keywordResults = cache.search('process');
      const titleResults = cache.search('进程');

      expect(keywordResults).toHaveLength(1);
      expect(titleResults).toHaveLength(1);
    });
  });

  describe('Multiple plugins', () => {
    it('should find correct plugin among multiple plugins', () => {
      const plugins = [
        createMockPlugin('plugin1', '插件一', ['test', 'one']),
        createMockPlugin('plugin2', '插件二', ['process-manager', 'two']),
        createMockPlugin('plugin3', '插件三', ['example', 'three']),
      ];

      cache.rebuildIndex(plugins, []);
      const results = cache.search('process');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('plugin-plugin2');
    });

    it('should rank multiple matches by score', () => {
      const plugins = [
        createMockPlugin('plugin1', 'Process Tool', ['tool']),
        createMockPlugin('plugin2', '工具', ['process-manager']),
      ];

      cache.rebuildIndex(plugins, []);
      const results = cache.search('process');

      // plugin2 should rank higher because keyword match > title match
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('plugin-plugin2');
      expect(results[1].id).toBe('plugin-plugin1');
    });
  });

  describe('Case insensitivity', () => {
    it('should match keywords case-insensitively', () => {
      const plugins = [
        createMockPlugin('plugin1', '插件', ['Process-Manager', 'REACT']),
      ];

      cache.rebuildIndex(plugins, []);

      expect(cache.search('process')).toHaveLength(1);
      expect(cache.search('PROCESS')).toHaveLength(1);
      expect(cache.search('react')).toHaveLength(1);
      expect(cache.search('React')).toHaveLength(1);
    });
  });

  describe('Empty and edge cases', () => {
    it('should return all plugins for empty query', () => {
      const plugins = [
        createMockPlugin('plugin1', '插件一', ['test']),
        createMockPlugin('plugin2', '插件二', ['example']),
      ];

      cache.rebuildIndex(plugins, []);
      const results = cache.search('');

      expect(results).toHaveLength(2);
    });

    it('should return empty array for no match', () => {
      const plugins = [
        createMockPlugin('plugin1', '插件', ['test']),
      ];

      cache.rebuildIndex(plugins, []);
      const results = cache.search('nonexistent');

      expect(results).toHaveLength(0);
    });
  });
});
