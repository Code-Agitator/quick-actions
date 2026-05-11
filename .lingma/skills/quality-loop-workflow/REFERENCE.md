# Quality-Loop 工作流 API 参考

## 目录结构

```
.lingma/
├── agents/
│   ├── planning-agent.md              # 规划智能体定义
│   ├── implementation-agent.md        # 编码智能体定义
│   ├── qa-agent.md                    # 验收智能体定义
│   └── codereview-agent.md            # 代码审查智能体定义
├── skills/
│   └── quality-loop-workflow/
│       ├── SKILL.md                   # 工作流主文档
│       ├── QUICKSTART.md              # 快速上手指南
│       ├── REFERENCE.md               # API参考（本文件）
│       └── EXAMPLES.md                # 使用示例
├── conventions/
│   ├── user-conventions.md            # 用户约定（人工维护）
│   └── project-conventions.md         # 项目约定（CodeReview维护）
└── plans/
    └── phase_X/
        ├── plan_module_Y.md           # 模块规划文档
        ├── acceptance_criteria_Y.md   # 验收标准文档
        └── progress_module_Y.json     # 进度跟踪文件
```

---

## Agent API

### Planning-Agent

**名称**: `planning-agent`

**描述**: 深度研读源码防止重复造轮子，拆分问题并制定验收标准

**工具**: Read, Write, Edit, Grep, Glob, Bash

**输入**:
- 任务描述
- `.lingma/conventions/user-conventions.md`（必读）
- `.lingma/conventions/project-conventions.md`（必读）
- 相关源码文件（用于防止重复实现）

**输出**:
- `.plans/phase_X/plan_module_Y.md` - 模块规划文档
- `.plans/phase_X/acceptance_criteria_Y.md` - 验收标准文档
- `.plans/phase_X/progress_module_Y.json` - 进度跟踪文件（初始状态PENDING）

**调用示例**:
```
请使用 planning-agent 对 [任务描述] 进行架构分析

必读文件：
- .lingma/conventions/user-conventions.md
- .lingma/conventions/project-conventions.md
```

**规划文档结构**:
```markdown
# 模块 [Y] 规划文档

## 1. 任务概述
- 复杂度评级: L1/L2/L3
- 输入源: 参考的现有代码路径
- 输出目标: 新代码的存放位置

## 2. 可复用资源
- 列出项目中已有的可复用模块

## 3. 依赖关系
- 依赖哪些已有模块

## 4. 关键映射（如适用）
| 原名称 | 新名称 | 类型 |

## 5. 实现要点
- 核心算法或逻辑说明

## 6. 引用约定
- 相关的 user-conventions.md 条款
- 相关的 project-conventions.md 条款
```

**验收标准文档结构**:
```markdown
# 模块 [Y] 验收标准

## 功能完整性
- [ ] 功能点1
- [ ] 功能点2

## 命名一致性
- [ ] 符合 project-conventions.md

## 规范遵循
- [ ] 代码风格符合要求

## 编译/运行检查
- [ ] 代码无语法错误
- [ ] 能够成功编译

## 性能要求（如适用）
- [ ] 响应时间 < X ms
```

**进度文件格式**:
```json
{
  "module_id": "module_Y",
  "status": "PENDING",
  "complexity_level": "L1/L2/L3",
  "last_updated": "2026-05-09T10:00:00Z",
  "summary": "规划已完成，等待Implementation-Agent实现"
}
```

---

### Implementation-Agent

**名称**: `implementation-agent`

**描述**: 严格按照规划文档进行完整详细的编码实现，绝不使用TODO

**工具**: Read, Write, Edit, Grep, Glob, Bash

**输入**:
- `.plans/phase_X/plan_module_Y.md`（必读）
- `.plans/phase_X/acceptance_criteria_Y.md`（必读）
- `.lingma/conventions/project-conventions.md`（必读）
- `.lingma/conventions/user-conventions.md`（如适用）

**输出**:
- 源代码文件（按照规划中的输出目标路径）
- 更新的 `progress_module_Y.json`（状态IMPLEMENTED）

**调用示例**:
```
请使用 implementation-agent 执行模块 [Y] 的实现

必读文件：
- .plans/phase_X/plan_module_Y.md
- .plans/phase_X/acceptance_criteria_Y.md
- .lingma/conventions/project-conventions.md
```

**自检清单**:
- [ ] 功能完整性：所有规划的功能已实现
- [ ] 无 TODO：没有TODO标记
- [ ] 命名一致性：符合 project-conventions.md
- [ ] 规范遵循：代码风格符合约定
- [ ] 错误处理：添加了必要的异常处理
- [ ] 编译可行性：代码无语法错误

