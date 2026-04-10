# 插件窗口重构测试指南

## 核心改进

1. **唯一窗口标签** - 使用时间戳避免冲突：`plugin-{id}-{timestamp}`
2. **URL 参数传递** - 通过查询字符串传递插件信息，不再依赖全局变量
3. **简化窗口管理** - 移除复杂的条件编译和后台线程
4. **完善错误处理** - 显示友好的错误信息
5. **统一日志格式** - 使用 `[Window Manager]` 前缀便于追踪

## 测试步骤

### 1. 启动应用
```bash
pnpm tauri dev
```

### 2. 观察初始状态
- ✅ 应用启动后主窗口应该隐藏
- ✅ Rust 终端应该没有错误

### 3. 呼出主窗口
- 按 `Alt+Space`
- ✅ 主窗口应该出现
- ✅ 可以在主窗口按 F12 打开开发者工具

### 4. 打开第一个插件
1. 在主窗口搜索并选择一个插件（如 "Everything 搜索"）
2. 按 Enter 或点击

**预期 Rust 日志：**
```
[Window Manager] === OPEN PLUGIN WINDOW ===
[Window Manager] plugin_id: everything-search
[Window Manager] plugin_name: Everything 搜索
[Window Manager] entry: dist/index.js
[Window Manager] window_label: plugin-everything-search-1234567890
[Window Manager] URL path: /index.html?window=plugin&id=everything-search&entry=dist/index.js
[Window Manager] Using WebviewUrl::App
[Window Manager] Creating window...
[Window Manager] Window created successfully
[Window Manager] Window label: plugin-everything-search-1234567890
[Window Manager] Hiding main window
[Window Manager] === WINDOW CREATION COMPLETE ===
```

**预期浏览器控制台（新窗口）：**
```
=== WINDOW DETECTION ===
URL: http://localhost:1420/index.html?window=plugin&id=everything-search&entry=dist/index.js
Search params: {window: 'plugin', id: 'everything-search', entry: 'dist/index.js'}
window param: plugin
__PLUGIN_INFO__: undefined
Is plugin window: true
======================

[PluginApp] === PARSING PLUGIN INFO ===
[PluginApp] Full URL: http://localhost:1420/index.html?window=plugin&id=everything-search&entry=dist/index.js
[PluginApp] Search: ?window=plugin&id=everything-search&entry=dist/index.js
[PluginApp] Parsed - pluginId: everything-search , entry: dist/index.js
[PluginApp] ==========================

[Plugin Window] === LOADING PLUGIN ===
[Plugin Window] pluginId: everything-search
[Plugin Window] entry: dist/index.js
[Plugin Window] Fetching plugins list...
[Plugin Window] Found X plugins
[Plugin Window] Plugin meta: found
[Plugin Window] Loading plugin: Everything 搜索
[Plugin Window] Plugin loaded and window shown
```

**验证点：**
- ✅ 新窗口出现，显示插件内容（不是白屏）
- ✅ 新窗口可以按 F12 打开开发者工具
- ✅ 新窗口的标题是插件名称
- ✅ 新窗口有标题栏和关闭按钮（decorations: true）
- ✅ 主窗口已隐藏

### 5. 测试 ESC 键
在插件窗口按 `ESC`

**预期 Rust 日志：**
```
[Window Manager] hide_window called on: plugin-everything-search-1234567890
[Window Manager] Window hidden
[Window Manager] Plugin window hidden, showing main window
[Window Manager] Main window shown and focused
```

**验证点：**
- ✅ 插件窗口隐藏
- ✅ 主窗口重新出现并获得焦点

### 6. 测试重复打开同一插件
1. 再次搜索并打开同一个插件
2. 观察窗口标签是否不同（时间戳不同）

**预期：**
- ✅ 旧窗口被关闭
- ✅ 新窗口创建，标签包含新的时间戳
- ✅ 不会出现渲染错乱

### 7. 测试打开不同插件
1. 打开插件 A
2. 关闭插件 A（ESC）
3. 打开插件 B

**验证点：**
- ✅ 每个插件在独立的窗口中
- ✅ 窗口之间不会互相干扰
- ✅ 不会出现"在插件窗口显示主窗口内容"的情况

### 8. 测试主窗口关闭
在主窗口按 `ESC` 或点击外部

**预期 Rust 日志：**
```
[Window Manager] hide_window called on: main
[Window Manager] Window hidden
```

**验证点：**
- ✅ 主窗口隐藏
- ✅ 可以再次按 Alt+Space 呼出

## 常见问题排查

### 问题 1：窗口创建卡住
**症状：** Rust 日志停在 "Creating window..." 没有后续

**可能原因：**
- Tauri v2 开发模式限制
- 权限配置问题

**解决：**
检查 `src-tauri/capabilities/default.json` 是否包含：
```json
"windows": ["main", "plugin*"]
```

### 问题 2：插件窗口白屏
**症状：** 窗口打开但显示空白

**检查：**
1. 在插件窗口按 F12 打开开发者工具
2. 查看控制台是否有错误
3. 检查 Network 标签看资源是否加载成功

**常见原因：**
- URL 参数丢失
- 插件文件路径错误
- Vite dev server 未启动

### 问题 3：渲染错乱
**症状：** 插件窗口显示主窗口内容或其他插件内容

**检查：**
1. 查看浏览器控制台的 "WINDOW DETECTION" 日志
2. 确认 `Is plugin window: true`
3. 检查 URL 是否包含正确的查询参数

**解决：**
- 确保每个窗口有唯一的标签（已使用时间戳）
- 确保从 URL 参数读取插件信息（不依赖全局变量）

### 问题 4：ESC 键无效
**症状：** 按 ESC 窗口不隐藏

**检查：**
1. 查看 Rust 日志是否有 "hide_window called"
2. 检查前端是否正确调用 `invoke('hide_window')`

**解决：**
- 确认 `hide_window` 命令签名正确
- 确认窗口标签匹配

## 调试技巧

### 查看所有窗口
在 Rust 代码中添加：
```rust
let windows = app.webview_windows();
for (label, _) in windows.iter() {
    eprintln!("[Debug] Active window: {}", label);
}
```

### 强制刷新插件窗口
如果窗口状态混乱，可以：
1. 关闭所有插件窗口
2. 重启应用
3. 重新测试

### 检查 URL 参数
在浏览器控制台：
```javascript
console.log(new URLSearchParams(window.location.search));
```

## 成功标志

✅ 每个插件在独立窗口中运行
✅ 窗口之间互不干扰
✅ ESC 键正常工作
✅ 可以在所有窗口中使用 F12
✅ 没有渲染错乱
✅ 主窗口可以正常显示/隐藏
