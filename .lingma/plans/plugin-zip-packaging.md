# 插件 ZIP 打包功能规划文档

## 1. 任务概述

- **复杂度评级**: L2 - 中等（多文件但逻辑清晰，代码量约 300-500 行）
- **输入源**: 
  - `scripts/create-plugin.js` - 插件创建脚本
  - 现有插件示例（uuid-generator, everything-search, json-explorer 等）
  - 根目录 `package.json`（已包含 archiver 依赖）
  - `DEVELOPMENT_GUIDE.md`（第 367-378 行提到手动压缩插件）
- **输出目标**: 
  - 新增 `scripts/pack-plugin.js` - 插件打包脚本
  - 更新 `scripts/create-plugin.js` - 自动添加打包能力
  - 更新各插件的 `package.json` - 添加 pack/zip 命令

### 1.1 背景说明

Quick Actions 采用插件化架构，每个插件独立构建后只生成 `dist/` 目录。为支持动态加载和插件分发，需要将插件打包成 ZIP 文件。当前项目中：
- 已有 `archiver` 依赖（v8.0.0）安装在根目录
- DEVELOPMENT_GUIDE.md 中提到手动使用 `zip -r` 命令压缩插件
- 需要自动化此流程并提供标准化的打包方案

## 2. 可复用资源

### 2.1 已有依赖
- **archiver** (v8.0.0): Node.js ZIP 打包库，已在根目录 `package.json` 中声明
  - 位置: `node_modules/archiver`
  - 用途: 创建 ZIP 归档文件
  - 优势: 轻量级、流式处理、支持多种压缩格式

### 2.2 现有插件结构
所有插件遵循统一结构（由 `create-plugin.js` 生成）：
```
plugins/{plugin-name}/
├── package.json          # 包含 name, version, scripts
├── plugin.json           # 包含 id, name, version, description, entry
├── vite.config.ts        # Vite 构建配置
├── tsconfig.json         # TypeScript 配置
├── src/                  # 源代码
│   ├── index.tsx         # 入口文件
│   ├── App.tsx           # 主组件
│   └── types/            # 类型定义
├── dist/                 # 构建产物（Vite 输出）
│   └── index.js          # 打包后的 ES 模块
└── README.md             # 插件文档
```

