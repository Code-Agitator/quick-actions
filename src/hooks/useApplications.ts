import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ApplicationResult, createApplicationResult } from '../types/searchResult';

export function useApplications() {
  const [applications, setApplications] = useState<ApplicationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAutoReloaded, setHasAutoReloaded] = useState(false); // 标记是否已经自动刷新过

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const apps = await invoke<any[]>('get_start_menu_apps');
      
      const appResults: ApplicationResult[] = apps.map(app => {
        return createApplicationResult(
          app.name,
          app.path,
          app.executable,
          {
            description: app.description,
            icon: app.icon, // 使用后端提取的真实图标（Base64）
          }
        );
      });
      
      setApplications(appResults);
      
      // 智能自动刷新：如果这是首次加载且大部分应用没有图标，则在 10 秒后自动刷新
      if (!hasAutoReloaded && appResults.length > 0) {
        const appsWithIcons = appResults.filter(app => app.icon).length;
        const iconRatio = appsWithIcons / appResults.length;
        
        console.log(`[useApplications] Icon coverage: ${appsWithIcons}/${appResults.length} (${(iconRatio * 100).toFixed(1)}%)`);
        
        // 如果图标覆盖率低于 50%，则在 10 秒后自动刷新
        if (iconRatio < 0.5) {
          console.log('[useApplications] Low icon coverage, scheduling auto-reload in 10s...');
          setTimeout(() => {
            console.log('[useApplications] Auto-reloading applications for cached icons...');
            loadApplications();
            setHasAutoReloaded(true);
          }, 10000);
        } else {
          setHasAutoReloaded(true);
        }
      }
    } catch (error) {
      console.error('[useApplications] Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  };

  return { applications, loading, reload: loadApplications };
}
