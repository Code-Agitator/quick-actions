import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ApplicationResult, createApplicationResult } from '../types/searchResult';

export function useApplications() {
  const [applications, setApplications] = useState<ApplicationResult[]>([]);
  const [loading, setLoading] = useState(true);

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
            icon: undefined, // 不再使用 emoji，由前端组件渲染 React 图标
          }
        );
      });
      
      setApplications(appResults);
    } catch (error) {
      console.error('[useApplications] Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  };

  return { applications, loading, reload: loadApplications };
}