### 2.3 关键信息提取点
从插件文件中可提取的信息：
- **plugin.json**: `id`, `version` → 用于生成 ZIP 文件名 `{id}-{version}.zip`
- **package.json**: `scripts` → 用于添加 `pack` 或 `zip` 命令
- **dist/**: 构建产物目录 → ZIP 的主要内容
- **plugin.json**: 元数据文件 → 必须包含在 ZIP 中

## 3. 依赖关系

### 3.1 新脚本依赖
```
scripts/pack-plugin.js
├── 依赖: archiver (Node.js 模块)
├── 依赖: fs, path (Node.js 内置模块)
├── 读取: plugins/{name}/plugin.json (获取 id 和 version)
├── 读取: plugins/{name}/dist/ (打包内容)
└── 输出: plugins/{name}/{id}-{version}.zip
```

### 3.2 被依赖关系
```
scripts/create-plugin.js
└── 修改: 在生成的 package.json 中添加 "pack" 脚本
    └── 引用: scripts/pack-plugin.js

plugins/*/package.json
└── 新增: "pack": "node ../../scripts/pack-plugin.js"
```

### 3.3 不影响现有流程
- ✅ 不修改 Vite 构建配置
- ✅ 不改变 dist/ 目录结构
- ✅ 不影响 `pnpm build:plugins` 命令
- ✅ 向后兼容：未添加 pack 命令的插件仍可正常运行

## 4. 关键映射

| 原名称/概念 | 新名称/实现 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| 手动 zip 命令 | `scripts/pack-plugin.js` | Node.js 脚本 | 自动化打包流程 |
| `{plugin-name}.zip` | `{id}-{version}.zip` | 文件命名规范 | 例如: `uuid-generator-1.0.0.zip` |
| `pnpm build` | `pnpm pack` | npm script | 新增打包命令 |
| 根目录 archiver | 插件脚本引用 | 依赖复用 | 通过相对路径引用 `../../node_modules/archiver` |

## 5. 技术方案

### 5.1 技术选型

**ZIP 打包库**: 使用已有的 `archiver` (v8.0.0)

**理由**:
1. ✅ 已在项目中安装，无需额外依赖
2. ✅ 基于流式处理，内存效率高
3. ✅ API 简洁易用
4. ✅ 支持多种压缩格式（ZIP, TAR 等）
5. ✅ 社区活跃，维护良好

**备选方案对比**:
- ❌ `adm-zip`: 需要额外安装，API 较老旧
- ❌ `jszip`: 主要用于浏览器环境
- ❌ 调用系统 `zip` 命令: 跨平台兼容性差

### 5.2 ZIP 文件结构

```
{plugin-id}-{version}.zip
├── dist/                   # 构建产物（必需）
│   ├── index.js            # 主入口文件
│   └── ...                 # 其他静态资源（如有）
├── plugin.json             # 插件元数据（必需）
└── README.md               # 使用说明（可选，建议包含）
```

**不包含的内容**:
- ❌ `node_modules/` - 体积过大，React 已内联打包
- ❌ `src/` - 源代码不需要分发
- ❌ `package.json` - 运行时不需要（plugin.json 已包含必要信息）
- ❌ `.gitignore`, `tsconfig.json` 等开发配置文件

### 5.3 文件名规范

格式: `{plugin-id}-{version}.zip`

示例:
- `uuid-generator-1.0.0.zip`
- `everything-search-1.2.0.zip`
- `json-explorer-1.0.0.zip`

**注意**: 使用 `plugin.json` 中的 `id` 而非目录名，确保一致性。

### 5.4 存放位置

**方案 A**（推荐）: ZIP 文件存放在插件根目录
```
plugins/uuid-generator/
├── dist/
├── uuid-generator-1.0.0.zip  ← 新生成
├── package.json
└── plugin.json
```

**优点**:
- 便于版本管理（可与 dist/ 一起被 .gitignore 忽略）
- 插件目录自包含
- 简化脚本逻辑（无需处理跨目录路径）

**方案 B**: 统一的 output 目录
```
plugins/output/
├── uuid-generator-1.0.0.zip
├── everything-search-1.2.0.zip
└── ...
```

**缺点**:
- 需要额外创建和管理 output 目录
- 路径处理复杂
- 不符合插件独立性原则

**决策**: 采用方案 A

### 5.5 错误处理策略

1. **plugin.json 不存在**: 抛出错误并提示用户先运行 `pnpm build`
2. **dist/ 目录不存在**: 提示用户先执行构建
3. **ZIP 文件已存在**: 覆盖写入（带警告日志）
4. **archiver 初始化失败**: 捕获异常并输出详细错误信息
5. **文件权限问题**: 检查写入权限，提供解决方案

## 6. 实现步骤

### 阶段 1: 创建核心打包脚本

**文件**: `scripts/pack-plugin.js`

**功能**:
1. 接收命令行参数（插件目录路径或插件 ID）
2. 读取 `plugin.json` 获取 `id` 和 `version`
3. 验证 `dist/` 目录存在
4. 使用 archiver 创建 ZIP 文件
5. 添加 `dist/` 和 `plugin.json` 到 ZIP
6. 可选添加 `README.md`
7. 输出成功消息和文件大小

**伪代码结构**:
```javascript
#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. 解析命令行参数
const pluginArg = process.argv[2];
if (!pluginArg) {
  console.error('Usage: node scripts/pack-plugin.js <plugin-name>');
  process.exit(1);
}

// 2. 确定插件目录
const pluginDir = path.resolve(__dirname, '..', 'plugins', pluginArg);

// 3. 读取 plugin.json
const pluginJsonPath = path.join(pluginDir, 'plugin.json');
const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf-8'));
const pluginId = pluginJson.id;
const version = pluginJson.version;

