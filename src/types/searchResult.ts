/**
 * 通用搜索结果类型
 */

export type SearchResultType = 'plugin' | 'application' | 'url' | 'file';

export interface BaseSearchResult {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  type: SearchResultType;
}

export interface PluginResult extends BaseSearchResult {
  type: 'plugin';
  pluginId: string;
  query: string;
}

export interface ApplicationResult extends BaseSearchResult {
  type: 'application';
  path: string;
  executable: string;
}

export interface UrlResult extends BaseSearchResult {
  type: 'url';
  url: string;
}

export interface FileResult extends BaseSearchResult {
  type: 'file';
  path: string;
}

export type SearchResult = PluginResult | ApplicationResult | UrlResult | FileResult;

/**
 * 创建插件搜索结果
 */
export function createPluginResult(
  pluginId: string,
  title: string,
  query: string,
  options?: Partial<Omit<PluginResult, 'type' | 'pluginId' | 'title' | 'query'>>
): PluginResult {
  return {
    id: `plugin-${pluginId}`,
    title,
    type: 'plugin',
    pluginId,
    query,
    ...options,
  };
}

/**
 * 创建应用程序搜索结果
 */
export function createApplicationResult(
  name: string,
  path: string,
  executable: string,
  options?: Partial<Omit<ApplicationResult, 'type' | 'title' | 'path' | 'executable'>>
): ApplicationResult {
  return {
    id: `app-${name}`,
    title: name,
    type: 'application',
    path,
    executable,
    ...options,
  };
}
