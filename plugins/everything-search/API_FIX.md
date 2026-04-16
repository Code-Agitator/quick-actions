# Everything 插件 API 调用修复

## 问题描述

前端插件在调用后端能力时出现错误：
```
TypeError: Cannot read properties of undefined (reading 'invoke')
```

**原因**：插件直接使用 `window.__TAURI__` 调用后端命令，但该对象在插件环境中未定义。

## 解决方案

### 1. 扩展 ACTIONS API

在 `src/utils/actionsAPI.ts` 中为 Everything API 添加了三个新方法：

#### `searchExtended` - 高级搜索
```typescript
ACTIONS.everything.searchExtended(
  query: string,      // 搜索关键词
  filter: string,     // 文件类型过滤器 (All/Folder/Excel/Word/PPT/PDF/Image/Video/Audio/Archive)
  sortBy: string,     // 排序方式 (DateDesc/DateAsc/NameAsc/NameDesc/SizeDesc/SizeAsc)
  maxResults?: number // 最大结果数，默认 100
): Promise<any[]>
```

#### `previewFile` - 文件预览
```typescript
ACTIONS.everything.previewFile(
  filePath: string,   // 文件路径
  maxSize?: number    // 最大读取大小（字节），默认不限制
): Promise<{
  content: string;    // 文件内容
  encoding: string;   // 检测到的编码
  size: number;       // 文件大小
  lines: number;      // 行数
  truncated: boolean; // 是否被截断
  mime_type: string;  // MIME 类型
}>
```

#### `getFileInfo` - 获取文件信息
```typescript
ACTIONS.everything.getFileInfo(
  filePath: string    // 文件路径
): Promise<{
  name: string;
  path: string;
  size: number;
  size_formatted: string;
  created: string;
  modified: string;
  accessed: string;
  is_file: boolean;
  is_dir: boolean;
  extension: string;
  mime_type: string;
}>
```

### 2. 修改插件代码

将插件中的 `window.__TAURI__.invoke()` 调用全部替换为 `ACTIONS.everything.*` 方法：

#### 修改前 ❌
```typescript
// 执行搜索
const results = await (window.__TAURI__ as any).invoke('everything_search_extended', {
  pluginId: 'everything-search',
  query: keyword,
  filter: filterMap[filter],
  sortBy: sortMap[sort],
  maxResults: 100,
});

// 预览文件
const preview = await (window.__TAURI__ as any).invoke('preview_file_content', {
  pluginId: 'everything-search',
  filePath: file.filename,
  maxSize: 100_000,
});

// 打开文件
await window.__TAURI__.invoke('plugin_everything_open', {
  pluginId: 'everything-search',
  filePath: fullPath,
});
```

#### 修改后 ✅
```typescript
// 执行搜索
const actions = (window as any).ACTIONS;
if (!actions?.everything?.searchExtended) {
  throw new Error('ACTIONS.everything.searchExtended 不可用');
}
const results = await actions.everything.searchExtended(
  keyword,
  filterMap[filter],
  sortMap[sort],
  100
);

// 预览文件
const actions = (window as any).ACTIONS;
if (!actions?.everything?.previewFile) {
  throw new Error('ACTIONS.everything.previewFile 不可用');
}
const preview = await actions.everything.previewFile(file.filename, 100_000);

// 打开文件
const actions = (window as any).ACTIONS;
if (actions?.everything?.open) {
  actions.everything.open(fullPath);
} else {
  console.error('ACTIONS.everything.open 不可用');
}
```

## 技术优势

### 1. **统一的 API 访问**
- 所有插件通过 `ACTIONS` 对象访问后端能力
- 避免直接依赖 Tauri 内部实现
- 更好的封装和抽象

### 2. **类型安全**
- TypeScript 接口定义完整
- 编译时类型检查
- IDE 智能提示支持

### 3. **错误处理**
- 统一捕获和处理错误
- 友好的错误日志输出
- 降级策略（检查 API 可用性）

### 4. **安全性**
- 只暴露安全的后端功能
- 权限控制和验证
- 防止插件越权访问

## 修改的文件

1. **`src/utils/actionsAPI.ts`**
   - 扩展 `EverythingAPI` 接口定义
   - 实现 `searchExtended`、`previewFile`、`getFileInfo` 方法

2. **`plugins/everything-search/src/App.tsx`**
   - 替换所有 `window.__TAURI__` 调用为 `ACTIONS` 调用
   - 添加 API 可用性检查
   - 优化错误处理

## 测试验证

构建成功后生成安装包：
- MSI: `quick-actions_0.1.0_x64_en-US.msi`
- NSIS: `quick-actions_0.1.0_x64-setup.exe`

安装后可测试以下功能：
1. ✅ 左侧文件类型筛选
2. ✅ 中间搜索结果列表
3. ✅ 右侧文件预览（自动编码检测）
4. ✅ 底部状态栏（排序、预览开关）
5. ✅ 键盘导航（上下箭头、Enter 打开）
6. ✅ 双击打开文件/文件夹

## 注意事项

### 开发模式 vs 生产模式

**开发模式**（`pnpm tauri dev`）：
- 插件从 `plugins/*/dist` 加载
- 需要重新构建插件：`pnpm build:plugins`

**生产模式**（`pnpm tauri build`）：
- 插件打包到应用中
- 自动包含最新构建的插件

### API 兼容性

所有新增的 ACTIONS API 都向后兼容：
- 旧插件仍可使用原有的 `ACTIONS.everything.search()` 等方法
- 新插件推荐使用扩展 API 获得更丰富的功能

## 最佳实践

### 1. 始终检查 API 可用性
```typescript
const actions = (window as any).ACTIONS;
if (!actions?.everything?.searchExtended) {
  console.error('API 不可用');
  return;
}
```

### 2. 使用 try-catch 处理错误
```typescript
try {
  const results = await actions.everything.searchExtended(...);
  // 处理结果
} catch (error) {
  console.error('操作失败:', error);
  setError(error.message);
}
```

### 3. 遵循类型定义
- 参考 `actionsAPI.ts` 中的接口定义
- 确保传递正确的参数类型
- 正确处理返回值

## 相关文档

- [插件开发指南](../../PLUGIN_GUIDE.md)
- [架构设计文档](../../ARCHITECTURE.md)
- [ACTIONS API 参考](../../src/utils/actionsAPI.ts)
