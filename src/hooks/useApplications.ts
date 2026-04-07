import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ApplicationResult, createApplicationResult } from '../types/searchResult';

// 常见应用程序的图标映射
const APP_ICON_MAP: Record<string, string> = {
  // 浏览器
  'chrome': '🌐',
  'firefox': '🦊',
  'edge': '🌊',
  'brave': '🦁',
  
  // 开发工具
  'code': '💻',
  'visual studio': '💻',
  'vscode': '💻',
  'webstorm': '💻',
  'sublime': '💻',
  'notepad': '📝',
  
  // Office
  'word': '📘',
  'excel': '📗',
  'powerpoint': '📙',
  'ppt': '📙',
  'outlook': '📧',
  
  // 通讯
  'wechat': '💬',
  '微信': '💬',
  'qq': '💬',
  '钉钉': '📌',
  'telegram': '✈️',
  'slack': '💬',
  
  // 媒体
  'vlc': '🎬',
  'spotify': '🎵',
  '网易云音乐': '🎵',
  'qq音乐': '🎵',
  'potplayer': '🎬',
  
  // 工具
  'git': '🔀',
  'github': '🐙',
  'docker': '🐳',
  'terminal': '⌨️',
  'cmd': '⌨️',
  'powershell': '⌨️',
  'calculator': '🧮',
  '计算器': '🧮',
  
  // 其他
  'steam': '🎮',
  'epic': '🎮',
  'photoshop': '🎨',
  'ps': '🎨',
  'illustrator': '🎨',
  'ai': '🎨',
};

/**
 * 根据应用名称获取图标
 */
function getAppIcon(name: string): string {
  const nameLower = name.toLowerCase();
  
  // 直接匹配
  for (const [key, icon] of Object.entries(APP_ICON_MAP)) {
    if (nameLower.includes(key)) {
      return icon;
    }
  }
  
  // 默认图标
  return '📱';
}

export function useApplications() {
  const [applications, setApplications] = useState<ApplicationResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      // 调用 Rust 命令获取开始菜单应用
      const apps = await invoke<any[]>('get_start_menu_apps');
      
      const appResults: ApplicationResult[] = apps.map(app => 
        createApplicationResult(
          app.name,
          app.path,
          app.executable,
          {
            description: app.description,
            icon: getAppIcon(app.name), // 使用智能图标映射
          }
        )
      );
      
      setApplications(appResults);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  };

  return { applications, loading, reload: loadApplications };
}
