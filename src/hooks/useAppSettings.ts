import { useState, useEffect } from 'react';

export interface AppSettings {
  autoStart: boolean;
  theme: 'system' | 'light' | 'dark';
  language: 'zh-CN' | 'en-US';
  showTrayIcon: boolean;
  enableAnimations: boolean;
  windowOpacity: number; // 窗口透明度 (0.5 - 1.0)
  layoutDensity: 'compact' | 'comfortable'; // 布局密度
}

const DEFAULT_SETTINGS: AppSettings = {
  autoStart: false,
  theme: 'system',
  language: 'zh-CN',
  showTrayIcon: true,
  enableAnimations: true,
  windowOpacity: 0.98, // 默认 98% 不透明度
  layoutDensity: 'comfortable', // 默认宽松布局
};

const SETTINGS_KEY = 'quick-actions-settings';

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    // 从 localStorage 加载设置
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('[useAppSettings] Failed to load settings:', error);
    }
    return DEFAULT_SETTINGS;
  });

  // 保存设置到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      console.log('[useAppSettings] Settings saved:', settings);
    } catch (error) {
      console.error('[useAppSettings] Failed to save settings:', error);
    }
  }, [settings]);

  // 应用主题设置
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  // 应用动画设置
  useEffect(() => {
    applyAnimations(settings.enableAnimations);
  }, [settings.enableAnimations]);

  // 应用窗口透明度设置
  useEffect(() => {
    applyWindowOpacity(settings.windowOpacity);
  }, [settings.windowOpacity]);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(SETTINGS_KEY);
  };

  return {
    settings,
    updateSetting,
    resetSettings,
  };
}

// 应用主题
function applyTheme(theme: 'system' | 'light' | 'dark') {
  const root = document.documentElement;
  
  if (theme === 'system') {
    // 跟随系统主题
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
  
  console.log(`[Theme] Applied theme: ${theme}`);
}

// 应用动画设置
function applyAnimations(enabled: boolean) {
  const root = document.documentElement;
  
  if (enabled) {
    root.style.setProperty('--animation-enabled', '1');
    root.classList.remove('reduce-motion');
  } else {
    root.style.setProperty('--animation-enabled', '0');
    root.classList.add('reduce-motion');
  }
  
  console.log(`[Animations] Animations ${enabled ? 'enabled' : 'disabled'}`);
}

// 应用窗口透明度设置
function applyWindowOpacity(opacity: number) {
  const root = document.documentElement;
  
  // 限制透明度范围在 0.5 - 1.0 之间
  const clampedOpacity = Math.max(0.5, Math.min(1.0, opacity));
  
  // 设置 CSS 变量，用于控制毛玻璃背景的不透明度
  root.style.setProperty('--window-opacity', clampedOpacity.toString());
  
  console.log(`[Window Opacity] Set to ${(clampedOpacity * 100).toFixed(0)}%`);
}
