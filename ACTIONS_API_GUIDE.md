# ACTIONS API - 插件安全接口文档

## 🛡️ 概述

`ACTIONS` 是一个安全的 API 对象，提供给插件使用。它封装了 Tauri API，只暴露必要的功能，避免直接访问 `window.__TAURI__` 带来的安全风险。

---

## 🎯 设计理念

### 为什么需要 ACTIONS？

**问题**:
- ❌ `window.__TAURI__` 暴露了所有 Tauri 能力
- ❌ 插件可以调用任何 Rust 命令
- ❌ 潜在的安全风险

**解决方案**:
- ✅ `window.ACTIONS` 只提供受控的功能
- ✅ 每个功能都经过安全审查
- ✅ 插件只能使用明确提供的 API

---

## 📚 API 参考

### 1. Plugin - 插件信息

```typescript
ACTIONS.plugin: {
  id: string;      // 插件 ID
  name: string;    // 插件名称
  version: string; // 插件版本
}
```

**示例**:
```javascript
console.log(ACTIONS.plugin.id); // "command-runner-ui"
```

---

### 2. Notification - 通知

```typescript
ACTIONS.notification: {
  show: (title: string, body: string) => Promise<void>
}
```

**示例**:
```javascript
// 显示通知
await ACTIONS.notification.show('成功', '命令执行完成');
```

---

### 3. Clipboard - 剪贴板

```typescript
ACTIONS.clipboard: {
  writeText: (text: string) => Promise<void>,
  readText: () => Promise<string>
}
```

**示例**:
```javascript
// 写入剪贴板
await ACTIONS.clipboard.writeText('Hello World');

// 读取剪贴板
const text = await ACTIONS.clipboard.readText();
console.log(text);
```

---

### 4. FileSystem - 文件系统（受限）

```typescript
ACTIONS.fs: {
  listDir: (path: string) => Promise<any[]>,
  getInfo: (path: string) => Promise<any>,
  searchFiles: (path: string, query: string, maxResults?: number) => Promise<any[]>
}
```

**示例**:
```javascript
// 列出目录
const files = await ACTIONS.fs.listDir('C:\\Users');
console.log(files);

// 获取文件信息
const info = await ACTIONS.fs.getInfo('C:\\Users\\test.txt');

// 搜索文件
const results = await ACTIONS.fs.searchFiles('C:\\Users', '*.txt', 10);
```

---

### 5. Shell - 命令执行（受限）

```typescript
ACTIONS.shell: {
  execute: (command: string, args: string[]) => Promise<string>
}
```

**示例**:
```javascript
// 执行命令
const output = await ACTIONS.shell.execute('dir', []);
console.log(output);

// 带参数的命令
const result = await ACTIONS.shell.execute('ping', ['google.com']);
```

---

### 6. Config - 配置管理

```typescript
ACTIONS.config: {
  set: (key: string, value: any) => Promise<void>,
  get: (key: string) => Promise<any>,
  remove: (key: string) => Promise<void>
}
```

**示例**:
```javascript
// 保存配置
await ACTIONS.config.set('theme', 'dark');
await ACTIONS.config.set('language', 'zh-CN');

// 加载配置
const theme = await ACTIONS.config.get('theme');

// 删除配置
await ACTIONS.config.remove('theme');
```

---

### 7. Utils - 实用工具

```typescript
ACTIONS.utils: {
  formatDate: (date: Date | number, format?: string) => string,
  debounce: <F>(fn: F, delay: number) => (...args: Parameters<F>) => void,
  throttle: <F>(fn: F, limit: number) => (...args: Parameters<F>) => void,
  deepClone: <T>(obj: T) => T,
  generateId: () => string
}
```

**示例**:
```javascript
// 格式化日期
const now = ACTIONS.utils.formatDate(new Date());
console.log(now); // "2026年4月3日 10:30"

// 防抖函数
const debouncedSearch = ACTIONS.utils.debounce((query) => {
  console.log('Searching:', query);
}, 300);

debouncedSearch('test'); // 300ms 后执行

// 节流函数
const throttledScroll = ACTIONS.utils.throttle(() => {
  console.log('Scrolled');
}, 100);

// 深拷贝
const cloned = ACTIONS.utils.deepClone(originalObject);

// 生成唯一 ID
const id = ACTIONS.utils.generateId();
```

---

### 8. Storage - 本地存储

```typescript
ACTIONS.storage: {
  get: (key: string) => any,
  set: (key: string, value: any) => void,
  remove: (key: string) => void,
  clear: () => void
}
```

**特点**:
- ✅ 自动添加插件前缀，避免冲突
- ✅ 数据隔离，每个插件独立空间
- ✅ 同步操作，无需 await