**进度更新格式**:
```json
{
  "module_id": "module_Y",
  "status": "IMPLEMENTED",
  "last_updated": "2026-05-09T12:00:00Z",
  "summary": "已完成模块Y的实现。所有功能已完整实现，无TODO标记。"
}
```

**子规划请求格式**:
```markdown
## 子规划请求

**模块**: module_Y
**问题**: [详细描述遇到的问题]
**建议**: 请求 Planning-Agent 为 [具体子功能] 生成子规划
**影响**: 如果不细化，可能导致[具体问题]
```

---

### QA-Agent

**名称**: `qa-agent`

**描述**: 根据规划文档对代码进行功能验收，智能判断回退路径

**工具**: Read, Grep, Glob, Bash

**输入**:
- `.plans/phase_X/acceptance_criteria_Y.md`（必读）
- `.plans/phase_X/plan_module_Y.md`（必读）
- `.lingma/conventions/project-conventions.md`（必读）
- 新实现的代码文件

**输出**:
- 验收报告（包含问题清单和回退建议）
- 更新的 `progress_module_Y.json`（状态VERIFIED或REJECTED）

**调用示例**:
```
请使用 qa-agent 验收模块 [Y]

必读文件：
- .plans/phase_X/acceptance_criteria_Y.md
- .plans/phase_X/plan_module_Y.md
```

**验收报告结构**:
```markdown
## 模块 [Y] 验收报告

**状态**: ✅ 通过 / ❌ 拒绝（需回退到[Implementation/Planning]）

**验收项检查**:
- [x] 功能完整性
- [ ] 命名一致性（发现问题：第23行...）

**发现的问题**:
1. 第23行：[具体问题描述]

**问题分类**:
- 命名/规范类问题：X个
- 功能缺失类问题：X个

**回退建议**:
- 问题类型：[类型]
- 回退目标：[Implementation-Agent/Planning-Agent]
- 修正说明：[详细说明]

**循环计数**: 当前为第 N 次验收
```

**问题分类规则**:

| 问题类型 | 回退目标 | 示例 |
|---------|---------|------|
| 命名/规范类 | Implementation | 变量命名不符合规范 |
| 功能缺失类 | Implementation | 缺少异常处理 |
| 架构/设计类 | Planning | 使用了错误的算法 |
| 规划缺陷类 | Planning | 未考虑边界条件 |

**进度更新格式（验收通过）**:
```json
{
  "module_id": "module_Y",
  "status": "VERIFIED",
  "last_updated": "2026-05-09T14:00:00Z",
  "summary": "验收通过，所有检查项均符合要求。"
}
```

**进度更新格式（验收失败）**:
```json
{
  "module_id": "module_Y",
  "status": "REJECTED",
  "last_updated": "2026-05-09T14:00:00Z",
  "issues_encountered": ["问题1", "问题2"],
  "retry_count": 1,
  "summary": "验收失败，发现2个问题。已回退到Implementation-Agent修正。"
}
```

---

### CodeReview-Agent

**名称**: `codereview-agent`

**描述**: 对已通过QA验收的代码进行深度审查，谨慎维护项目约定文件

**工具**: Read, Write, Edit, Grep, Glob, Bash

**输入**:
- 已通过QA验收的代码文件
- `.lingma/conventions/project-conventions.md`（必读）
- `.lingma/conventions/user-conventions.md`（必读）
- `.plans/phase_X/plan_module_Y.md`（了解设计意图）

**输出**:
- 审查报告（质量评分、问题清单、废弃代码、约定更新）
- 可能更新的 `.lingma/conventions/project-conventions.md`
- 更新的 `progress_module_Y.json`（状态REVIEWED）

**调用示例**:
```
请使用 codereview-agent 对模块 [Y] 进行深度代码审查

必读文件：
- .lingma/conventions/project-conventions.md
- .lingma/conventions/user-conventions.md
```

