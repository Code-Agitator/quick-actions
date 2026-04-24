import { useState } from 'react';
import { usePlugins } from '../hooks/usePlugins';
import { useDebug } from '../context/DebugContext';
import { useAppSettings } from '../hooks/useAppSettings';
import { SettingsSidebar } from './settings/SettingsSidebar';
import AppearanceSetting from './settings/AppearanceSetting';
import GeneralSetting from './settings/GeneralSetting';
import { PluginsTab } from './settings/PluginsTab';
import { AboutTab } from './settings/AboutTab';
import { DebugTab } from './settings/DebugTab';

interface SettingsProps {
  onClose: () => void;
  onTogglePin?: (id: string, pinned: boolean) => void;
}

export function Settings({ onClose, onTogglePin }: SettingsProps) {
  const [activeTab, setActiveTab] = useState('appearance');
  const { plugins, loading, uninstallPlugin } = usePlugins();
  const { settings: debugSettings, toggleDebug, isDebugOpen, togglePanel } = useDebug();
  const { resetSettings } = useAppSettings();

  return (
    <div className="h-screen w-full flex overflow-hidden">
      {/* 左侧导航栏 */}
      <SettingsSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onClose={onClose}
      />

      {/* 右侧内容区 */}
      <main className="flex-1 overflow-y-auto bg-content1 dark:bg-content1/50">
        <div className="p-6">
          {activeTab === 'appearance' && <AppearanceSetting />}
          {activeTab === 'general' && <GeneralSetting />}
          {activeTab === 'plugins' && (
            <PluginsTab
              plugins={plugins}
              loading={loading}
              onUninstall={uninstallPlugin}
              onTogglePin={onTogglePin}
            />
          )}
          {activeTab === 'about' && <AboutTab onReset={resetSettings} />}
          {import.meta.env.DEV && activeTab === 'debug' && (
            <DebugTab
              debugSettings={debugSettings}
              onToggleDebug={toggleDebug}
              isDebugOpen={isDebugOpen}
              onTogglePanel={togglePanel}
            />
          )}
        </div>
      </main>
    </div>
  );
}