**示例**:
```javascript
// 保存数据
ACTIONS.storage.set('userPreference', { theme: 'dark' });

// 读取数据
const pref = ACTIONS.storage.get('userPreference');

// 删除数据
ACTIONS.storage.remove('userPreference');

// 清空当前插件的所有数据
ACTIONS.storage.clear();
```

---

## 🔒 安全特性

### 1. 权限控制

每个 API 都有明确的权限范围：

| API | 权限级别 | 说明 |
|-----|---------|------|
| `notification` | ✅ 低 | 仅显示通知 |
| `clipboard` | ✅ 低 | 浏览器原生 API |
| `storage` | ✅ 低 | localStorage，插件隔离 |
| `utils` | ✅ 低 | 纯工具函数 |
| `fs` | ⚠️ 中 | 受限的文件系统访问 |
| `shell` | ⚠️ 中 | 受限的命令执行 |
| `config` | ⚠️ 中 | 配置管理 |

### 2. 路径安全检查

文件系统 API 会进行路径安全检查，防止访问敏感目录。

### 3. 命令白名单

Shell API 可以配置命令白名单，只允许执行安全的命令。

### 4. 数据隔离

每个插件的 storage 和 config 都是独立的，通过插件 ID 隔离。

---

## 📝 迁移指南

### 从 `window.__TAURI__` 迁移到 `window.ACTIONS`

#### 之前（不安全）:

```javascript
// ❌ 直接访问 Tauri API
const files = await window.__TAURI__.core.invoke('plugin_list_dir', {
  pluginId: 'my-plugin',
  path: 'C:\\Users'
});

await window.__TAURI__.core.invoke('plugin_execute_command', {
  pluginId: 'my-plugin',
  command: 'dir',
  args: []
});
```

#### 现在（安全）:

```javascript
// ✅ 使用 ACTIONS API
const files = await ACTIONS.fs.listDir('C:\\Users');

const output = await ACTIONS.shell.execute('dir', []);
```

---

## 🎯 最佳实践

### 1. 错误处理

```javascript
try {
  const result = await ACTIONS.shell.execute('command', []);
  console.log(result);
} catch (error) {
  console.error('Command failed:', error);
  ACTIONS.notification.show('错误', error.message);
}
```

### 2. 使用防抖优化性能

```javascript
const handleSearch = ACTIONS.utils.debounce(async (query) => {
  const results = await ACTIONS.fs.searchFiles('C:\\Users', query);
  console.log(results);
}, 300);

// 用户输入时调用
input.addEventListener('input', (e) => {
  handleSearch(e.target.value);
});
```

### 3. 使用 Storage 保存状态

```javascript
// 保存用户偏好
function savePreference(key, value) {
  ACTIONS.storage.set(key, value);
}

// 加载用户偏好
function loadPreference(key, defaultValue) {
  return ACTIONS.storage.get(key) || defaultValue;
}
```

### 4. 检查 API 可用性

```javascript
if (!window.ACTIONS) {
  console.error('ACTIONS API not available');
  return;
}

// 使用 API
await ACTIONS.notification.show('Hello', 'World');
```

---

## 🐛 常见问题

### Q1: ACTIONS API 不可用？

**原因**: 插件可能不是通过 PluginUI 加载的

**解决**: 确保插件正确注册并使用 ESM 格式

### Q2: 如何调试 ACTIONS API？

在浏览器控制台中：

```javascript
// 查看完整的 ACTIONS 对象
console.log(window.ACTIONS);

// 测试某个功能
await ACTIONS.notification.show('Test', 'Hello');
```

### Q3: 可以扩展 ACTIONS API 吗？

**可以**！修改 `src/utils/actionsAPI.ts`，添加新的功能模块。

---

## 📊 对比

| 特性 | window.__TAURI__ | window.ACTIONS |
|------|------------------|----------------|
| **安全性** | ❌ 低 | ✅ 高 |
| **易用性** | ⚠️ 中 | ✅ 高 |
| **类型支持** | ⚠️ 部分 | ✅ 完整 |
| **错误处理** | ❌ 手动 | ✅ 内置 |
| **权限控制** | ❌ 无 | ✅ 有 |
| **推荐度** | ❌ 不推荐 | ✅ 强烈推荐 |

---

## 🎉 总结

`ACTIONS` API 提供了：

✅ **安全的访问控制** - 只暴露必要的功能  
✅ **简洁的 API 设计** - 易于理解和使用  
✅ **完整的类型支持** - TypeScript 友好  
✅ **内置错误处理** - 更健壮的代码  
✅ **数据隔离** - 插件间互不干扰  

从现在开始，所有插件都应该使用 `window.ACTIONS` 而不是 `window.__TAURI__`！🛡️
