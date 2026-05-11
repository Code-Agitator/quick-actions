# Quality-Loop 初始化快速参考

## 🎯 一句话说明

这个 Skill 帮你在新项目中自动创建 Quality-Loop 工作流所需的约定文件模板。

## 🚀 使用方法

```bash
# 方式 1：自然语言
请帮我初始化 Quality-Loop 工作流

# 方式 2：直接调用
请使用 quality-loop-init 初始化项目
```

## 📁 创建的文件

```
.lingma/
└── conventions/
    ├── user-conventions.md         # 你需要编辑的项目约定
    └── project-conventions.md      # CodeReview-Agent 自动维护
```

## ✏️ 初始化后必做

### 1. 编辑 user-conventions.md

打开文件，修改以下内容：

```markdown
# 用户约定

## 1. 项目思想
- 修改为你的项目设计理念
- 补充技术选型原则

## 2. 编码约定
- 调整命名规范（如果需要）
- 补充技术栈特定约定
- 设置代码风格要求

## 3. 测试要求
- 设置合理的覆盖率目标

## 4. 文档要求
- 明确文档标准
```

### 2. 开始第一个任务

```bash
请使用 quality-loop-workflow 处理 [你的任务]
```

## 💡 提示

- **user-conventions.md 是核心**：花时间在初期，后续会节省大量时间
- **根据项目定制**：不要直接复制模板，要反映你的项目特点
- **保持简洁**：约定应该清晰易懂，不要太冗长
- **可以迭代**：首次使用后可以根据经验调整

## 🔗 相关文档

- [README.md](./README.md) - 详细说明
- [../quality-loop-workflow/QUICKSTART.md](../quality-loop-workflow/QUICKSTART.md) - 工作流快速上手
