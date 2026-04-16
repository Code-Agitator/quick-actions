/// <reference types="vite/client" />

// Tauri API 类型声明
interface TauriInvoke {
  (command: string, payload?: Record<string, any>): Promise<any>;
}

interface TauriAPI {
  invoke: TauriInvoke;
}

declare global {
  interface Window {
    __TAURI__?: TauriAPI;
    ACTIONS?: any;
  }
}

export {};
