# 用户约定

> 本文档由项目成员手动维护，表达 Quick Actions 的核心价值观和编码偏好。
> 创建时间：2026-05-09
> 维护者：个人开发者

## 1. 项目思想

### 1.1 设计哲学
- **性能优先**：应用启动速度、搜索响应时间是核心指标，所有优化围绕用户体验展开
- **插件化架构**：核心轻量，功能通过插件扩展，保持系统灵活性和可维护性
- **规则驱动**：通过约定文件和智能体协作确保代码质量和一致性

### 1.2 技术选型原则
- 优先使用官方推荐和社区活跃的库（React 19, Tauri 2, Vite）
- 避免引入过多的第三方依赖，控制 bundle size
- 对于工具库，优先考虑性能和类型安全
- Rust 后端注重安全性和性能，前端注重响应速度和交互体验

## 2. 编码约定

### 2.1 命名规范
- 变量名使用 camelCase（如 `searchQuery`、`pluginList`）
- 类名/组件名使用 PascalCase（如 `SearchBar`、`PluginManager`）
- 常量使用 UPPER_SNAKE_CASE（如 `MAX_SEARCH_RESULTS`）
- 布尔变量以 `is`、`has`、`can` 开头（如 `isLoading`、`hasResults`）
- 事件处理函数以 `handle` 开头（如 `handleSearch`、`handlePluginLoad`）
- 异步函数以 `fetch`、`load` 或 `get` 开头（如 `fetchPlugins`、`loadSettings`）
- Rust 函数使用 snake_case（如 `search_files`、`get_plugins`）

### 2.2 代码风格
- TypeScript 使用严格模式（strict: true）
- 函数长度不超过 50 行，复杂逻辑拆分为小函数
- 单个文件不超过 300 行，超过则考虑拆分模块
- 使用函数式组件 + Hooks，避免 class 组件
- Rust 代码遵循 rustfmt 规范，使用 cargo clippy 检查

### 2.3 React + TypeScript 特定约定
- 组件使用函数式组件 + Hooks
- Props 接口命名为 `[ComponentName]Props`（如 `SearchBarProps`）
- 自定义 Hooks 以 `use` 开头（如 `usePlugins`、`useSearch`）
- 状态管理优先使用 Context + useReducer，复杂场景考虑 Zustand
- 使用 TypeScript 严格模式，禁止使用 `any` 类型
- 组件文件使用 `.tsx` 扩展名，纯逻辑文件使用 `.ts`

### 2.4 Tauri/Rust 特定约定
- Rust 代码遵循官方 Rust API Guidelines
- 使用 Result 类型处理错误，避免 unwrap()
- FFI 边界仔细处理类型转换和内存安全
- 异步操作使用 tokio runtime
- 命令函数使用 `#[tauri::command]` 注解

### 2.5 错误处理
- 所有异步操作必须包含错误处理
- 使用 try-catch 包裹可能失败的代码
- API 调用失败必须显示友好的错误提示
- 禁止空的 catch 块，必须记录日志或重新抛出
- Rust 中使用 `?` 运算符传播错误，提供有意义的错误信息

## 3. 测试要求
- 核心业务逻辑必须有单元测试（搜索算法、插件加载等）
- React 组件建议有快照测试和交互测试
- Tauri 命令函数必须有集成测试
- 关键用户流程（启动、搜索、插件加载）必须有 E2E 测试
- 测试覆盖率目标：核心模块 ≥ 80%

## 4. 文档要求
- 公共 API 必须有 JSDoc/tsdoc 注释
- Rust 公共函数必须有 doc comments（///）
- 复杂的算法必须附带注释说明（如拼音搜索、缓存策略）
- 每个模块必须有清晰的职责说明
- Commit 消息遵循 Conventional Commits 规范（feat/fix/refactor/docs等）

## 5. 性能优化约定
- 搜索操作必须实现防抖（debounce）
- 大量数据渲染使用虚拟滚动或分页
- 插件加载使用懒加载策略
- 使用 React.memo 和 useMemo 优化重渲染
- Rust 端注意内存分配和字符串处理性能
- 启动时并行加载非关键资源

## 6. 插件系统约定
- 插件接口定义清晰，使用 TypeScript interface
- 插件生命周期管理明确（load/unload/reload）
- 插件间通信通过统一的事件总线
- 插件错误隔离，单个插件失败不影响主应用
- 插件配置支持热更新
