# Everything API 修复说明

## 🐛 问题描述

插件运行时出现错误：`Search error: Error: ACTIONS API 不可用`

## 🔍 问题原因

Everything Search 插件使用了 `ACTIONS.everything.search()` API，但该 API 只在 `pluginAPI.ts` 中定义，而**没有在 `actionsAPI.ts` 中定义**。

### 两个 API 文件的区别

1. **`pluginAPI.ts`** - 用于插件加载器（搜索模式）
   - 在主窗口搜索时注入
   - 通过 `loadPluginFromManifest` 调用
   
2. **`actionsAPI.ts`** - 用于 PluginUI（窗口模式）
   - 在插件窗口中注入
   - 通过 `PluginUI` 组件调用
   - **这才是 Everything 插件实际使用的 API**

### 为什么会出现这个问题？

Everything Search 是一个 **ESM UI 插件**，它的加载流程是：

```
用户点击插件 
  → PluginUI 组件渲染
  → createActionsAPI() 创建 API
  → 注入到 window.ACTIONS
  → 插件调用 ACTIONS.everything.search()
  → ❌ API 不存在，报错
```

之前我只在 `pluginAPI.ts` 中添加了 `everything` API，但忘记在 `actionsAPI.ts` 中添加。

## ✅ 解决方案

在 `src/utils/actionsAPI.ts` 中添加了 `everything` API：

### 1. 添加接口定义

```typescript
interface EverythingAPI {
  search: (query: string, host?: string) => Promise<Array<{
    name: string;
    path: string;
    size: number;
    dateModified: string;
  }>>;
}
```

### 2. 添加到 ActionsAPI 接口

```typescript
export interface ActionsAPI {
  // ... 其他 API
  everything: EverythingAPI;
  // ...
}
```

### 3. 实现 API

```typescript
everything: {
  search: async (query: string, host?: string) => {
    try {
      const results = await invoke<any[]>('plugin_everything_search', {
        pluginId,
        query,
        host
      });
      
      // 转换字段名为驼峰格式
      return results.map((item: any) => ({
        name: item.name,
        path: item.path,
        size: item.size,
        dateModified: item.date_modified || item.dateModified,
      }));
    } catch (error) {
      console.error('[ACTIONS] Everything search failed:', error);
      throw error;
    }
  }
}
```

## 📝 修改的文件

- ✅ `src/utils/actionsAPI.ts` - 添加 everything API

## 🧪 测试步骤

1. **重新构建项目**
   ```bash
   pnpm tauri:dev
   ```

2. **测试插件**
   - 按 `Alt + Space` 打开 Quick Actions
   - 搜索 "Everything" 或 "搜索"
   - 选择 "Everything 搜索" 插件
   - 在插件界面输入关键词
   - **预期结果**: 正常显示搜索结果，无错误

3. **验证 API 可用性**
   - 打开开发者工具 (F12)
   - 在 Console 中输入:
     ```javascript
     console.log(window.ACTIONS?.everything?.search);
     ```
   - **预期输出**: `function`

## 🎯 技术细节

### API 注入时机

```typescript
// PluginUI.tsx 第 98-103 行
const actionsAPI = createActionsAPI(plugin.id);

if (typeof window !== 'undefined') {
  (window as any).ACTIONS = actionsAPI;
}
```

### API 调用流程

```
插件代码
  ↓
window.ACTIONS.everything.search(query)
  ↓
createActionsAPI().everything.search()
  ↓
invoke('plugin_everything_search', { pluginId, query, host })
  ↓
Rust Backend (plugin_api.rs)
  ↓
commands.rs::everything_search()
  ↓
es.exe Sidecar
  ↓
返回结果
```

## 📚 相关文件

- `src/utils/actionsAPI.ts` - PluginUI 使用的 API（已修复）
- `src/utils/pluginAPI.ts` - 插件加载器使用的 API（已有）
- `src/components/PluginUI.tsx` - API 注入位置
- `plugins/everything-search/src/App.tsx` - 插件代码

## ✨ 总结

这次修复确保了 `ACTIONS.everything.search()` API 在两种模式下都可用：
1. ✅ 主窗口搜索模式（通过 `pluginAPI.ts`）
2. ✅ 插件窗口模式（通过 `actionsAPI.ts`）← **本次修复**

现在 Everything Search 插件可以正常工作了！🎉
