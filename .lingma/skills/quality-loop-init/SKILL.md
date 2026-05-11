---
name: quality-loop-init
description: 初始化 Quality-Loop 多智能体协作工作流，自动创建约定文件模板和基础目录结构。当用户需要在新项目中启用 Quality-Loop 工作流或首次使用四智能体协作时使用。
---

# Quality-Loop 工作流初始化

这个 Skill 帮助你在项目中快速初始化 Quality-Loop 多智能体协作工作流。

## 初始化流程

### 第一步：检查现有结构

首先检查项目是否已经有 `.lingma` 目录和相关文件：

```bash
# 检查目录是否存在
ls -la .lingma/
ls -la .lingma/conventions/
```

### 第二步：创建目录结构

如果目录不存在，创建必要的目录：

```bash
mkdir -p .lingma/conventions
mkdir -p .lingma/plans
```

### 第三步：询问用户项目信息

在创建约定文件之前，需要了解用户的项目特点。询问以下问题：

1. **项目名称和类型**：这是什么类型的项目？（Web应用、CLI工具、库等）
2. **技术栈**：使用什么主要技术？（React、Vue、Node.js、Python等）
3. **团队规模**：个人项目还是团队协作？
4. **特殊要求**：是否有特定的编码规范或设计哲学？

### 第四步：生成 user-conventions.md

根据用户回答，生成个性化的 `user-conventions.md` 文件。

#### 通用模板框架

```markdown
# 用户约定

> 本文档由项目成员手动维护，表达 [PROJECT_NAME] 的核心价值观和编码偏好。
> 创建时间：[DATE]
> 维护者：[TEAM/PERSON]

## 1. 项目思想

### 1.1 设计哲学
- **[核心原则1]**：[简短说明]
- **[核心原则2]**：[简短说明]
- **[核心原则3]**：[简短说明]

### 1.2 技术选型原则
- 优先使用[官方推荐/社区活跃]的库和工具
- 避免引入过多的第三方依赖
- 对于工具库，优先考虑[bundle size/性能/维护活跃度]
- [其他技术选型偏好]

## 2. 编码约定

### 2.1 命名规范
- 变量名使用 camelCase（如 `userName`）
- 类名/组件名使用 PascalCase（如 `SearchBar`）
- 常量使用 UPPER_SNAKE_CASE（如 `MAX_RETRY_COUNT`）
- 布尔变量以 `is`、`has`、`can` 开头（如 `isVisible`）
- 事件处理函数以 `handle` 开头（如 `handleSubmit`）
- 异步函数以 `fetch` 或 `load` 开头（如 `fetchUsers`）

### 2.2 代码风格
- [具体的代码风格要求]
- 函数长度不超过 [X] 行
- 单个文件不超过 [X] 行
- [其他风格约定]

### 2.3 [技术栈特定约定]
- [针对特定技术栈的约定，如 React、Vue、Python 等]

### 2.4 错误处理
- 所有异步操作必须包含错误处理
- 使用 try-catch 包裹可能失败的代码
- API 调用失败必须显示友好的错误提示
- 禁止空的 catch 块，必须记录日志或重新抛出

## 3. 测试要求
- 核心业务逻辑必须有单元测试
- [UI组件/接口]建议有[快照测试/集成测试]
- 关键用户流程必须有 E2E 测试
- 测试覆盖率目标：核心模块 ≥ [X]%

## 4. 文档要求
- 公共 API 必须有[JSDoc/docstring]注释
- 复杂的算法必须附带注释说明
- 每个模块必须有 README 说明其职责
- Commit 消息遵循 Conventional Commits 规范
```

#### 根据技术栈定制

**如果是 React/TypeScript 项目**，在 2.3 节添加：

```markdown
### 2.3 React 特定约定
- 组件使用函数式组件 + Hooks
- Props 接口命名为 `[ComponentName]Props`
- 自定义 Hooks 以 `use` 开头
- 状态管理优先使用 Context + useReducer，复杂场景考虑 Zustand/Redux
- 使用 TypeScript 严格模式
```

**如果是 Python 项目**，在 2.3 节添加：

```markdown
### 2.3 Python 特定约定
- 遵循 PEP 8 规范
- 使用 type hints 进行类型标注
- 函数和类必须有 docstring
- 使用 virtualenv 或 poetry 管理依赖
- 优先使用 asyncio 进行异步编程
```

