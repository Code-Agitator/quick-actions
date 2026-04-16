# Process Manager 插件 - 快速启动指南

## 🚀 5分钟上手

### 1. 安装依赖

```bash
cd plugins/process-manager
pnpm install
```

### 2. 开发模式

```bash
pnpm dev
```

浏览器会自动打开 `http://localhost:5174`（端口可能不同）

### 3. 构建生产版本

```bash
pnpm build
```

输出文件：`dist/index.js` (343 KB)

---

## 💡 核心功能演示

### 🔍 多维度搜索

#### 按名称搜索
```
模式: 📝 名称
输入: chrome
结果: 显示所有名称包含"chrome"的进程
```

#### 按端口搜索
```
模式: 🔌 端口
输入: 8080
结果: 显示占用8080端口的进程
典型应用: Node.js, Java Web服务器
```

#### 按文件搜索
```
模式: 📁 文件
输入: C:\Users\test\document.docx
结果: 显示正在使用该文件的进程
典型应用: 解决"文件被占用无法删除"问题
```

#### 综合搜索
```
模式: 🔍 全部
输入: 1234 或 chrome
结果: 匹配PID或名称
```

---

## ⌨️ 界面操作

### 主界面

```
┌──────────────────────────────────────────┐
│ ┌────┐ 进程管理器    [🔄自动] [🔄刷新]   │
│ │ ⚙️ │ 最后更新: 14:30                  │
│ └────┘                                  │
│ [🔍全部▼] [搜索... ⟳]                  │
├──────────────────────────────────────────┤
│ PID  │ 进程名称    │ CPU  │ 内存  │ 操作│
│ 1234 │ chrome.exe  │ 5.2% │ 256MB │ 🛑  │
│      │ 🔌8080      │      │       │     │
├──────────────────────────────────────────┤
│ 共 150 个进程  💡点击行查看详情          │
└──────────────────────────────────────────┘
```

### 操作流程

1. **查看进程列表**
   - 自动每10秒刷新
   - 可手动点击"刷新"按钮
   - 可开关自动刷新

2. **搜索进程**
   - 选择搜索模式
   - 输入关键词
   - 等待300ms自动搜索

3. **查看详情**
   - 点击任意进程行
   - 查看完整信息
   - 查看端口和文件

4. **终止进程**
   - 方式1: 表格行的"🛑 终止"按钮
   - 方式2: 详情弹窗中的"强制终止"
   - 方式3: 详情弹窗中的"优雅终止"

---

## 🎨 UI特性

### 视觉设计

- ✅ **渐变色彩**: 蓝紫渐变主题
- ✅ **图标系统**: Emoji增强可读性
- ✅ **动画效果**: 滑入、缩放、旋转
- ✅ **暗色模式**: 完整的dark mode支持

### 交互反馈

- ✅ **Toast通知**: 成功/失败/提示
- ✅ **Loading状态**: 旋转指示器
- ✅ **Hover效果**: 渐变高亮
- ✅ **颜色编码**: CPU使用率红黄绿

### 响应式设计

- ✅ 适配不同窗口大小
- ✅ 表格列宽固定
- ✅ 滚动条优化
- ✅ 触摸友好

---

## 🔧 技术架构

### 前端 (TypeScript + React)

```
plugins/process-manager/
├── src/
│   ├── App.tsx          # 主组件 (456行)
│   ├── index.tsx        # 入口文件
│   └── types/
│       └── plugin.d.ts  # 类型定义
├── dist/
│   └── index.js         # 构建产物
└── package.json
```

### 后端 (Rust)

```
src-tauri/src/
├── process_manager.rs   # 进程管理模块 (389行)
└── lib.rs               # 命令注册
```

### API接口

