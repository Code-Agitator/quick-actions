/**
 * 应用常量定义
 */

// LocalStorage Keys
export const LOCAL_STORAGE_KEYS = {
  SETTINGS: 'quick-actions-settings',
  SEARCH_HISTORY: 'quick-actions-search-history',
  USER_PREFERENCES: 'quick-actions-user-preferences',
  PLUGIN_PINNED: 'quick-actions-plugin-pinned',
} as const;

// Window Sizes
export const WINDOW_SIZES = {
  COLLAPSED_HEIGHT: 64,
  EXPANDED_HEIGHT: 480,
  SETTINGS_HEIGHT: 600,
} as const;

// Default Values
export const DEFAULT_SETTINGS = {
  theme: 'system' as const,
  layoutDensity: 'comfortable' as const,
  windowOpacity: 0.98,
  globalShortcut: 'Ctrl+Space',
  autoStart: false,
  showTrayIcon: true,
  syncWithSystemTheme: false,
  language: 'zh-CN' as const,
} as const;