**如果是 Node.js 项目**，在 2.3 节添加：

```markdown
### 2.3 Node.js 特定约定
- 使用 ES Modules (import/export)
- 异步代码优先使用 async/await
- 错误处理使用统一的 Error 类
- 使用 dotenv 管理环境变量
- API 路由遵循 RESTful 规范
```

### 第五步：生成 project-conventions.md

创建初始的 `project-conventions.md` 文件（由 CodeReview-Agent 后续自动填充）：

```markdown
# 项目约定

> 本文档由 CodeReview-Agent 自动维护，记录经过验证的最佳实践和规范。
> 最后更新时间：[DATE]
> 版本：v1.0

## 1. 架构规范
[由 CodeReview-Agent 自动填充]

## 2. 代码质量规范
[由 CodeReview-Agent 自动填充]

## 3. 命名约定
[由 CodeReview-Agent 自动填充]

## 历史变更记录

### v1.0 ([DATE])
- 初始版本
```

### 第六步：验证和提示

创建完成后，向用户展示：

1. **已创建的文件列表**
2. **下一步操作指南**
3. **如何开始第一个任务**

## 执行示例

### 示例 1：初始化 React 项目

```
用户：请帮我初始化 Quality-Loop 工作流

助手：我将帮你初始化 Quality-Loop 工作流。

首先，让我了解一些项目信息：

1. 项目名称和类型？
   → Quick Actions，Tauri + React 桌面应用

2. 主要技术栈？
   → React 19, TypeScript, Tauri 2, Vite

3. 团队规模？
   → 小型团队（3-5人）

4. 特殊要求？
   → 注重性能，插件化架构，规则驱动

正在创建目录结构...
✅ 创建 .lingma/conventions/
✅ 创建 .lingma/plans/

正在生成 user-conventions.md...
✅ 已创建 .lingma/conventions/user-conventions.md

正在生成 project-conventions.md...
✅ 已创建 .lingma/conventions/project-conventions.md

🎉 初始化完成！

### 已创建的文件
- .lingma/conventions/user-conventions.md
- .lingma/conventions/project-conventions.md

### 下一步
你现在可以开始使用 Quality-Loop 工作流了！

尝试运行第一个任务：
"请使用 quality-loop-workflow 为项目搭建基础架构"

或者查看文档：
- .lingma/skills/quality-loop-workflow/README.md
- .lingma/skills/quality-loop-workflow/QUICKSTART.md
```

### 示例 2：初始化 Python 项目

```
用户：请初始化 Quality-Loop

助手：[类似的流程，但生成 Python 特定的约定]

### 2.3 Python 特定约定
- 遵循 PEP 8 规范
- 使用 type hints 进行类型标注
- 函数和类必须有 docstring
...
```

## 注意事项

### 必须遵守

1. **user-conventions.md 是核心**：这个文件决定了整个项目的编码风格，必须认真填写
2. **根据实际项目定制**：不要直接复制模板，要根据项目特点调整
3. **保持简洁**：约定文件应该清晰易懂，不要过于冗长
4. **team 共识**：如果是团队项目，确保团队成员对约定达成共识

### 建议

1. **首次使用后回顾**：在使用工作流几次后，回顾并调整 user-conventions.md
2. **定期更新**：随着项目发展，可能需要调整约定
3. **参考现有项目**：如果有类似项目，可以参考它们的约定文件

## 故障排除

### Q: 创建文件时提示权限不足？

**解决**：
```bash
# 检查目录权限
ls -la .lingma/

# 如果需要，修改权限
chmod -R 755 .lingma/
```

### Q: 不确定某些约定怎么写？

**解决**：
- 先使用通用模板
- 在实际使用中逐步完善
- 参考 similar 项目的约定

### Q: 想要修改已创建的约定文件？

**解决**：
- `user-conventions.md`：随时可以手动编辑
- `project-conventions.md`：建议让 CodeReview-Agent 自动维护

## 相关资源

- [SKILL.md](../quality-loop-workflow/SKILL.md) - Quality-Loop 完整工作流文档
- [QUICKSTART.md](../quality-loop-workflow/QUICKSTART.md) - 快速上手指南
- [REFERENCE.md](../quality-loop-workflow/REFERENCE.md) - API 参考
