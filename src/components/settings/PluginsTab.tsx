import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button, Divider, Chip, Tooltip, Card } from '@heroui/react';
import { IoTrashOutline, IoPinOutline, IoPin } from 'react-icons/io5';
import { useAppSettings } from '../../hooks/useAppSettings';

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  icon?: string;
  pinned?: boolean;
}

interface PluginsTabProps {
  plugins: Plugin[];
  loading: boolean;
  onUninstall: (id: string) => void;
  onTogglePin?: (id: string, pinned: boolean) => void;
}

// 可复用的设置卡片组件
function SettingsCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={`bg-content2 dark:bg-content2/50 border border-divider rounded-medium ${className}`}>
      {children}
    </Card>
  );
}

export function PluginsTab({ plugins, loading, onUninstall, onTogglePin }: PluginsTabProps) {
  const { isPluginPinned, getPinnedPlugins } = useAppSettings();
  const [_pinnedPlugins, setPinnedPlugins] = useState<Set<string>>(() => getPinnedPlugins());

  useEffect(() => {
    const handleStorageChange = () => {
      setPinnedPlugins(getPinnedPlugins());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('plugin-pinned-changed', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('plugin-pinned-changed', handleStorageChange);
    };
  }, [getPinnedPlugins]);

  return (
    <>
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">插件管理</h1>
        <p className="text-small text-default-500">管理已安装的插件</p>
      </div>

      <Divider className="mb-6" />

      {/* 操作栏 */}
      <div className="flex items-center gap-3 mb-6">
        <Button size="sm" color="primary" className="px-4">
          安装插件
        </Button>
      </div>
    
      {loading ? (
        <div className="text-center py-12 text-default-500">加载中...</div>
      ) : plugins.length === 0 ? (
        <div className="text-center py-12 text-default-500">
          <p>暂无已安装的插件</p>
          <p className="text-small mt-2">点击"安装插件"按钮添加新插件</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plugins.map((plugin) => {
            const isPinned = plugin.pinned || isPluginPinned(plugin.id);
            
            return (
              <SettingsCard key={plugin.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{plugin.icon || '🔌'}</span>
                      <h3 className="font-medium text-foreground text-small">{plugin.name}</h3>
                      <Chip size="sm" variant="flat" className="text-tiny">
                        v{plugin.version}
                      </Chip>
                      {isPinned && (
                        <Chip
                          size="sm"
                          color="primary"
                          variant="flat"
                          className="text-tiny flex items-center gap-1"
                        >
                          <IoPin className="w-3 h-3" />
                          已固定
                        </Chip>
                      )}
                    </div>
                    <p className="text-tiny text-default-500">{plugin.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {onTogglePin && (
                      <Tooltip content={isPinned ? '取消固定' : '固定在搜索结果'}>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => onTogglePin(plugin.id, !isPinned)}
                          className={isPinned ? 'text-primary' : 'text-default-400'}
                        >
                          {isPinned ? (
                            <IoPin className="w-4 h-4" />
                          ) : (
                            <IoPinOutline className="w-4 h-4" />
                          )}
                        </Button>
                      </Tooltip>
                    )}
                    <Tooltip content="卸载插件">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        className="text-default-400"
                        onPress={() => {
                          invoke('log_frontend_message', { level: 'info', message: `User clicked uninstall for plugin: ${plugin.id}` });
                          onUninstall(plugin.id);
                        }}
                      >
                        <IoTrashOutline className="text-base" />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              </SettingsCard>
            );
          })}
        </div>
      )}
    </>
  );
}
