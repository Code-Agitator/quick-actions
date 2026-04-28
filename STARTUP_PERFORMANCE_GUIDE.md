# 应用启动性能优化指南

## 概述

本文档描述了 Quick Actions 应用启动时的性能监控日志系统，帮助你快速定位性能瓶颈。

## 日志系统架构

### 后端日志（Rust）

后端使用 `eprintln!` 输出启动日志，格式如下：

```
[Startup] ========================================
[Startup] Quick Actions starting...
[Startup] ========================================

[Startup] [1/6] Setup phase started
[Startup]   - PluginManager initialized in 2.34ms
[Startup]   - Plugin scan completed: 4 plugins in 15.67ms
[Startup]   - AppState registered in 0.12ms
[Startup] [2/6] Creating plugin window pool...
[Startup]   - Creating slot 0...
[Startup]     - Applied Acrylic + rounded corners
[Startup]   ✓ Slot 0 created in 45.23ms
...
[Startup]   - Window pool created: 5 slots in 234.56ms
[Startup]   - Window pool updated in 0.08ms
[Startup] [3/6] Starting clipboard monitor...
[Startup]   - Clipboard monitor started in 1.23ms
[Startup] [4/6] Creating tray icon...
[Startup]   - Tray icon created in 12.34ms
[Startup] [5/6] Configuring main window...
[Startup]   - Applied Acrylic effect
[Startup]   - Applied Windows 11 rounded corners
[Startup]   - Main window configured in 8.90ms
[Startup] [6/6] Registering shortcuts and event handlers...
[Startup]   - Hardcoded Ctrl+Space registered
[Startup]   - Global shortcut will be registered dynamically from frontend
[Startup]   - Main window focus event handler: DISABLED
[Startup]   - Focus loss handler registered
[Startup]   - Shortcuts and handlers registered in 5.67ms

[Startup] Setup phase completed in 325.89ms

```

### 前端日志（TypeScript）

前端使用 `console.log` 输出启动日志，格式如下：

```
[Frontend] App component initialized at 1.23ms
[Frontend] Hooks initialized at 5.67ms
[Frontend] ========================================
[Frontend] App mounted successfully in 12.34ms
[Frontend] ========================================
[Frontend] Debug initialized in 2.34ms
[Frontend] [500.12ms] Starting shortcut registration...
[Frontend] [502.45ms] Registering global shortcut: Ctrl+Space
[Frontend] [510.67ms] ✓ Global shortcut registered
```

## 启动阶段详解

### 后端启动阶段

| 阶段 | 说明 | 预期耗时 | 优化建议 |
|------|------|----------|----------|
| **[1/6] Setup phase** | 初始化插件管理器、扫描插件、注册状态 | 50-200ms | 减少插件数量，优化插件扫描逻辑 |
| **[2/6] Window pool** | 创建 5 个插件窗口池 | 200-500ms | **瓶颈！** 考虑延迟创建或减少窗口数量 |
| **[3/6] Clipboard monitor** | 启动剪贴板监听线程 | 1-5ms | 无需优化 |
| **[4/6] Tray icon** | 创建系统托盘图标 | 5-20ms | 无需优化 |
| **[5/6] Main window** | 配置主窗口（Acrylic + 圆角） | 5-15ms | 无需优化 |
| **[6/6] Shortcuts** | 注册快捷键和事件处理器 | 5-10ms | 无需优化 |

### 前端启动阶段

| 阶段 | 说明 | 预期耗时 | 优化建议 |
|------|------|----------|----------|
| **Component init** | 组件初始化、状态创建 | 1-5ms | 无需优化 |
| **Hooks init** | 调用自定义 hooks | 5-15ms | 优化 hooks 内部逻辑 |
| **Mount** | 组件挂载完成 | 10-30ms | 减少初始渲染工作量 |
| **Debug init** | 调试系统初始化 | 1-5ms | 无需优化 |
| **Shortcut register** | 注册全局快捷键（延迟 500ms） | 5-15ms | 无需优化 |

## 常见性能瓶颈

### 1. 窗口池创建过慢（[2/6]）

**症状**：窗口池创建耗时 > 500ms

**原因**：
- 创建 5 个 WebviewWindow 需要大量系统资源
- 每个窗口都需要应用 Acrylic 效果和圆角