**审查报告结构**:
```markdown
## 模块 [Y] 代码审查报告

### 质量评分
- 可读性: ⭐⭐⭐⭐ (4/5)
- 可维护性: ⭐⭐⭐ (3/5)
- 性能: ⭐⭐⭐⭐⭐ (5/5)
- 安全性: ⭐⭐⭐⭐ (4/5)
- 一致性: ⭐⭐⭐⭐⭐ (5/5)

**总体评分**: ⭐⭐⭐⭐ (4.2/5)

### 发现的问题

#### 🔴 严重问题（必须修复）
1. [安全] 第78行：[问题描述]
   - 建议：[改进建议]

#### 🟡 警告（建议修复）
2. [性能] 第45行：[问题描述]

#### 💡 建议（可选优化）
3. [可读性] 第23行：[问题描述]

### 废弃代码
- ⚠️ `src/utils/oldHelper.js` 已未被引用

### 项目约定更新
- ✅ 已更新 `project-conventions.md`
  - 新增规范：[规范内容]
  - 更新理由：[为什么需要这个规范]

### 优秀实践
- ✅ 第30-40行：[值得推广的代码示例]

### 总结
[总体评价和建议]
```

**约定更新决策流程**:
```
1. 识别潜在的规范点
   ↓
2. 第一次反思：必要性（是否真的需要？）
   ↓
3. 第二次反思：通用性（是否普适？）
   ↓
4. 第三次反思：精简性（会导致臃肿吗？）
   ↓
5. 检查是否与现有约定冲突
   ↓
6. 用简洁语言表述（不超过3句话）
   ↓
7. 添加到 project-conventions.md
   ↓
8. 在报告中标注更新和理由
```

**进度更新格式**:
```json
{
  "module_id": "module_Y",
  "status": "REVIEWED",
  "last_updated": "2026-05-09T16:00:00Z",
  "quality_score": 4.2,
  "issues_found": 5,
  "conventions_updated": true,
  "summary": "代码审查完成。发现5个问题。已更新项目约定文件。"
}
```

---

## 约定文件 API

### user-conventions.md

**维护者**: 人工（开发者）

**更新频率**: 低频（项目初期集中编写，后续偶尔补充）

**目标读者**: Planning-Agent, Implementation-Agent

**文件结构**:
```markdown
# 用户约定

> 本文档由项目成员手动维护，表达项目的核心价值观和编码偏好。

## 1. 项目思想

### 1.1 设计哲学
- [描述项目的核心设计理念]

### 1.2 技术选型原则
- [说明技术选型的标准和偏好]

## 2. 编码约定

### 2.1 命名规范
- [列出命名规则]

### 2.2 代码风格
- [说明代码风格要求]

### 2.3 特定领域约定
- [说明特定领域的特殊要求]

## 3. 测试要求
- [说明测试覆盖率和类型要求]

## 4. 文档要求
- [说明文档编写标准]
```

**最佳实践**:
- 在项目初期集中编写
- 明确表达项目的核心价值观
- 避免过于具体的实现细节
- 定期回顾和更新（但不频繁）

---

### project-conventions.md

**维护者**: CodeReview-Agent

**更新频率**: 中频（每次Review时可能更新，但需谨慎）

**目标读者**: Implementation-Agent, QA-Agent, CodeReview-Agent

**文件结构**:
```markdown
# 项目约定

> 本文档由CodeReview-Agent自动维护，记录经过验证的最佳实践和规范。
> 最后更新时间：2026-05-09
> 版本：v1.2

## 1. 架构规范

### 1.1 模块依赖规则
- [由CodeReview-Agent自动填充]

### 1.2 状态管理
- [由CodeReview-Agent自动填充]

## 2. 代码质量规范

### 2.1 错误处理
- [由CodeReview-Agent自动填充]

### 2.2 性能优化
- [由CodeReview-Agent自动填充]

## 3. 命名约定

### 3.1 文件命名
- [由CodeReview-Agent自动填充]

### 3.2 函数命名
- [由CodeReview-Agent自动填充]

## 历史变更记录

### v1.2 (2026-05-09)
- 新增：异步函数错误处理规范
- 更新：性能优化章节

### v1.1 (2026-04-15)
- 新增：命名约定章节

### v1.0 (2026-03-01)
- 初始版本
```

**约束**:
- **文件大小**: 保持在500行以内
- **更新条件**: 必须进行三次反思（必要性、通用性、精简性）
- **禁止手动编辑**: 由 CodeReview-Agent 自动维护

---

## 进度跟踪 API

### progress_module_Y.json

**位置**: `.plans/phase_X/progress_module_Y.json`

**用途**: 跟踪模块的生命周期状态

