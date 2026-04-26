import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ApplicationResult, createApplicationResult } from '../types/searchResult';

export function useApplications() {
  const [applications, setApplications] = useState<ApplicationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [iconCache, setIconCache] = useState<Map<string, string>>(new Map()); // 内存图标缓存
  const [isLoadingIcons, setIsLoadingIcons] = useState(false); // 防止并发加载

  useEffect(() => {
    loadApplications();
  }, []);

  // 【性能优化】按需加载单个应用图标
  const loadAppIcon = useCallback(async (appPath: string): Promise<string | null> => {
    // 检查内存缓存
    if (iconCache.has(appPath)) {
      return iconCache.get(appPath)!;
    }
    
    try {
      // 调用后端命令获取单个图标
      console.time(`[Icon Load] ${appPath}`);
      const icon = await invoke<string | null>('get_app_icon_by_path', { path: appPath });
      console.timeEnd(`[Icon Load] ${appPath}`);
      
      if (icon) {
        setIconCache(prev => new Map(prev).set(appPath, icon));
        return icon;
      }
    } catch (error) {
      console.error(`[useApplications] Failed to load icon for ${appPath}:`, error);
    }
    return null;
  }, [iconCache]);

  // 【性能优化】批量加载可见应用的图标（每次最多 10 个）
  const loadVisibleIcons = useCallback(async (visibleApps: ApplicationResult[]) => {
    if (isLoadingIcons || visibleApps.length === 0) return;
    
    setIsLoadingIcons(true);
    
    const appsToLoad = visibleApps
      .filter(app => !app.icon && !iconCache.has(app.path))
      .slice(0, 10); // 每次只加载 10 个，避免并发过多
    
    if (appsToLoad.length === 0) {
      setIsLoadingIcons(false);
      return;
    }
    
    console.log(`[useApplications] Loading icons for ${appsToLoad.length} apps...`);
    
    const loadPromises = appsToLoad.map(async (app) => {
      const icon = await loadAppIcon(app.path);
      if (icon) {
        // 更新应用列表中的图标
        setApplications(prev => 
          prev.map(a => a.path === app.path ? { ...a, icon } : a)
        );
      }
    });
    
    await Promise.all(loadPromises);
    setIsLoadingIcons(false);
  }, [isLoadingIcons, iconCache, loadAppIcon]);

  // 【性能优化】当应用列表加载完成后，初始加载前 20 个应用的图标
  useEffect(() => {
    if (applications.length > 0) {
      console.log('[useApplications] Initial icon loading for first 20 apps...');
      loadVisibleIcons(applications.slice(0, 20));
    }
  }, [applications, loadVisibleIcons]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      console.time('[Performance] loadApplications');
      const apps = await invoke<any[]>('get_start_menu_apps');
      console.timeEnd('[Performance] loadApplications');
      
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
      
      // 【性能优化】不再需要自动刷新，因为已有渐进式懒加载机制
      // 图标会通过 loadVisibleIcons 按需加载
    } catch (error) {
      console.error('[useApplications] Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  };

  return { 
    applications, 
    loading, 
    reload: loadApplications,
    loadVisibleIcons, // 【性能优化】暴露给外部，用于滚动加载
    iconCache
  };
}
