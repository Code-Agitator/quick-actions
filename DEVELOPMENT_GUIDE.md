# Quick Actions 开发指南

## 📋 目录

- [快速开始](#快速开始)
- [插件开发](#插件开发)
- [核心功能开发](#核心功能开发)
- [调试与测试](#调试与测试)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

---

## 🚀 快速开始

### 环境准备

#### 必需工具
```bash
# 1. 安装 Node.js (推荐 v18+)
https://nodejs.org/

# 2. 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 3. 安装 pnpm
npm install -g pnpm

# 4. 安装 Tauri CLI
cargo install tauri-cli --version "^2.0.0"
```

#### 验证安装
```bash
node --version    # v18.x.x
rustc --version   # rustc 1.70+
pnpm --version    # 8.x.x
cargo tauri --version  # tauri-cli 2.x.x
```

### 项目初始化

```bash
# 克隆项目
git clone <repository-url>
cd quick-actions

# 安装依赖
pnpm install

# 启动开发服务器
pnpm tauri dev
```

### 项目结构

```
quick-actions/
├── src/                    # 前端源代码 (React)
│   ├── components/         # React 组件
│   │   ├── SearchBar.tsx
│   │   ├── SearchResultList.tsx
│   │   └── PluginUI.tsx
│   ├── hooks/             # 自定义 Hooks
│   │   ├── usePlugins.ts
│   │   └── useApplications.ts
│   ├── utils/             # 工具函数
│   │   ├── pluginLoader.ts
│   │   ├── pluginAPI.ts
│   │   └── searchCache.ts
│   ├── types/             # TypeScript 类型定义
│   │   └── plugin.ts
│   └── App.tsx            # 主应用组件
│
├── src-tauri/             # 后端源代码 (Rust)
│   ├── src/
│   │   ├── lib.rs         # Tauri 应用入口
│   │   ├── commands.rs    # Tauri 命令处理
│   │   ├── plugin_manager.rs  # 插件管理器
│   │   └── plugin_api.rs  # 插件 API 实现
│   ├── libs/              # Sidecar 二进制文件
│   │   └── es-x86_64-pc-windows-msvc.exe
│   ├── capabilities/      # 权限配置
│   │   └── default.json
│   └── tauri.conf.json    # Tauri 配置
│
├── plugins/               # 内置插件
│   ├── everything-search/
│   └── json-explorer/
│
└── scripts/               # 构建脚本
    └── create-plugin.js
```

---

## 🔌 插件开发

### 插件类型

Quick Actions 支持三种插件类型：

| 类型 | 用途 | 复杂度 | 示例 |
|------|------|--------|------|
| **JS** | 简单逻辑插件 | ⭐ | 计算器、单位转换 |
| **ESM** | React UI 插件 | ⭐⭐⭐ | JSON Explorer、设置面板 |
| **HTML** | 静态页面插件 | ⭐⭐ | 帮助文档、关于页面 |

### 创建新插件

#### 方法 1: 使用脚手架脚本（推荐）

```bash
node scripts/create-plugin.js my-plugin
```

这会生成完整的插件结构：
```
plugins/my-plugin/
├── plugin.json          # 插件元数据
├── package.json         # 依赖配置
├── vite.config.ts       # Vite 配置
├── src/
│   ├── index.tsx        # 插件入口
│   └── App.tsx          # React 组件
└── README.md            # 插件说明
```

#### 方法 2: 手动创建

**步骤 1**: 创建插件目录
```bash
mkdir plugins/my-plugin
cd plugins/my-plugin
```

**步骤 2**: 创建 `plugin.json`
```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "A brief description",
  "author": "Your Name",
  "entry": "dist/index.js",
  "icon": "🚀",
  "keywords": ["demo", "example"],
  "entry_type": "esm"
}
```

**步骤 3**: 初始化 npm 项目
```bash
pnpm init
pnpm add react react-dom
pnpm add -D vite @vitejs/plugin-react typescript @types/react @types/react-dom
```

**步骤 4**: 创建 `vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/index.tsx',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
    },
  },
});
```

**步骤 5**: 创建插件代码

**简单 JS 插件示例** (`src/index.js`):
```javascript
export default {
  execute: async (query, ACTIONS) => {
    if (!query) return [];
    
    return [{
      title: `You searched: ${query}`,
      description: 'This is a simple plugin',
      icon: '🔍',
      action: async () => {
        await ACTIONS.notification.show('Result', `You clicked: ${query}`);
      },
    }];
  },
};
```

**React UI 插件示例** (`src/index.tsx`):
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';

// 导出 render 方法表示这是一个 UI 插件
export function render(container: HTMLElement, ACTIONS: any) {
  const root = ReactDOM.createRoot(container);
  root.render(<App ACTIONS={ACTIONS} />);
}

function App({ ACTIONS }: { ACTIONS: any }) {
  const handleClick = async () => {
    await ACTIONS.notification.show('Hello', 'World!');
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">My Plugin</h1>
      <button 
        onClick={handleClick}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Click Me
      </button>
    </div>
  );
}
```

**步骤 6**: 构建插件
```bash
pnpm build
```

**步骤 7**: 测试插件
1. 重启 Quick Actions 应用
2. 在搜索框输入插件名称
3. 点击插件查看效果

### ACTIONS API 使用

#### 1. 通知

```javascript
// 显示系统通知
await ACTIONS.notification.show('标题', '内容');
```

#### 2. 剪贴板

```javascript
// 写入剪贴板
await ACTIONS.clipboard.writeText('Hello World');

// 读取剪贴板
const text = await ACTIONS.clipboard.readText();
console.log(text);
```

#### 3. 文件系统

```javascript
// 列出目录
const files = await ACTIONS.fs.listDir('C:\\Users');
console.log(files);

// 获取文件信息
const info = await ACTIONS.fs.getInfo('C:\\test.txt');

// 搜索文件
const results = await ACTIONS.fs.searchFiles('C:\\Users', '*.txt', 10);
```

#### 4. 命令执行

```javascript
// 执行系统命令
const output = await ACTIONS.shell.execute('ping', ['google.com']);
console.log(output);
```

#### 5. 本地存储

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

#### 6. 实用工具

```javascript
// 格式化日期
const now = ACTIONS.utils.formatDate(new Date());

// 防抖函数
const debouncedSearch = ACTIONS.utils.debounce((query) => {
  console.log('Searching:', query);
}, 300);

// 节流函数
const throttledScroll = ACTIONS.utils.throttle(() => {
  console.log('Scrolled');
}, 100);

// 深拷贝
const cloned = ACTIONS.utils.deepClone(originalObject);

// 生成唯一 ID
const id = ACTIONS.utils.generateId();
```

### 插件调试

#### 方法 1: Console 日志

```javascript
export default {
  execute: async (query, ACTIONS) => {
    console.log('[MyPlugin] Query:', query);
    console.log('[MyPlugin] ACTIONS:', ACTIONS);
    
    try {
      // 你的代码
    } catch (error) {
      console.error('[MyPlugin] Error:', error);
    }
  },
};
```

#### 方法 2: Chrome DevTools

1. 在应用中按 `F12` 打开开发者工具
2. 切换到 Console 标签
3. 查看插件输出

#### 方法 3: 通知调试

```javascript
// 在关键位置显示通知
await ACTIONS.notification.show('Debug', 'Reached checkpoint 1');
```

### 插件发布

#### 打包插件

```bash
# 确保构建了最新版本
pnpm build

# 检查 dist 目录
ls dist/
# 应该包含: index.js (或 index.mjs)
```

#### 分享插件

1. **压缩插件目录**
   ```bash
   cd plugins
   zip -r my-plugin.zip my-plugin/
   ```

2. **上传到插件市场** (未来功能)

3. **手动安装**
   - 用户解压到 `%APPDATA%/quick-actions/plugins/`
   - 重启应用

---

## 💻 核心功能开发

### 添加新的 Tauri Command

**步骤 1**: 在 `commands.rs` 中定义命令

```rust
#[tauri::command]
pub fn my_custom_command(param1: String, param2: i32) -> Result<String, String> {
    eprintln!("[CustomCommand] Received: {} {}", param1, param2);
    
    // 你的逻辑
    let result = format!("Result: {} {}", param1, param2);
    
    Ok(result)
}
```

**步骤 2**: 在 `lib.rs` 中注册命令

```rust
.invoke_handler(tauri::generate_handler![
    // ... 其他命令
    commands::my_custom_command,
])
```

**步骤 3**: 在前端调用

```typescript
import { invoke } from '@tauri-apps/api/core';

const result = await invoke<string>('my_custom_command', {
  param1: 'hello',
  param2: 42,
});

console.log(result); // "Result: hello 42"
```

### 修改窗口行为

#### 调整主窗口大小

```rust
// commands.rs
#[tauri::command]
pub fn set_main_window_size(height: u32, window: WebviewWindow) -> Result<(), String> {
    window.set_size(tauri::Size::Logical(tauri::LogicalSize {
        width: 780.0,
        height: height as f64,
    })).map_err(|e| e.to_string())?;
    
    Ok(())
}
```

#### 添加 Acrylic 效果

```rust
// lib.rs - 窗口创建时
#[cfg(target_os = "windows")]
{
    use window_vibrancy::*;
    let _ = apply_acrylic(&window, Some((28, 28, 28, 180)));
}
```

### 集成新的 Sidecar

**步骤 1**: 下载二进制文件

```powershell
# 示例: 下载 ffmpeg
Invoke-WebRequest -Uri "https://github.com/..." -OutFile "src-tauri/libs/ffmpeg.exe"
```

**步骤 2**: 重命名为平台特定名称

```powershell
$targetTriple = (rustc -Vv | Select-String "host:" | ForEach-Object { $_.Line.Split(" ")[1] })
Copy-Item "libs/ffmpeg.exe" "libs/ffmpeg-$targetTriple.exe"
```

**步骤 3**: 配置 `tauri.conf.json`

```json
{
  "bundle": {
    "externalBin": ["libs/ffmpeg"],
    "resources": {
      "libs/ffmpeg-x86_64-pc-windows-msvc.exe": "libs/ffmpeg-x86_64-pc-windows-msvc.exe"
    }
  }
}
```

**步骤 4**: 更新 `build.rs`

```rust
// 复制 sidecar 文件
let src = PathBuf::from(&manifest_dir)
    .join("libs")
    .join("ffmpeg-x86_64-pc-windows-msvc.exe");

let dst_with_suffix = libs_dir.join("ffmpeg-x86_64-pc-windows-msvc.exe");
let dst_without_suffix = libs_dir.join("ffmpeg.exe");

if src.exists() {
    fs::copy(&src, &dst_with_suffix).ok();
    fs::copy(&src, &dst_without_suffix).ok();
}
```

**步骤 5**: 创建 Rust command

```rust
#[tauri::command]
pub async fn convert_video(
    input: String,
    output: String,
    app: tauri::AppHandle,
) -> Result<String, String> {
    let command = app.shell()
        .sidecar("libs/ffmpeg")
        .args(&["-i", &input, &output]);
    
    let output = command.output().await
        .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffmpeg error: {}", stderr));
    }
    
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
```

---

## 🐛 调试与测试

### 前端调试

#### Chrome DevTools

```bash
# 在应用中按 F12
# 或使用快捷键 Ctrl+Shift+I
```

**常用技巧**:
```javascript
// 查看所有全局变量
console.log(window);

// 查看 ACTIONS API
console.log(window.ACTIONS);

// 监控函数调用
console.monitor(myFunction);

// 性能分析
console.time('operation');
// ... 你的代码
console.timeEnd('operation');
```

#### React DevTools

1. 安装 React DevTools 浏览器扩展
2. 在 DevTools 中找到 React 标签
3. 检查组件树和状态

### 后端调试

#### 日志系统

```rust
// 不同级别的日志
log::debug!("[Module] Debug message");
log::info!("[Module] Info message");
log::warn!("[Module] Warning message");
log::error!("[Module] Error message");

// 查看日志文件
// 位置: %APPDATA%/com.develop.quick-actions/logs/
```

#### 标准错误输出

```rust
// 使用 eprintln 输出到控制台
eprintln!("[Debug] Variable value: {:?}", variable);
```

#### Rust 调试器

```bash
# 使用 rust-gdb 或 rust-lldb
rust-gdb target/debug/quick-actions
```

### 插件调试

#### 热重载

修改插件代码后：
```bash
# 重新构建插件
cd plugins/my-plugin
pnpm build

# 应用会自动检测变化并重新加载
```

#### 隔离测试

创建一个独立的测试页面：
```html
<!DOCTYPE html>
<html>
<body>
  <div id="root"></div>
  <script type="module">
    import plugin from './dist/index.js';
    
    // 模拟 ACTIONS API
    const mockACTIONS = {
      notification: {
        show: async (title, body) => console.log(title, body),
      },
    };
    
    // 测试插件
    const results = await plugin.execute('test', mockACTIONS);
    console.log('Results:', results);
  </script>
</body>
</html>
```

### 性能分析

#### 前端性能

```javascript
// 使用 Performance API
performance.mark('start');
// ... 你的代码
performance.mark('end');
performance.measure('my-operation', 'start', 'end');

const measure = performance.getEntriesByName('my-operation')[0];
console.log(`Took ${measure.duration}ms`);
```

#### 后端性能

```rust
use std::time::Instant;

let start = Instant::now();
// ... 你的代码
let duration = start.elapsed();
eprintln!("[Performance] Operation took {:?}", duration);
```

---

## ✨ 最佳实践

### 代码风格

#### TypeScript

```typescript
// ✅ 好的做法：明确的类型定义
interface PluginResult {
  title: string;
  description?: string;
  action: () => Promise<void>;
}

// ❌ 避免：使用 any
function process(data: any) { ... }
```

#### Rust

```rust
// ✅ 好的做法：使用 Result 处理错误
fn do_something() -> Result<String, String> {
    // ...
}

// ❌ 避免：过度使用 unwrap
let value = some_option.unwrap(); // 可能 panic!
```

### 错误处理

#### 前端

```typescript
try {
  const result = await ACTIONS.shell.execute('command', []);
  console.log(result);
} catch (error) {
  console.error('Command failed:', error);
  await ACTIONS.notification.show('Error', error.message);
}
```

#### 后端

```rust
pub fn my_function() -> Result<String, String> {
    some_operation().map_err(|e| {
        log::error!("[MyFunction] Failed: {}", e);
        format!("Operation failed: {}", e)
    })
}
```

### 性能优化

#### 1. 使用缓存

```typescript
// 记忆化搜索结果
const cache = new Map<string, PluginResult[]>();

async function search(query: string) {
  if (cache.has(query)) {
    return cache.get(query);
  }
  
  const results = await performSearch(query);
  cache.set(query, results);
  return results;
}
```

#### 2. 防抖和节流

```typescript
// 搜索输入防抖
const debouncedSearch = ACTIONS.utils.debounce(async (query) => {
  const results = await search(query);
  updateUI(results);
}, 300);
```

#### 3. 懒加载

```typescript
// 只在需要时加载插件
const plugin = await loadPlugin(pluginId);
```

### 安全性

#### 1. 输入验证

```rust
fn validate_path(path: &str) -> bool {
    // 防止目录穿越
    if path.contains("..") || path.starts_with("/") {
        return false;
    }
    
    // 检查是否在允许的目录内
    let full_path = PathBuf::from(BASE_DIR).join(path);
    full_path.starts_with(BASE_DIR)
}
```

#### 2. 命令白名单

```rust
const ALLOWED_COMMANDS = &["dir", "ping", "ipconfig", "tasklist"];

pub fn execute_command(command: &str) -> Result<String, String> {
    if !ALLOWED_COMMANDS.contains(&command) {
        return Err(format!("Command '{}' is not allowed", command));
    }
    
    // 执行命令
    // ...
}
```

#### 3. 数据隔离

```typescript
// 为每个插件使用独立的前缀
const STORAGE_PREFIX = `${pluginId}:`;

ACTIONS.storage.set(`${STORAGE_PREFIX}key`, value);
```

---

## ❓ 常见问题

### Q1: 插件加载失败？

**症状**: 控制台显示 "Failed to load plugin"

**解决**:
1. 检查 `plugin.json` 格式是否正确
2. 确认 `entry` 路径指向正确的文件
3. 确保插件已构建 (`pnpm build`)
4. 检查浏览器控制台的具体错误信息

### Q2: ACTIONS API 不可用？

**症状**: `window.ACTIONS is undefined`

**解决**:
1. 确保插件通过 `PluginUI` 组件加载
2. 检查 `pluginLoader.ts` 是否正确注入 API
3. 确认插件类型是 `esm` 或 `js`

### Q3: Everything 搜索不工作？

**症状**: 搜索返回空结果或错误

**解决**:
1. 确认 Everything 应用程序正在运行
2. 检查 `libs/es-x86_64-pc-windows-msvc.exe` 是否存在
3. 查看日志中的 `[Everything CLI]` 前缀消息
4. 尝试在命令行直接运行 es.exe 测试

### Q4: 窗口不显示 Acrylic 效果？

**症状**: 窗口背景是纯色而不是毛玻璃

**解决**:
1. 确认 Windows 版本支持 Acrylic (Win10 1809+)
2. 检查 `window-vibrancy` crate 是否正确安装
3. 确认窗口设置了 `transparent: true`

### Q5: 插件窗口无法关闭？

**症状**: 点击关闭按钮无反应

**解决**:
1. 检查是否正确调用了 `window.hide()`
2. 确认事件监听器正确注册
3. 查看控制台是否有 JavaScript 错误

### Q6: 构建失败？

**症状**: `pnpm tauri build` 报错

**解决**:
```bash
# 清理构建缓存
cargo clean
rm -rf dist/

# 重新安装依赖
pnpm install

# 重新构建
pnpm tauri build
```

### Q7: 图标加载慢？

**症状**: 应用启动时卡顿

**解决**:
1. 检查图标缓存目录是否可写
2. 清除缓存重新生成: 删除 `%LOCALAPPDATA%/quick-actions/icon-cache/`
3. 减少同时加载的应用数量

---

## 📚 学习资源

### 官方文档
- [Tauri v2 文档](https://v2.tauri.app/)
- [React 文档](https://react.dev/)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)
- [Rust Book](https://doc.rust-lang.org/book/)

### 社区资源
- [Tauri Discord](https://discord.gg/tauri)
- [Rust Users Forum](https://users.rust-lang.org/)
- [Reactiflux](https://www.reactiflux.com/)

### 相关项目
- [Alfred](https://www.alfredapp.com/) - macOS 快速启动器
- [Wox](http://www.wox.one/) - Windows 快速启动器
- [Flow Launcher](https://flowlauncher.com/) - 开源快速启动器

---

## 🤝 贡献指南

### 提交 Issue

1. 搜索现有 issue，避免重复
2. 提供详细的复现步骤
3. 附上日志文件和截图
4. 说明环境和版本信息

### 提交 PR

1. Fork 项目
2. 创建特性分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'Add amazing feature'`
4. 推送到分支: `git push origin feature/amazing-feature`
5. 创建 Pull Request

### 代码审查清单

- [ ] 代码符合风格指南
- [ ] 添加了必要的测试
- [ ] 更新了文档
- [ ] 没有引入安全漏洞
- [ ] 性能影响可接受

---

**最后更新**: 2026-04-15  
**版本**: v0.1.0  
**维护者**: Quick Actions Team
