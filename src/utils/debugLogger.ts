import { DebugSettings } from '../context/DebugContext';

// 全局 debug 设置（通过 initDebug 初始化）
let debugSettings: DebugSettings = {
  searchTiming: false,
  windowFocus: false,
  keyboardEvents: false,
  pluginLoading: false,
  cacheStats: false,
};

// 初始化 debug 设置
export function initDebug(settings: DebugSettings) {
  debugSettings = settings;
}

// 获取当前 debug 设置
export function getDebugSettings(): DebugSettings {
  return debugSettings;
}

// 安全日志 - 只在对应 debug 选项开启时输出
export function debugLog(key: keyof DebugSettings, ...args: any[]) {
  if (debugSettings[key]) {
    const prefix = `[DEBUG:${key}]`;
    console.log(prefix, ...args);
  }
}

// 性能计时 - 返回一个结束函数
export function debugTimer(key: keyof DebugSettings, label: string): () => void {
  const startTime = performance.now();
  
  return () => {
    if (debugSettings[key]) {
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      console.log(`[DEBUG:${key}] ⏱️ ${label}: ${duration}ms`);
    }
  };
}
