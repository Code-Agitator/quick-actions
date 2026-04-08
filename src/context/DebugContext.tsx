import { createContext, useContext, useState, ReactNode } from 'react';

export interface DebugSettings {
  searchTiming: boolean;        // 搜索耗时统计
  windowFocus: boolean;         // 窗口焦点事件
  keyboardEvents: boolean;      // 键盘事件追踪
  pluginLoading: boolean;       // 插件加载日志
  cacheStats: boolean;          // 缓存统计
}

interface DebugContextType {
  settings: DebugSettings;
  toggleDebug: (key: keyof DebugSettings) => void;
  isDebugOpen: boolean;
  togglePanel: () => void;
}

const defaultSettings: DebugSettings = {
  searchTiming: false,
  windowFocus: false,
  keyboardEvents: false,
  pluginLoading: false,
  cacheStats: false,
};

const DebugContext = createContext<DebugContextType>({
  settings: defaultSettings,
  toggleDebug: () => {},
  isDebugOpen: false,
  togglePanel: () => {},
});

export function DebugProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<DebugSettings>(defaultSettings);
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  const toggleDebug = (key: keyof DebugSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const togglePanel = () => {
    setIsDebugOpen(prev => !prev);
  };

  return (
    <DebugContext.Provider value={{ settings, toggleDebug, isDebugOpen, togglePanel }}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error('useDebug must be used within DebugProvider');
  }
  return context;
}
