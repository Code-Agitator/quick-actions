# Process Manager 插件

Windows 进程管理插件，支持多维度进程搜索和管理。

## ✨ 功能特性

### 🔍 多维度搜索

- **名称搜索**: 根据进程名称模糊搜索
- **端口搜索**: 输入端口号（如 8080）查找占用该端口的进程
- **文件搜索**: 输入文件路径查找占用该文件的进程
- **PID 搜索**: 直接输入进程 ID 查找

### 📊 进程信息展示

- PID (进程 ID)
- 进程名称
- CPU 使用率
- 内存占用
- 用户信息
- 线程数
- 命令行参数
- 监听端口列表
- 打开的文件列表

### ⚙️ 进程管理

- 查看进程详细信息
- 终止进程（强制）
- 优雅终止进程
- 实时刷新（每5秒自动更新）

## 🎯 使用场景

### 1. 查找占用端口的进程

```
搜索模式: 端口
输入: 8080
结果: 显示所有占用 8080 端口的进程
```

**典型应用**:
- 端口冲突排查
- 查找 Web 服务器进程
- 调试网络应用

### 2. 查找占用文件的进程

```
搜索模式: 文件
输入: C:\Users\test\document.docx
结果: 显示所有正在使用该文件的进程
```

**典型应用**:
- 文件被锁定无法删除
- 查找哪个程序在使用文件
- 解决"文件正在使用"错误

### 3. 快速终止进程

```
1. 搜索进程名称
2. 点击"终止"按钮
3. 确认操作
```

**典型应用**:
- 结束无响应的程序
- 清理僵尸进程
- 释放系统资源

## 🛠️ 技术实现

### Rust 后端

使用 Windows API 和系统命令实现：

- `tasklist`: 获取进程列表
- `netstat`: 查询端口占用
- `PowerShell`: 高级进程查询
- `taskkill`: 终止进程

### TypeScript 前端

- React 19 + TypeScript
- 响应式界面设计
- 实时数据刷新
- 模态框详情展示

## 📋 API 接口

通过 `ACTIONS.process` 访问：

```typescript
// 获取所有进程
const processes = await ACTIONS.process.listProcesses();

// 根据 PID 获取进程
const process = await ACTIONS.process.getProcess(1234);

// 根据名称搜索
const results = await ACTIONS.process.searchByName('chrome');

// 根据端口查找
const portProcesses = await ACTIONS.process.findByPort(8080);

// 根据文件查找
const fileProcesses = await ACTIONS.process.findByFile('C:\\path\\to\\file.txt');

// 终止进程
const success = await ACTIONS.process.killProcess(1234);

// 优雅终止
const gracefulSuccess = await ACTIONS.process.gracefulKill(1234);

// 获取进程统计
const stats = await ACTIONS.process.getProcessStats(1234);

// 获取打开的文件
const files = await ACTIONS.process.getOpenFiles(1234);

// 获取监听端口
const ports = await ACTIONS.process.getListeningPorts(1234);
```

## 🎨 界面说明

### 主界面

```
┌─────────────────────────────────────┐
│ ⚙️ 进程管理器          [🔄 刷新]    │
│                                     │
│ [全部▼] [搜索进程名称或 PID...]     │
├─────────────────────────────────────┤
│ PID  │ 名称       │ CPU  │ 内存    │
│ 1234 │ chrome.exe │ 5.2% │ 256 MB  │
│ 5678 │ code.exe   │ 2.1% │ 512 MB  │
│ ...  │ ...        │ ...  │ ...     │
├─────────────────────────────────────┤
│ 共 150 个进程                       │
└─────────────────────────────────────┘
```

### 详情弹窗

```
┌─────────────────────────────────────┐
│ 进程详情                      [×]   │
├─────────────────────────────────────┤
│ PID: 1234          名称: chrome.exe │
│ CPU: 5.20%         内存: 256 MB     │
│ 用户: User         线程数: 45       │
│                                     │
│ 命令行:                              │
│ C:\Program Files\Chrome\chrome.exe  │
│                                     │
│ 监听端口:                            │
│ [8080] [8443] [9222]               │
│                                     │
│ 打开的文件 (3):                      │
│ C:\temp\data.json                    │
│ C:\temp\config.xml                   │
│ ... 还有 1 个文件                    │
├─────────────────────────────────────┤
│ [终止进程]          [关闭]          │
└─────────────────────────────────────┘
```

## 🔧 开发指南

### 安装依赖

```bash
cd plugins/process-manager
pnpm install
```

### 开发模式

```bash
pnpm dev
```

### 构建

```bash
pnpm build
```

## ⚠️ 注意事项

1. **权限要求**: 某些操作可能需要管理员权限
2. **性能影响**: 频繁刷新可能影响性能，建议保持默认5秒间隔
3. **系统限制**: 仅支持 Windows 系统
4. **安全警告**: 终止系统进程可能导致系统不稳定，请谨慎操作

## 🚀 未来计划

- [ ] 支持进程优先级调整
- [ ] 支持进程亲和性设置
- [ ] 添加进程树视图
- [ ] 支持进程挂起/恢复
- [ ] 添加性能图表
- [ ] 支持批量操作
- [ ] 导出进程列表

## 📝 许可证

MIT License