```typescript
interface ProcessAPI {
  listProcesses(): Promise<ProcessInfo[]>;
  getProcess(pid: number): Promise<ProcessInfo | null>;
  searchByName(name: string): Promise<ProcessInfo[]>;
  findByPort(port: number): Promise<ProcessInfo[]>;
  findByFile(filePath: string): Promise<ProcessInfo[]>;
  killProcess(pid: number): Promise<boolean>;
  gracefulKill(pid: number): Promise<boolean>;
  getProcessStats(pid: number): Promise<{cpu: number; memory: number}>;
  getOpenFiles(pid: number): Promise<string[]>;
  getListeningPorts(pid: number): Promise<number[]>;
}
```

---

## 📊 性能指标

| 指标 | 数值 |
|------|------|
| 初始加载 | ~500ms |
| 搜索响应 | ~300ms (防抖后) |
| 内存占用 | ~50MB |
| CPU占用 | <1% (空闲) |
| 刷新间隔 | 10秒 |
| 构建大小 | 343 KB (gzip: 78 KB) |

---

## ⚠️ 注意事项

### 权限要求

- 某些系统进程可能需要管理员权限才能终止
- 建议以管理员身份运行Quick Actions

### 系统兼容性

- ✅ Windows 10/11
- ❌ macOS (未实现)
- ❌ Linux (未实现)

### 安全警告

- ⚠️ 终止系统进程可能导致系统不稳定
- ⚠️ 谨慎操作关键进程（如explorer.exe）
- ⚠️ 命令行参数可能包含敏感信息

---

## 🐛 常见问题

### Q1: 搜索没有结果？

**A**: 检查以下几点：
1. 确认搜索模式正确
2. 检查拼写是否正确
3. 尝试更换关键词
4. 查看Toast提示信息

### Q2: 进程列表不更新？

**A**: 
1. 检查自动刷新是否开启
2. 手动点击"刷新"按钮
3. 查看控制台错误信息

### Q3: 无法终止进程？

**A**: 
1. 确认是否有足够权限
2. 尝试"强制终止"而非"优雅终止"
3. 某些系统进程无法终止

### Q4: 端口搜索不准确？

**A**: 
1. netstat输出可能因系统语言而异
2. 确保端口号是数字
3. 检查端口是否真的被占用

---

## 🎯 最佳实践

### 1. 查找Web服务器

```
场景: 8080端口被占用，想知道是哪个程序

步骤:
1. 选择"🔌 端口"模式
2. 输入: 8080
3. 查看结果中的进程名称
4. 点击查看详情确认
5. 如需终止，点击"终止"按钮
```

### 2. 解决文件锁定

```
场景: 无法删除文件，提示"文件正在使用"

步骤:
1. 选择"📁 文件"模式
2. 粘贴文件路径
3. 查看占用该文件的进程
4. 关闭相关程序或终止进程
5. 再次尝试删除文件
```

### 3. 监控系统资源

```
场景: 电脑变慢，想找出占用资源的进程

步骤:
1. 开启自动刷新
2. 观察CPU列（红色表示>50%）
3. 观察内存列（数值大的）
4. 点击可疑进程查看详情
5. 必要时终止进程
```

---

## 📚 扩展阅读

- [README.md](./README.md) - 完整使用说明
- [CODE_REVIEW.md](./CODE_REVIEW.md) - 代码审查报告
- [OPTIMIZATION_SUMMARY.md](./OPTIMIZATION_SUMMARY.md) - 优化总结

---

## 🆘 获取帮助

### 文档
- 查看插件目录下的Markdown文档
- 阅读代码注释

### 调试
```bash
# 开发模式查看详细日志
pnpm dev

# 查看浏览器控制台
F12 -> Console
```

### 反馈
- 提交Issue到项目仓库
- 描述问题和复现步骤
- 附上截图或日志

---

## 🎉 开始使用

现在你已经了解了所有基础知识，开始使用进程管理器吧！

```bash
# 1. 进入插件目录
cd plugins/process-manager

# 2. 安装依赖
pnpm install

# 3. 启动开发服务器
pnpm dev

# 4. 在Quick Actions中打开插件
# 享受现代化的进程管理体验！
```

---

**最后更新**: 2026-04-16  
**版本**: v1.1.0  
**维护者**: Quick Actions Team