**优化方案**：
```rust
// 方案 1：减少窗口池大小
for i in 0..3 {  // 从 5 改为 3

// 方案 2：延迟创建窗口池（在首次需要时创建）
// 方案 3：使用懒加载，只创建 1-2 个窗口
```

### 2. 插件扫描过慢（[1/6]）

**症状**：插件扫描耗时 > 100ms

**原因**：
- 插件目录文件过多
- 插件 JSON 解析慢

**优化方案**：
```rust
// 方案 1：缓存插件列表
// 方案 2：异步扫描插件
// 方案 3：只扫描必要的插件目录
```

### 3. 前端挂载过慢

**症状**：前端挂载耗时 > 50ms

**原因**：
- 初始渲染数据过多
- hooks 执行耗时

**优化方案**：
```typescript
// 方案 1：使用 React.memo 优化组件
// 方案 2：延迟加载非关键数据
// 方案 3：使用 useMemo 缓存计算结果
```

## 性能监控方法

### 方法 1：查看控制台日志

启动应用后，在控制台查看完整的启动日志：

```bash
# Windows PowerShell
cargo run

# 或者使用 Tauri CLI
npm run tauri dev
```

### 方法 2：分析日志文件

日志文件位置：
```
%APPDATA%/com.develop.quick-actions/logs/
```

### 方法 3：使用时间线工具

在浏览器开发者工具中查看前端性能时间线：
- 打开 DevTools（F12）
- 切换到 Performance 标签
- 录制启动过程
- 分析各个阶段的耗时

## 优化建议

### 短期优化（立即生效）

1. **减少窗口池大小**：从 5 个减少到 2-3 个
2. **延迟插件扫描**：在后台异步扫描
3. **缓存插件列表**：避免每次启动都扫描

### 中期优化（需要代码修改）

1. **窗口池懒加载**：首次使用时才创建窗口
2. **插件热更新**：支持运行时加载/卸载插件
3. **前端代码分割**：使用动态 import 减少初始加载

### 长期优化（架构改进）

1. **IPC 优化**：减少前端和后端通信次数
2. **数据缓存**：缓存应用列表、图标等数据
3. **增量更新**：只更新变化的部分

## 性能目标

| 指标 | 当前值 | 目标值 | 状态 |
|------|--------|--------|------|
| 后端启动时间 | ~300-500ms | < 200ms | ⚠️ 需优化 |
| 前端挂载时间 | ~15-30ms | < 20ms | ✅ 良好 |
| 首次交互时间 | ~500-800ms | < 300ms | ⚠️ 需优化 |
| 插件加载时间 | ~15-50ms | < 20ms | ✅ 良好 |

## 日志级别控制

### 后端日志

修改 `src-tauri/tauri.conf.json`：

```json
{
  "plugins": {
    "log": {
      "level": "debug"  // trace, debug, info, warn, error
    }
  }
}
```

### 前端日志

修改 `src/utils/debugLogger.ts`：

```typescript
export const DEBUG_CONFIG = {
  enabled: true,  // 设为 false 关闭所有日志
  level: 'debug',  // trace, debug, info, warn, error
};
```

## 故障排查

### 问题：应用启动卡住

**排查步骤**：
1. 查看控制台日志，确定卡在哪个阶段
2. 检查该阶段的耗时是否异常
3. 查看日志文件是否有错误信息
4. 使用 `cargo run --release` 测试发布模式性能

### 问题：窗口创建失败

**排查步骤**：
1. 查看 `[2/6] Window pool` 阶段的日志
2. 检查是否有 `✗ Failed to create slot` 错误
3. 确认系统支持 Acrylic 效果（Windows 10/11）
4. 尝试减少窗口池大小

### 问题：插件加载失败

**排查步骤**：
1. 查看 `[1/6] Setup phase` 阶段的日志
2. 检查插件扫描是否成功
3. 确认插件目录存在且格式正确
4. 查看插件 JSON 文件是否有语法错误

## 联系支持

如果遇到问题，请提供以下信息：
1. 完整的启动日志
2. 系统环境（Windows 版本）
3. 应用版本
4. 插件列表

---

**最后更新**: 2025-04-24
**维护者**: Quick Actions Team
