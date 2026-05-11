# Quality-Loop 初始化 Skill

这个 Skill 帮助你在新项目中快速初始化 Quality-Loop 多智能体协作工作流。

## 🚀 快速开始

### 使用方法

```
请帮我初始化 Quality-Loop 工作流
```

或者

```
请使用 quality-loop-init 初始化项目
```

### 初始化流程

1. **收集项目信息**：Skill 会询问你关于项目的基本信息
2. **创建目录结构**：自动创建 `.lingma/conventions/` 和 `.lingma/plans/`
3. **生成约定文件**：根据你的回答生成个性化的 `user-conventions.md`
4. **创建初始文件**：生成空的 `project-conventions.md`（由 CodeReview-Agent 后续填充）

## 📋 初始化内容

### 创建的目录

```
.lingma/
├── conventions/
│   ├── user-conventions.md         # 你的项目约定（需编辑）
│   └── project-conventions.md      # 项目规范（自动维护）
└── plans/                           # 规划文档目录
```

### 生成的文件

#### user-conventions.md

包含以下章节的模板：
- 项目思想（设计哲学、技术选型原则）
- 编码约定（命名规范、代码风格）
- 技术栈特定约定（React/Python/Node.js 等）
- 测试要求
- 文档要求

**注意**：这个文件需要你根据项目实际情况进行编辑和完善。

#### project-conventions.md

初始为空的模板，包含：
- 架构规范（待填充）
- 代码质量规范（待填充）
- 命名约定（待填充）
- 历史变更记录

**注意**：这个文件由 CodeReview-Agent 在审查代码时自动维护和更新。

## 💡 使用示例

### 示例 1：React + TypeScript 项目

```
用户：请帮我初始化 Quality-Loop 工作流

助手：我将帮你初始化 Quality-Loop 工作流。

首先，让我了解一些项目信息：

1. 项目名称和类型？
   → MyApp，React Web 应用

2. 主要技术栈？
   → React 18, TypeScript, Vite

3. 团队规模？
   → 个人项目

4. 特殊要求？
   → 注重性能，组件化开发

[自动生成适合 React 项目的约定文件]

✅ 初始化完成！
```

### 示例 2：Python 后端项目

```
用户：请使用 quality-loop-init 初始化

助手：[类似的流程，生成 Python 特定的约定]

### 2.3 Python 特定约定
- 遵循 PEP 8 规范
- 使用 type hints 进行类型标注
- 函数和类必须有 docstring
...

✅ 初始化完成！
```

## ✏️ 初始化后的操作

### 1. 编辑 user-conventions.md

打开 `.lingma/conventions/user-conventions.md`，根据你的项目特点进行调整：

- 修改项目思想部分，反映你的设计理念
- 调整编码约定，符合团队习惯
- 补充技术栈特定的约定
- 设置合理的测试覆盖率目标

### 2. 开始第一个任务

初始化完成后，你可以开始使用 Quality-Loop 工作流：

```
请使用 quality-loop-workflow 处理 [你的第一个任务]
```

例如：
```
请使用 quality-loop-workflow 为项目搭建基础架构
```

### 3. 查看文档

了解更多关于 Quality-Loop 的信息：

- [README.md](../quality-loop-workflow/README.md) - 概览
- [QUICKSTART.md](../quality-loop-workflow/QUICKSTART.md) - 快速上手
- [SKILL.md](../quality-loop-workflow/SKILL.md) - 完整文档

## 🎯 最佳实践

### ✅ 推荐做法

1. **认真填写 user-conventions.md**
   - 这是整个工作流的基础
   - 决定了 Agent 如何理解你的项目
   - 花时间在初期，后续会节省大量时间

2. **保持约定简洁明了**
   - 避免过于复杂的规则
   - 使用清晰的示例说明
   - 定期回顾和精简

3. **团队协作时达成共识**
   - 确保所有团队成员理解约定
   - 讨论并确定编码规范
   - 定期review约定的执行情况

4. **在实践中迭代**
   - 首次使用后根据经验调整
   - 发现新的最佳实践时更新
   - 保持约定的时效性

### ❌ 避免做法

1. **不要直接复制模板不修改**
   - 模板只是起点
   - 必须根据项目特点定制
   - 否则 Agent 无法准确理解你的需求

2. **不要写得过于详细或冗长**
   - 约定应该易于理解和执行
   - 过于详细会降低可执行性
   - 保持核心原则即可

3. **不要忘记更新**
   - 项目发展后约定可能需要调整
   - 新技术引入时需要补充约定
   - 定期review和更新

## 🔧 故障排除

### Q: 初始化后找不到文件？

**检查**：
```bash
ls -la .lingma/conventions/
```

**解决**：
如果目录不存在，手动创建：
```bash
mkdir -p .lingma/conventions
```

### Q: user-conventions.md 不知道怎么写？

**建议**：
1. 先使用生成的模板
2. 参考类似项目的约定
3. 从简单的开始，逐步完善
4. 在实际使用中发现问题再补充

### Q: 想要重新初始化？

**方法**：
1. 备份现有的约定文件
2. 删除 `.lingma/conventions/` 目录
3. 重新运行初始化命令
4. 根据需要重新配置

## 📚 相关资源

- **[Quality-Loop 主文档](../quality-loop-workflow/README.md)** - 完整的工作流说明
- **[快速上手指南](../quality-loop-workflow/QUICKSTART.md)** - 5分钟入门
- **[API 参考](../quality-loop-workflow/REFERENCE.md)** - 详细的技术文档
- **[使用示例](../quality-loop-workflow/EXAMPLES.md)** - 实际场景演示

## 🤝 贡献

如果你对这个初始化 Skill 有改进建议，欢迎提出！

---

**记住**：好的约定文件是成功使用 Quality-Loop 的关键。花时间在初始化阶段，会让后续的编码工作更加顺畅和高效。
