# Everything 搜索插件

通过 Everything 软件快速搜索本地文件的 Quick Actions 插件。

## 功能特性

- 🔍 **极速搜索** - 利用 Everything 的索引技术，实现毫秒级文件搜索
- 📊 **详细信息** - 显示文件名、路径、大小、修改时间等详细信息
- ⌨️ **键盘导航** - 支持方向键选择，Enter 键打开文件
- 🎯 **双击打开** - 双击文件或文件夹直接打开
- 🌐 **中文支持** - 完整的中文字符搜索支持
- ⚡ **无需配置** - 使用 es.exe CLI 工具，无需启用 HTTP 服务器
- 🚀 **系统集成** - 使用系统默认应用打开文件，更可靠

## 前置要求

### 安装 Everything

下载并安装 [Everything](https://www.voidtools.com/zh-cn/) 软件。

**重要**：确保 Everything 正在运行，插件会自动使用内置的 es.exe CLI 工具进行搜索。

## 使用方法

### 在主窗口中搜索

1. 按 `Alt + Space` 呼出 Quick Actions
2. 输入关键词搜索插件
3. 选择 "Everything 搜索" 插件
4. 在插件界面中输入关键词进行搜索

### 在插件中使用

1. **搜索文件**：在搜索框输入关键词
2. **浏览结果**：使用 ↑ ↓ 方向键选择结果
3. **打开文件**：按 Enter 键、单击或双击打开选中的文件/文件夹
4. **系统集成**：使用系统默认应用打开文件，更加可靠

## 开发

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

### 构建生产版本

```bash
pnpm build
```

## 技术实现

### es.exe Sidecar

插件通过 Tauri Sidecar 机制调用 Everything 的命令行工具 `es.exe` 进行搜索：

```rust
// Rust 后端代码
let command = app.shell()
    .sidecar("libs/es")
    .args(&[&query, "-json", "-max-results", "100"]);
```

**优势**：
- ✅ 无需配置 HTTP 服务器
- ✅ 更快的搜索速度
- ✅ 更可靠的连接
- ✅ 统一的架构设计

### ACTIONS API

插件通过 ACTIONS.everything 调用后端：

```typescript
// 搜索文件
const results = await window.ACTIONS.everything.search('关键词');

// 打开文件
await window.ACTIONS.everything.open('C:\\path\\to\\file.txt');

// 在文件夹中显示文件
await window.ACTIONS.everything.revealInFolder('C:\\path\\to\\file.txt');
```

### 响应格式

```json
[
  {
    "name": "filename.txt",
    "path": "C:\\Users\\...",
    "size": 1024,
    "dateModified": "2024-01-01 12:00:00"
  }
]
```

## 常见问题

### Q: 搜索没有结果？

A: 请检查：
1. Everything 是否正在运行
2. Everything 是否已建立索引（首次启动需要时间）
3. 搜索关键词是否正确
4. 尝试在 Everything 主程序中手动搜索测试

### Q: 提示 "es.exe" 相关错误？

A: 这通常表示 es.exe 文件缺失或损坏。请重新构建项目：
```bash
pnpm tauri:dev
```

### Q: 支持正则表达式吗？

A: 支持！Everything 支持完整的正则表达式语法，可以直接在搜索框中使用。

## 许可证

MIT License