// 4. 验证 dist 目录
const distDir = path.join(pluginDir, 'dist');
if (!fs.existsSync(distDir)) {
  console.error('Error: dist/ directory not found. Run "pnpm build" first.');
  process.exit(1);
}

// 5. 生成 ZIP 文件路径
const zipFileName = `${pluginId}-${version}.zip`;
const zipFilePath = path.join(pluginDir, zipFileName);

// 6. 创建 ZIP 文件
const output = fs.createWriteStream(zipFilePath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`✅ Plugin packed successfully!`);
  console.log(`📦 File: ${zipFileName}`);
  console.log(`📊 Size: ${sizeMB} MB`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// 7. 添加文件到 ZIP
archive.directory(distDir, 'dist');
archive.file(pluginJsonPath, { name: 'plugin.json' });

// 可选：添加 README.md
const readmePath = path.join(pluginDir, 'README.md');
if (fs.existsSync(readmePath)) {
  archive.file(readmePath, { name: 'README.md' });
}

// 8. 完成打包
await archive.finalize();
```

### 阶段 2: 更新 create-plugin.js

**修改点**: 在生成的 `package.json` 中添加 `pack` 脚本

**位置**: 第 40-44 行（scripts 对象）

**修改前**:
```javascript
scripts: {
  dev: 'vite',
  build: 'vite build',
  preview: 'vite preview'
}
```

**修改后**:
```javascript
scripts: {
  dev: 'vite',
  build: 'vite build',
  preview: 'vite preview',
  pack: 'node ../../scripts/pack-plugin.js'
}
```

**同时更新 README.md 模板**（第 343-378 行）:
在 "Next steps" 部分添加:
```markdown
4. pnpm pack         # Pack plugin into ZIP file
```

在 "Built-in API Capabilities" 后添加新章节:
```markdown
## 📦 Packaging

To distribute your plugin, pack it into a ZIP file:

```bash
pnpm pack
```

This will create `{plugin-id}-{version}.zip` in the plugin root directory.
```

### 阶段 3: 为现有插件添加 pack 命令

**方式 A**（推荐）: 手动更新每个插件的 package.json

对以下插件执行更新:
- `plugins/uuid-generator/package.json`
- `plugins/everything-search/package.json`
- `plugins/js-console/package.json`
- `plugins/json-explorer/package.json`
- `plugins/process-manager/package.json`

**更新内容**: 在 `scripts` 对象中添加:
```json
"pack": "node ../../scripts/pack-plugin.js"
```

**方式 B**: 编写批量更新脚本（可选，如果插件数量很多）

### 阶段 4: 更新 .gitignore

**文件**: `scripts/create-plugin.js` 中生成的 `.gitignore` 模板

**位置**: 第 333-337 行

**修改前**:
```
node_modules/
dist/
*.log
.DS_Store
```

**修改后**:
```
node_modules/
dist/
*.zip
*.log
.DS_Store
```

**理由**: ZIP 文件是构建产物，不应提交到版本控制。

### 阶段 5: 测试验证

**测试用例**:

1. **新建插件测试**:
   ```bash
   node scripts/create-plugin.js test-plugin
   cd plugins/test-plugin
   pnpm install
   pnpm build
   pnpm pack
   # 验证: test-plugin-1.0.0.zip 是否存在
   ```

2. **现有插件测试**:
   ```bash
   cd plugins/uuid-generator
   pnpm pack
   # 验证: uuid-generator-1.0.0.zip 是否存在
   ```

3. **ZIP 内容验证**:
   ```bash
   # 使用 unzip -l 或 7z l 查看内容
   unzip -l plugins/uuid-generator/uuid-generator-1.0.0.zip
   # 应包含: dist/, plugin.json, README.md
   ```

4. **错误处理测试**:
   ```bash
   # 测试未构建的情况
   cd plugins/uuid-generator
   rm -rf dist
   pnpm pack
   # 应显示友好错误提示
   ```

## 7. 验收标准

### 7.1 功能完整性

- [ ] **核心打包功能**: `scripts/pack-plugin.js` 能正确创建 ZIP 文件
- [ ] **文件命名**: ZIP 文件名格式为 `{plugin-id}-{version}.zip`
- [ ] **ZIP 内容**: 包含 `dist/`, `plugin.json`, `README.md`（如存在）
- [ ] **压缩质量**: 使用最高压缩级别（level 9）
- [ ] **错误提示**: 缺少 dist/ 时给出明确提示
- [ ] **进度反馈**: 打包完成后显示文件大小

### 7.2 命名一致性

- [ ] **变量命名**: 符合 user-conventions.md 第 2.1 节（camelCase）
- [ ] **函数命名**: 符合 user-conventions.md 第 2.1 节（handle/fetch 前缀）
- [ ] **常量命名**: 符合 user-conventions.md 第 2.1 节（UPPER_SNAKE_CASE）
- [ ] **注释语言**: 使用英文注释（与项目保持一致）

### 7.3 规范遵循

- [ ] **代码风格**: 遵循 user-conventions.md 第 2.2 节
  - 函数长度不超过 50 行
  - 单个文件不超过 300 行
  - 使用严格模式
- [ ] **错误处理**: 遵循 user-conventions.md 第 2.5 节
  - 所有异步操作包含错误处理
  - 禁止空的 catch 块
  - 提供有意义的错误信息
- [ ] **文档要求**: 遵循 user-conventions.md 第 4 节
  - 公共函数有 JSDoc 注释
  - 复杂逻辑附带注释说明

### 7.4 编译/运行检查

- [ ] **语法检查**: 脚本无语法错误（可通过 `node --check` 验证）
- [ ] **依赖可用**: archiver 模块可正常导入
- [ ] **跨平台**: 在 Windows/macOS/Linux 上均可运行
- [ ] **向后兼容**: 不影响现有 `pnpm build` 流程

### 7.5 性能要求

- [ ] **打包速度**: 单个插件打包时间 < 2 秒（典型大小 < 5MB）
- [ ] **内存占用**: 峰值内存 < 100MB
- [ ] **文件大小**: ZIP 文件比原始 dist/ 小至少 30%（压缩率验证）

### 7.6 集成验收

- [ ] **create-plugin 更新**: 新创建的插件自动包含 pack 命令
- [ ] **现有插件更新**: 至少更新 3 个现有插件的 package.json
- [ ] **.gitignore 更新**: ZIP 文件被正确忽略
- [ ] **README 更新**: 文档中包含打包说明

## 8. 风险评估

### 8.1 技术风险

**风险 1**: archiver 版本兼容性
- **描述**: archiver v8.0.0 可能与某些 Node.js 版本不兼容
- **概率**: 低
- **影响**: 中
- **缓解措施**: 
  - 在脚本开头检查 Node.js 版本（要求 >= 18）
  - 添加 try-catch 包裹 archiver 初始化
  - 提供降级方案（提示用户安装系统 zip 工具）

**风险 2**: 大文件打包性能
- **描述**: 如果插件包含大量静态资源，打包可能较慢
- **概率**: 低（插件通常很小）
- **影响**: 低
- **缓解措施**: 
  - 使用流式处理（archiver 已支持）
  - 添加进度提示（可选优化）

### 8.2 兼容性风险

**风险 3**: 路径分隔符问题
- **描述**: Windows 使用 `\`，Unix 使用 `/`，可能导致 ZIP 内部路径不一致
- **概率**: 中
- **影响**: 低（archiver 会自动处理）
- **缓解措施**: 
  - 使用 `path.posix.join()` 确保 ZIP 内部使用 Unix 风格路径
  - 在不同平台测试验证

**风险 4**: 文件编码问题
- **描述**: plugin.json 中的中文描述可能在 ZIP 中乱码
- **概率**: 低
- **影响**: 低
- **缓解措施**: 
  - 确保使用 UTF-8 编码读写文件
  - archiver 默认支持 UTF-8

### 8.3 用户体验风险

**风险 5**: 用户忘记先构建
- **描述**: 直接运行 `pnpm pack` 而未先执行 `pnpm build`
- **概率**: 高
- **影响**: 中
- **缓解措施**: 
  - 检测 dist/ 不存在时给出清晰提示
  - 在 README 中强调构建顺序
  - 可选：自动触发构建（但可能增加复杂性）

**风险 6**: ZIP 文件覆盖无提示
- **描述**: 重复打包时静默覆盖旧文件
- **概率**: 中
- **影响**: 低
- **缓解措施**: 
  - 如果文件已存在，输出警告日志
  - 可选：添加 `--force` 参数控制

### 8.4 维护风险

**风险 7**: 插件结构变化
- **描述**: 未来插件目录结构可能调整，导致打包脚本失效
- **概率**: 低
- **影响**: 中
- **缓解措施**: 
  - 脚本中使用相对路径和配置化设计
  - 添加单元测试验证基本功能
  - 在 DEVELOPMENT_GUIDE.md 中记录打包规范

## 9. 后续优化方向

### 9.1 短期优化（可选）

1. **自动构建**: 在 pack 命令中自动触发 build（如果 dist/ 不存在或过期）
2. **批量打包**: 添加 `scripts/pack-all-plugins.js` 一次性打包所有插件
3. **校验和生成**: 生成 SHA256 校验文件用于完整性验证
4. **元数据注入**: 在 ZIP 中添加 manifest.json 包含更多元数据

### 9.2 长期优化

1. **插件市场集成**: 打包后自动上传到插件市场（需要 API 支持）
2. **增量打包**: 仅打包变更的文件，提升速度
3. **签名支持**: 为 ZIP 文件添加数字签名确保安全性
4. **版本管理**: 自动生成 changelog 并嵌入 ZIP

## 10. 相关约定引用

### 10.1 user-conventions.md

- **第 1.1 节 - 插件化架构**: "核心轻量，功能通过插件扩展" → ZIP 打包支持插件独立分发
- **第 1.2 节 - 技术选型原则**: "避免引入过多的第三方依赖" → 复用已有 archiver
- **第 2.1 节 - 命名规范**: camelCase/PascalCase 等命名规则
- **第 2.5 节 - 错误处理**: "所有异步操作必须包含错误处理"
- **第 4 节 - 文档要求**: "公共 API 必须有 JSDoc/tsdoc 注释"

### 10.2 project-conventions.md

- 当前版本为空框架，待 CodeReview-Agent 填充具体内容
- 本规划遵循通用 JavaScript/TypeScript 最佳实践

## 11. 实施时间表

| 阶段 | 任务 | 预估时间 | 优先级 |
| :--- | :--- | :--- | :--- |
| 1 | 创建 pack-plugin.js 核心脚本 | 1-2 小时 | P0 |
| 2 | 更新 create-plugin.js 模板 | 30 分钟 | P0 |
| 3 | 更新现有插件 package.json | 30 分钟 | P1 |
| 4 | 更新 .gitignore 模板 | 10 分钟 | P0 |
| 5 | 测试验证（新建+现有插件） | 1 小时 | P0 |
| 6 | 文档更新（README/DEVELOPMENT_GUIDE） | 30 分钟 | P1 |

**总计**: 3.5-4.5 小时

## 12. 交付物清单

- [ ] `scripts/pack-plugin.js` - 核心打包脚本（~150 行）
- [ ] 更新的 `scripts/create-plugin.js` - 包含 pack 命令模板
- [ ] 更新的 5 个插件 package.json - 添加 pack 脚本
- [ ] 更新的 `.gitignore` 模板 - 包含 *.zip
- [ ] 测试报告 - 验证所有测试用例通过
- [ ] 本文档 - `.lingma/plans/plugin-zip-packaging.md`

---

**规划完成时间**: 2026-05-09  
**规划作者**: Planning-Agent  
**审核状态**: 待 Implementation-Agent 实现
