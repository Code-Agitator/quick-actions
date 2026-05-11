/**
 * 插件管理器组件
 * 
 * 显示已安装插件列表，提供启用/禁用、卸载等管理功能。
 * 
 * @module components/PluginManager
 */

import { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Button,
  Card,
  CardBody,
  Switch,
  Chip,
  Tooltip,
  Divider,
  Spinner
} from '@heroui/react';
import { showError, confirmAction } from '../utils/notifications';
import {
  IoTrashOutline,
  IoRefreshOutline
} from 'react-icons/io5';

/**
 * 插件注册表条目接口（从Rust端获取）
 */
interface PluginRegistryEntry {
  id: string;
  name: string;
  version: string;
  description: string;
  icon?: string;
  keywords?: string[];
  entry: string;
  entry_type?: 'js' | 'html' | 'esm';
  permissions?: string[];
  install_path: string;
  enabled: boolean;
  installed_at: number; // Unix timestamp
  updated_at?: number;
  hash?: string;
}

/**
 * 插件管理器组件属性
 */
interface PluginManagerProps {
  /** 可选：外部触发的刷新控制 */
  refreshTrigger?: number;
  /** 可选：卸载插件后的回调 */
  onUninstall?: (pluginId: string) => void;
}

/**
 * 插件管理器组件
 * 
 * 显示所有已安装插件的列表，允许用户：
 * - 查看插件详细信息
 * - 启用/禁用插件
 * - 卸载插件
 * - 刷新插件列表
 * 
 * @example
 * ```tsx
 * <PluginManager onUninstall={(id) => console.log('Uninstalled:', id)} />
 * ```
 */
