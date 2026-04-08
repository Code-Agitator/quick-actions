# Everything 搜索插件

通过 Everything 软件快速搜索本地文件的 Quick Actions 插件。

## 功能特性

- 🔍 **极速搜索** - 利用 Everything 的索引技术，实现毫秒级文件搜索
- 📊 **详细信息** - 显示文件名、路径、大小、修改时间等详细信息
- ⌨️ **键盘导航** - 支持方向键选择，Enter 键打开文件
- 🎯 **双击打开** - 双击文件或文件夹直接打开
- 🌐 **中文支持** - 完整的中文字符搜索支持

## 前置要求

### 1. 安装 Everything

下载并安装 [Everything](https://www.voidtools.com/zh-cn/) 软件。

### 2. 启用 HTTP 服务器

1. 打开 Everything
2. 点击菜单：**工具** → **选项**
3. 选择左侧的 **HTTP 服务器**
4. ✅ 勾选 **启用 HTTP 服务器**
5. 📝 记下端口号（默认通常是 6808）
6. 点击 **确定** 保存设置

**重要**：请在插件界面中设置与 Everything 相同的端口号！

![Everything HTTP 服务器设置](https://www.voidtools.com/support/everything/http_server/)

## 使用方法

### 在主窗口中搜索

1. 按 `Alt + Space` 呼出 Quick Actions
2. 输入关键词搜索插件
3. 选择 "Everything 搜索" 插件
4. 在插件界面中输入关键词进行搜索

### 在插件中使用

1. **搜索文件**：在搜索框输入关键词
2. **浏览结果**：使用 ↑ ↓ 方向键选择结果
3. **打开文件**：按 Enter 键或双击打开选中的文件/文件夹

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

### Everything HTTP API

插件通过 Everything 的 HTTP API 进行搜索，使用 JSONP 方式绕过浏览器 CORS 限制：

```
http://localhost/?json=1&callback=xxx&search=关键词
```

支持的参数：
- `json=1` - 返回 JSON 格式
- `path_column=1` - 包含路径信息
- `size_column=1` - 包含文件大小
- `date_modified_column=1` - 包含修改时间
- `count=100` - 最多返回 100 条结果
- `search=xxx` - 搜索关键词
- `callback=xxx` - JSONP 回调函数名

**注意**：
- URL 是 `http://localhost/` 而不是 `http://localhost/Everything`
- 使用 JSONP（动态创建 script 标签）而非 fetch，避免跨域问题
- 不需要修改 Tauri Rust 代码，完全在前端实现

### 响应格式

```json
{
  "results": [
    {
      "name": "filename.txt",
      "path": "C:\\Users\\...",
      "size": "1024",
      "date-modified": "132934567890123456"
    }
  ]
}
```

## 常见问题

### Q: 搜索没有结果？

A: 请检查：
1. Everything 是否正在运行
2. HTTP 服务器是否已启用
3. 端口是否正确（默认 80）
4. 防火墙是否阻止了连接

### Q: 如何更改端口？

A: 在 Everything 的 HTTP 服务器设置中修改端口，然后更新插件代码中的 URL。

### Q: 支持正则表达式吗？

A: 支持！Everything 支持完整的正则表达式语法，可以直接在搜索框中使用。

## 许可证

MIT License
