import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PluginApp } from "./PluginApp";
import "./index.css";

// 根据 URL 路径决定渲染哪个应用
const pathname = window.location.pathname;
const href = window.location.href;
console.log('[Main] Current URL:', { pathname, href });

// 检查是否是插件窗口（通过 URL 或查询参数）
const isPluginWindow = pathname.includes('plugin.html') || 
                       href.includes('plugin.html') ||
                       new URLSearchParams(window.location.search).get('window') === 'plugin';

console.log('[Main] Is plugin window:', isPluginWindow);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isPluginWindow ? <PluginApp /> : <App />}
  </React.StrictMode>,
);
