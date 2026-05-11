# Quality-Loop 多智能体协作工作流

> 通过四个专业Agent的协作，结合双层约定文件机制、智能循环策略和动态子规划，确保AI编码始终围绕项目高质量交付。

## 📋 目录结构

```
.lingma/
├── agents/                          # 智能体定义
│   ├── planning-agent.md           # 规划智能体
│   ├── implementation-agent.md     # 编码智能体
│   ├── qa-agent.md                 # 验收智能体
│   └── codereview-agent.md         # 代码审查智能体
├── skills/
│   └── quality-loop-workflow/      # 工作流Skill
│       ├── README.md               # 本文件
│       ├── SKILL.md                # 完整工作流文档
│       ├── QUICKSTART.md           # 快速上手指南
│       ├── REFERENCE.md            # API参考
│       └── EXAMPLES.md             # 使用示例
└── conventions/                     # 约定文件（首次使用时创建）
    ├── user-conventions.md         # 用户约定（人工维护）
    └── project-conventions.md      # 项目约定（CodeReview维护）
```

## 🚀 快速开始

### 1. 创建约定文件（首次使用）

**user-conventions.md**（由你手动编写）：
```markdown
# 用户约定

## 1. 项目思想
- [描述你的项目设计理念]

## 2. 编码约定
- [列出你的编码规范]
```

**project-conventions.md**（初始为空）：
```markdown
# 项目约定

> 本文档由CodeReview-Agent自动维护

## 1. 架构规范
## 2. 代码质量规范
## 3. 命名约定

## 历史变更记录
### v1.0 (初始版本)
```

### 2. 启动工作流

对于复杂任务：
```
请使用 quality-loop-workflow 处理 [你的任务描述]
```

对于简单任务：
```
请使用 implementation-agent 直接实现 [简单功能]
```

## 🎯 核心特性

### 四个专业Agent

| Agent | 职责 | 关键特点 |
|-------|------|---------|
| **Planning-Agent** | 研读源码、制定规划 | 防止重复造轮子，识别可复用资源 |
| **Implementation-Agent** | 按照规划完整实现 | 绝不使用TODO，完整实现 |
| **QA-Agent** | 对照标准验收代码 | 智能判断回退路径 |
| **CodeReview-Agent** | 深度审查代码质量 | 谨慎维护项目约定 |

### 双层约定文件

- **user-conventions.md**：你手动维护的项目思想和编码偏好
- **project-conventions.md**：CodeReview-Agent自动维护的最佳实践和规范

### 智能循环策略

验收失败时根据问题类型智能回退：
- 命名/功能问题 → 回退到 Implementation-Agent
- 架构/规划问题 → 回退到 Planning-Agent

### 动态子规划

任何Agent发现模块复杂度过高时都可触发子工作流，最多支持2层嵌套。

## 📖 文档导航

- **[SKILL.md](./SKILL.md)** - 完整的工作流流程和详细规则
- **[QUICKSTART.md](./QUICKSTART.md)** - 5分钟快速上手指南
- **[REFERENCE.md](./REFERENCE.md)** - API参考和配置说明
- **[EXAMPLES.md](./EXAMPLES.md)** - 7个实际场景的完整示例

## 💡 使用建议

### ✅ 推荐做法

1. **在 user-conventions.md 中明确项目思想** - 让Agent更好地理解你的需求
2. **定期查看 project-conventions.md 的更新** - 了解新发现的最佳实践
3. **对于复杂任务，耐心等待完整流程** - 让每个Agent充分发挥作用
4. **关注验收和审查报告** - 这些报告揭示了代码的质量问题

### ❌ 避免做法

1. **不要在规划不充分时就急于编码** - Planning-Agent的源码研读很重要
2. **不要让验收失败超过3次** - 连续失败需要人工介入分析
3. **不要忽视 CodeReview-Agent 的建议** - 可以提升代码质量
4. **不要手动编辑 project-conventions.md** - 这个文件由CodeReview-Agent自动维护

## 🎓 学习路径

1. **新手**：阅读 [QUICKSTART.md](./QUICKSTART.md)，了解基本概念
2. **进阶**：阅读 [SKILL.md](./SKILL.md)，掌握完整流程
3. **高级**：阅读 [EXAMPLES.md](./EXAMPLES.md)，学习实际场景应用
4. **专家**：阅读 [REFERENCE.md](./REFERENCE.md)，深入了解API细节

## 🔧 故障排查

遇到问题？查看 [SKILL.md](./SKILL.md) 的"故障排查"章节，或查阅 [QUICKSTART.md](./QUICKSTART.md) 的常见问题部分。

## 📊 成功指标

- **代码一致性**：95%以上的代码符合 project-conventions.md
- **验收通过率**：首次验收通过率≥70%，二次验收通过率≥95%
- **平均循环次数**：每个模块平均1.5次循环内完成
- **约定文件质量**：保持在500行以内，每条规范都有实际案例支撑

## 🤝 贡献

欢迎提出改进建议或报告问题！

## 📄 许可证

本项目遵循与原项目相同的许可证。

---

**记住**：Quality-Loop 的目标是**高质量交付**，而不是快速交付。耐心一点，让每个Agent充分发挥作用。
