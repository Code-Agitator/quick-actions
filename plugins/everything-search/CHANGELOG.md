# Everything Search 插件更新日志

## [1.2.0] - 2026-04-16

### ✨ 新增功能
- 添加 `ACTIONS.everything.open()` API，使用系统默认应用打开文件
- 添加 `ACTIONS.everything.revealInFolder()` API，在文件管理器中显示文件
- 改进文件打开方式，更加可靠和稳定

### 🔧 技术改进
- 后端添加 `open_path` 和 `reveal_in_folder` 命令
- 使用 Tauri Opener 插件替代 `window.open()`
- 支持路径验证，防止打开不存在的文件
- 提供降级方案，确保兼容性

### 📝 文档更新
- 更新 README，添加新 API 使用说明
- 更新使用说明，说明新的打开方式

---

## [1.1.0] - 2026-04-16

### ✨ 新增功能
- 使用 es.exe Sidecar 替代 HTTP API，无需配置 HTTP 服务器
- 添加 `ACTIONS.everything.search()` API，提供更简洁的调用方式
- 改进错误提示，更清晰地说明问题原因和解决方案

### 🔧 技术改进
- 移除端口配置界面，简化用户操作
- 优化搜索性能，直接使用 CLI 工具而非 HTTP 请求
- 统一架构设计，与项目整体风格保持一致

### 📝 文档更新
- 更新 README.md，反映新的使用方式
- 移除 HTTP 服务器配置相关说明
- 添加 es.exe Sidecar 技术实现说明

### 🐛 修复
- 修复 HTTP 跨域问题（通过后端代理解决）
- 修复端口配置复杂性导致的用户体验问题

---

## [1.0.0] - 2026-04-15

### 初始版本
- 基于 Everything HTTP API 实现文件搜索
- 支持关键词搜索、键盘导航、双击打开
- 提供详细的文件信息展示