**状态流转**:
```
PENDING → IMPLEMENTED → VERIFIED → REVIEWED
              ↑            ↓
              └──── REJECTED ──┘
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `module_id` | string | 模块唯一标识 |
| `status` | string | 当前状态（PENDING/IMPLEMENTED/VERIFIED/REJECTED/REVIEWED） |
| `complexity_level` | string | 复杂度评级（L1/L2/L3） |
| `last_updated` | string | 最后更新时间（ISO 8601格式） |
| `summary` | string | 简要说明 |
| `issues_encountered` | array | 遇到的问题列表（仅在REJECTED状态） |
| `retry_count` | number | 重试次数（仅在REJECTED状态） |
| `quality_score` | number | 质量评分（仅在REVIEWED状态） |
| `issues_found` | number | 发现的问题数量（仅在REVIEWED状态） |
| `conventions_updated` | boolean | 是否更新了约定文件（仅在REVIEWED状态） |

**状态说明**:

| 状态 | 说明 | 下一阶段 |
|------|------|---------|
| PENDING | 规划已完成，等待实现 | → IMPLEMENTED |
| IMPLEMENTED | 实现已完成，等待验收 | → VERIFIED 或 REJECTED |
| VERIFIED | 验收通过，等待审查 | → REVIEWED |
| REJECTED | 验收失败，需要修正 | → IMPLEMENTED 或 PENDING |
| REVIEWED | 审查完成，模块完成 | → 结束 |

---

## 工作流控制 API

### 启动工作流

**命令**:
```
请使用 quality-loop-workflow 处理 [任务描述]
```

**参数**:
- `任务描述`: 详细的功能需求或开发任务

**返回值**:
- 工作流开始执行
- 自动调用 Planning-Agent 开始阶段1

---

### 查询进度

**命令**:
```bash
# 查看所有模块的进度
cat .plans/phase_*/progress_*.json

# 查看特定模块的进度
cat .plans/phase_X/progress_module_Y.json
```

**返回值**:
- JSON格式的进度信息

---

### 中断工作流

**方法**:
- 直接停止Agent的执行
- 或者明确要求停止当前任务

**注意**:
- 中断后可能需要手动清理临时文件
- 建议在阶段边界处中断（不要在阶段中间）

---

## 错误码

### 工作流错误

| 错误码 | 说明 | 解决方法 |
|--------|------|---------|
| WF001 | 约定文件不存在 | 创建 user-conventions.md 和 project-conventions.md |
| WF002 | 规划文档不完整 | 要求 Planning-Agent 补充缺失部分 |
| WF003 | 实现包含TODO | 要求 Implementation-Agent 完整实现 |
| WF004 | 验收连续失败3次 | 人工介入分析问题根源 |
| WF005 | 子规划嵌套超过2层 | 上报人工介入 |
| WF006 | 约定文件超过500行 | 进行精简和合并 |

### Agent 错误

| 错误码 | 说明 | 解决方法 |
|--------|------|---------|
| AG001 | Agent 未读取必读文件 | 重新调用Agent，强调必读文件 |
| AG002 | Agent 产出格式错误 | 要求Agent按照模板重新生成 |
| AG003 | Agent 超时未响应 | 检查工具调用是否正常，重试 |

---

## 配置选项

### 工作流配置

**位置**: （未来可能在配置文件中）

**当前默认值**:
- 最大循环次数: 5次
- 连续失败上限: 3次
- 子规划嵌套上限: 2层
- 约定文件大小上限: 500行

---

## 扩展接口

### 自定义验收标准

Planning-Agent 生成的 `acceptance_criteria_Y.md` 可以手动补充：

```markdown
## 额外要求
- [ ] 必须支持国际化
- [ ] 响应时间 < 100ms
- [ ] 内存占用 < 50MB
```

---

### 自定义审查维度

调用 CodeReview-Agent 时可以指定重点关注的维度：

```
请使用 codereview-agent 审查模块 [Y]，特别关注性能和安全问题
```

---

### 强制触发子规划

如果预判模块复杂，可以提前要求：

```
请使用 planning-agent 对模块 [Y] 进行规划，并评估是否需要子规划
```

---

## 版本历史

### v1.0 (2026-05-09)
- 初始版本
- 包含四个Agent的定义
- 包含完整的工作流流程
- 包含约定文件管理机制

---

## 相关文档

- [SKILL.md](./SKILL.md) - 工作流主文档
- [QUICKSTART.md](./QUICKSTART.md) - 快速上手指南
- [EXAMPLES.md](./EXAMPLES.md) - 使用示例
- [.lingma/agents/planning-agent.md](../../agents/planning-agent.md) - Planning-Agent 详细定义
- [.lingma/agents/implementation-agent.md](../../agents/implementation-agent.md) - Implementation-Agent 详细定义
- [.lingma/agents/qa-agent.md](../../agents/qa-agent.md) - QA-Agent 详细定义
- [.lingma/agents/codereview-agent.md](../../agents/codereview-agent.md) - CodeReview-Agent 详细定义