export function PluginManager({ refreshTrigger, onUninstall }: PluginManagerProps) {
  const [plugins, setPlugins] = useState<PluginRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingPlugin, setTogglingPlugin] = useState<string | null>(null);

  /**
   * 加载已注册的插件列表
   * 
   * 从Rust端获取插件注册表中的所有插件信息。
   */
  const loadPlugins = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const registered = await invoke<PluginRegistryEntry[]>('get_registered_plugins');
      setPlugins(registered);
      
      console.log(`Loaded ${registered.length} registered plugins`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to load plugins: ${errorMessage}`);
      console.error('Failed to load plugins:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载和响应外部刷新触发
  useEffect(() => {
    loadPlugins();
  }, [loadPlugins, refreshTrigger]);

  // 监听插件安装事件
  useEffect(() => {
    const handlePluginInstalled = () => {
      console.log('Plugin installed event received, refreshing list...');
      loadPlugins();
    };

    window.addEventListener('plugin-installed', handlePluginInstalled);
    
    return () => {
      window.removeEventListener('plugin-installed', handlePluginInstalled);
    };
  }, [loadPlugins]);

  /**
   * 切换插件启用状态
   * 
   * @param pluginId - 插件ID
   * @param enabled - 是否启用
   */
  const togglePlugin = useCallback(async (pluginId: string, enabled: boolean) => {
    try {
      setTogglingPlugin(pluginId);
      
      const success = await invoke<boolean>('toggle_plugin', {
        pluginId,
        enabled
      });

      if (success) {
        // 更新本地状态
        setPlugins(prev =>
          prev.map(p =>
            p.id === pluginId ? { ...p, enabled } : p
          )
        );

        // 触发全局事件通知其他组件
        window.dispatchEvent(new CustomEvent('plugin-toggled', {
          detail: { pluginId, enabled }
        }));

        console.log(`Plugin ${pluginId} ${enabled ? 'enabled' : 'disabled'}`);
      } else {
        throw new Error('Plugin not found in registry');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Failed to toggle plugin ${pluginId}:`, err);
      showError(`操作失败: ${errorMessage}`);
    } finally {
      setTogglingPlugin(null);
    }
  }, []);

  /**
   * 卸载插件
   * 
   * 显示确认对话框后调用Rust端卸载命令。
   * 
   * @param pluginId - 要卸载的插件ID
   */
  const uninstallPlugin = useCallback(async (pluginId: string) => {
    const plugin = plugins.find(p => p.id === pluginId);
    if (!plugin) return;

    // 二次确认（使用自定义对话框）
    const confirmed = await confirmAction(
      `确定要卸载插件 "${plugin.name}" 吗？\n\n此操作不可撤销。`
    );

    if (!confirmed) {
      return;
    }

    try {
      const success = await invoke<boolean>('uninstall_plugin_zip', {
        pluginId
      });

      if (success) {
        // 从列表中移除
        setPlugins(prev => prev.filter(p => p.id !== pluginId));

        // 触发全局事件
        window.dispatchEvent(new CustomEvent('plugin-uninstalled', {
          detail: { pluginId }
        }));

        // 调用外部回调
        if (onUninstall) {
          onUninstall(pluginId);
        }

        console.log(`Plugin ${pluginId} uninstalled successfully`);
      } else {
        throw new Error('Failed to uninstall plugin');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Failed to uninstall plugin ${pluginId}:`, err);
      showError(`卸载失败: ${errorMessage}`);
    }
  }, [plugins, onUninstall]);

  /**
   * 格式化时间戳为可读字符串
   * 
   * @param timestamp - Unix时间戳（秒）
   * @returns 格式化的日期字符串
   */
  const formatTimestamp = (timestamp: number): string => {
    try {
      const date = new Date(timestamp * 1000);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
  };

  /**
   * 渲染加载状态
   */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" color="primary" />
        <span className="ml-3 text-default-500">加载插件列表...</span>
      </div>
    );
  }

  /**
   * 渲染错误状态
   */
  if (error) {
    return (
      <Card className="w-full border-danger">
        <CardBody className="p-6">
          <div className="text-center space-y-3">
            <p className="text-danger">{error}</p>
            <Button
              size="sm"
              color="primary"
              variant="flat"
              startContent={<IoRefreshOutline />}
              onPress={loadPlugins}
            >
              重试
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  /**
   * 渲染空状态
   */
  if (plugins.length === 0) {
    return (
      <Card className="w-full">
        <CardBody className="p-8">
          <div className="text-center space-y-3">
            <p className="text-default-500">暂无已安装的插件</p>
            <p className="text-tiny text-default-400">
              使用上方的"安装新插件"功能添加插件
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  /**
   * 渲染插件列表
   */
  return (
    <div className="space-y-3">
      {/* 列表头部信息 */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">已安装插件 ({plugins.length})</h3>
        <Tooltip content="刷新插件列表">
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={loadPlugins}
            isLoading={loading}
          >
            <IoRefreshOutline className="text-base" />
          </Button>
        </Tooltip>
      </div>

      {/* 插件列表 */}
      {plugins.map((plugin) => (
        <Card
          key={plugin.id}
          className={`w-full transition-opacity ${
            !plugin.enabled ? 'opacity-60' : ''
          }`}
        >
          <CardBody className="p-4">
            <div className="flex items-start gap-4">
              {/* 插件图标 */}
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-default-100 flex items-center justify-center text-2xl">
                {plugin.icon || '🔌'}
              </div>

              {/* 插件信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-foreground truncate">
                    {plugin.name}
                  </h4>
                  <Chip size="sm" variant="flat" className="text-tiny">
                    v{plugin.version}
                  </Chip>
                  
                  {/* 启用状态标签 */}
                  <Chip
                    size="sm"
                    color={plugin.enabled ? 'success' : 'default'}
                    variant="flat"
                    className="text-tiny"
                  >
                    {plugin.enabled ? '已启用' : '已禁用'}
                  </Chip>
                </div>

                <p className="text-small text-default-500 line-clamp-2 mb-2">
                  {plugin.description || '无描述'}
                </p>

                {/* 元数据信息 */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-tiny text-default-400">
                  <span>安装时间: {formatTimestamp(plugin.installed_at)}</span>
                  {plugin.updated_at && (
                    <span>更新时间: {formatTimestamp(plugin.updated_at)}</span>
                  )}
                  {plugin.hash && (
                    <Tooltip content="SHA256哈希值">
                      <span className="cursor-help">
                        Hash: {plugin.hash.substring(0, 16)}...
                      </span>
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-col items-end gap-2">
                {/* 启用/禁用开关 */}
                <div className="flex items-center gap-2">
                  <span className="text-tiny text-default-500">
                    {togglingPlugin === plugin.id ? '切换中...' : (plugin.enabled ? '启用' : '禁用')}
                  </span>
                  <Switch
                    size="sm"
                    isSelected={plugin.enabled}
                    onValueChange={(checked) => togglePlugin(plugin.id, checked)}
                    isDisabled={togglingPlugin === plugin.id}
                  />
                </div>

                <Divider className="my-1" />

                {/* 卸载按钮 */}
                <Tooltip content="卸载插件">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={() => uninstallPlugin(plugin.id)}
                    className="text-default-400 hover:text-danger"
                  >
                    <IoTrashOutline className="text-base" />
                  </Button>
                </Tooltip>
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export default PluginManager;
