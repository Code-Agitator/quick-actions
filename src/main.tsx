import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PluginApp } from "./PluginApp";
import { DebugProvider } from "./context/DebugContext";
import "./index.css";

// 检测是否为插件窗口
const isPluginWindow = (() => {
  const params = new URLSearchParams(window.location.search);
  const windowParam = params.get('window');
  const hasSlot = params.get('slot') !== null;
  const hasStoredPlugin = sessionStorage.getItem('__PLUGIN_ID__') !== null;
  
  const result = windowParam === 'plugin' || hasSlot || hasStoredPlugin;
  
  console.log('=== WINDOW DETECTION ===');
  console.log('URL:', window.location.href);
  console.log('Search params:', Object.fromEntries(params));
  console.log('window param:', windowParam);
  console.log('has slot:', hasSlot);
  console.log('sessionStorage __PLUGIN_ID__:', sessionStorage.getItem('__PLUGIN_ID__'));
  console.log('Is plugin window:', result);
  console.log('======================');
  
  return result;
})();

// 开发环境下禁用 StrictMode
const StrictModeWrapper = import.meta.env.DEV ? React.Fragment : React.StrictMode;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictModeWrapper>
    <DebugProvider>
      {isPluginWindow ? <PluginApp /> : <App />}
    </DebugProvider>
  </StrictModeWrapper>,
);
