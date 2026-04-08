import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PluginApp } from "./PluginApp";
import { DebugProvider } from "./context/DebugContext";
import "./index.css";

// 根据 URL 路径决定渲染哪个应用
const pathname = window.location.pathname;
const search = window.location.search;
console.log('[Main] Current pathname:', pathname);
console.log('[Main] Current search:', search);
console.log('[Main] Full URL:', window.location.toString());

// 检查是否是插件窗口（通过 URL 或查询参数）
const params = new URLSearchParams(search);
const windowParam = params.get('window');
const isPluginWindow = windowParam === 'plugin';

console.log('[Main] Parsed params:', Object.fromEntries(params));
console.log('[Main] "window" param:', windowParam);
console.log('[Main] Is plugin window:', isPluginWindow);

// 开发环境下禁用 StrictMode 以避免双重渲染导致的重复日志
const isDev = import.meta.env.DEV;
const StrictModeWrapper = isDev ? React.Fragment : React.StrictMode;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictModeWrapper>
    <DebugProvider>
      {isPluginWindow ? <PluginApp /> : <App />}
    </DebugProvider>
  </StrictModeWrapper>,
);
