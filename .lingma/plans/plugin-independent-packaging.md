# 插件独立打包功能规划文档

## 1. 任务概述

- **复杂度评级**: L2 - 中等（多文件但逻辑清晰，预估代码量 400-600 行）
- **输入源**: 
  - `scripts/pack-plugin.js` - 当前集中式打包脚本（178 行）
  - `.lingma/plans/plugin-zip-packaging.md` - 已有 ZIP 打包规划
  - `.lingma/conventions/user-conventions.md` - 用户约定（性能优先、插件化架构）
  - `.lingma/conventions/project-conventions.md` - 项目约定（插件打包规范）
  - 6 个现有插件的 `package.json` 配置
- **输出目标**: 
  - 每个插件具备独立打包能力，不依赖根目录脚本
  - 保持现有功能和 ZIP 格式完全兼容
  - 提供平滑迁移路径

### 1.1 背景说明

当前 Quick Actions 项目的插件打包存在以下问题：

**现状分析**:
```
项目根目录/
├── scripts/
│   └── pack-plugin.js          ← 所有插件依赖此脚本
├── plugins/
│   ├── uuid-generator/
│   │   ├── package.json        ← "pack": "node ../../scripts/pack-plugin.js"
│   │   └── ...
│   ├── everything-search/
│   │   ├── package.json        ← "pack": "node ../../scripts/pack-plugin.js"
│   │   └── ...
│   └── ... (共 6 个插件)
└── package.json                ← archiver@8.0.0 仅在此安装
```

**核心问题**:
1. ❌ **非独立性**: 插件离开 Monorepo 无法打包（缺少 `../../scripts/pack-plugin.js`）
2. ❌ **外部依赖**: 依赖根目录的 archiver 库，插件自身无打包能力
3. ❌ **分发困难**: 单独分享插件时，接收者无法直接打包
4. ❌ **耦合度高**: 移动插件到其他位置会导致打包失败

**需求目标**:
```
理想状态（每个插件自包含）:
plugins/uuid-generator/
├── package.json        ← 内置打包脚本或引用独立包
├── pack-plugin.js      ← 或独立的打包工具
├── plugin.json
├── dist/
└── uuid-generator-1.0.0.zip  ← 可独立生成
```

## 2. 可复用资源

### 2.1 已有实现

#### 2.1.1 核心打包逻辑 (`scripts/pack-plugin.js`)
- **功能完整**: 已实现 ZIP 打包的所有核心逻辑
  - 读取 `plugin.json` 获取元数据
  - 验证 `dist/` 目录存在
  - 使用 archiver 创建 ZIP（压缩级别 9）
  - 添加 `dist/`, `plugin.json`, `README.md`（可选）
  - 完善的错误处理和日志输出
- **代码质量**: 
  - 符合 user-conventions.md 命名规范
  - 完整的 JSDoc 注释（包括 @throws）
  - 模块化设计（4 个独立函数）
  - 总行数 178 行，易于移植

#### 2.1.2 项目约定
- **project-conventions.md 第 5.1 节**: 明确定义了插件打包规范
  - ZIP 命名格式: `{plugin-id}-{version}.zip`
  - ZIP 内容要求: `dist/`, `plugin.json`, `README.md`（可选）
  - 压缩级别: 9（最高）
  - 必须先执行 `pnpm build`
- **user-conventions.md 第 1.2 节**: "避免引入过多的第三方依赖"

### 2.2 技术栈分析

**当前依赖**:
- `archiver@8.0.0`: Node.js ZIP 打包库
  - 优点: 流式处理、内存效率高、API 简洁
  - 缺点: 需要安装到每个插件会增加体积
  - 体积: ~50KB（含依赖）

**Node.js 原生能力**:
- `zlib` 模块: 提供 deflate/gzip 压缩
- `fs` 模块: 文件系统操作
- 限制: 无原生 ZIP 支持，需自行实现 ZIP 格式

## 3. 技术方案对比

### 方案 A: 每个插件安装独立的 archiver 依赖

**实现方式**:
```json
// plugins/uuid-generator/package.json
{
  "devDependencies": {
    "archiver": "^8.0.0"
  },
  "scripts": {
    "pack": "node ./scripts/pack-plugin.js"
  }
}
```

**优点**:
- ✅ **完全独立**: 插件可在任何位置打包，无需外部依赖
- ✅ **实现简单**: 直接复制现有 `pack-plugin.js` 到每个插件
- ✅ **向后兼容**: ZIP 格式和命令完全一致
- ✅ **维护清晰**: 每个插件独立管理自己的打包逻辑

**缺点**:
- ❌ **重复依赖**: 6 个插件 × 50KB = 300KB 额外空间
- ❌ **版本管理**: 需要确保所有插件的 archiver 版本一致
- ❌ **安装时间**: 每个插件首次安装需下载 archiver

**适用场景**: 
- 插件需要完全独立分发
- 团队接受适度的存储开销
- 追求实现简单和维护清晰

**成本评估**:
- 存储空间: +300KB（6 个插件）
- 安装时间: +2-3 秒/插件（首次）
- 维护成本: 低（每个插件独立）

---

### 方案 B: 使用 Node.js 原生模块实现 ZIP 打包

**实现方式**:
```javascript
// 使用 zlib + 自定义 ZIP 格式生成器
import { createDeflate } from 'zlib';
import fs from 'fs';

// 简化版 ZIP 实现（需处理 ZIP 文件格式）
function createZip(files) {
  // 实现 ZIP 文件头、中央目录等
  // 复杂度较高，约需 300-500 行代码
}
```

**优点**:
- ✅ **零依赖**: 无需安装任何第三方库
- ✅ **轻量级**: 插件体积最小
- ✅ **完全控制**: 可定制 ZIP 格式和行为

**缺点**:
- ❌ **实现复杂**: ZIP 是复杂格式（本地文件头、中央目录、数据描述符等）
- ❌ **维护成本高**: 需处理边界情况（大文件、特殊字符、权限等）
- ❌ **兼容性风险**: 自实现可能与标准 ZIP 工具不完全兼容
- ❌ **开发时间**: 预计需要 8-12 小时开发和测试

**适用场景**: 
- 对依赖极度敏感的项目
- 有充足时间进行开发和测试
- 团队有 ZIP 格式专业知识

**成本评估**:
- 开发时间: 8-12 小时
- 维护成本: 高（需持续修复兼容性问题）
- 风险等级: 中高

---

### 方案 C: 创建插件模板包 (@quick-actions/plugin-packager)

**实现方式**:
```
packages/
└── plugin-packager/
    ├── package.json      ← 发布为 npm 包
    ├── index.js          ← 导出 packPlugin 函数
    └── README.md

plugins/uuid-generator/
├── package.json
│   └── "devDependencies": { "@quick-actions/plugin-packager": "^1.0.0" }
└── scripts/pack.js
    └── import { packPlugin } from '@quick-actions/plugin-packager';
```

**优点**:
- ✅ **统一管理**: 打包逻辑集中在一个包中
- ✅ **版本控制**: 通过 npm 版本管理更新
- ✅ **代码复用**: 避免重复代码
- ✅ **易于升级**: 更新 packager 包即可升级所有插件

**缺点**:
- ❌ **仍有外部依赖**: 插件不真正独立（依赖 @quick-actions/plugin-packager）
- ❌ **发布复杂**: 需要维护额外的 npm 包
- ❌ **网络依赖**: 首次使用需从 npm registry 下载
- ❌ **Monorepo 内优势不明显**: 在 workspace 中仍共享 node_modules

**适用场景**: 
- 插件生态较大（>20 个插件）
- 需要频繁更新打包逻辑
- 团队内部统一管理

**成本评估**:
- 开发时间: 2-3 小时（重构现有代码为 npm 包）
- 维护成本: 中（需维护独立包）
- 独立性: 部分独立（仍依赖 npm 包）

---

### 方案 D: 使用 npx 动态执行打包脚本

**实现方式**:
```json
// plugins/uuid-generator/package.json
{
  "scripts": {
    "pack": "npx @quick-actions/pack-plugin@latest"
  }
}
```

**优点**:
- ✅ **零安装**: 插件无需安装任何依赖
- ✅ **始终最新**: 每次使用最新版本
- ✅ **极简插件**: 插件 package.json 最简洁

**缺点**:
- ❌ **网络依赖**: 每次打包需联网下载（速度慢）
- ❌ **不可靠**: 网络不稳定时无法打包
- ❌ **缓存问题**: npx 缓存可能导致版本不一致
- ❌ **离线不可用**: 无法在无网络环境打包

**适用场景**: 
- 偶尔打包的场景
- 对打包速度不敏感
- 始终有稳定网络连接

**成本评估**:
- 首次打包时间: 5-10 秒（下载 + 执行）
- 后续打包时间: 1-2 秒（缓存命中）
- 可靠性: 中（依赖网络）

---

### 方案对比总结

| 维度 | 方案 A | 方案 B | 方案 C | 方案 D |
| :--- | :--- | :--- | :--- | :--- |
| **独立性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **实现难度** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **维护成本** | 低 | 高 | 中 | 低 |
| **存储空间** | +300KB | 0KB | +50KB | 0KB |
| **打包速度** | 快 | 快 | 快 | 慢（首次） |
| **离线可用** | ✅ | ✅ | ❌ | ❌ |
| **兼容性** | ✅ | ⚠️ | ✅ | ✅ |
| **开发时间** | 1-2h | 8-12h | 2-3h | 0.5h |

**评分说明**:
- 独立性: 是否能在无外部依赖下打包
- 实现难度: 从易到难（⭐越多越容易）
- 维护成本: 从低到高
- 存储空间: 额外占用的磁盘空间
- 打包速度: 从快到慢
- 离线可用: 是否支持无网络环境
- 兼容性: 与现有 ZIP 格式的兼容程度
- 开发时间: 预估实施所需时间

## 4. 推荐方案

### 4.1 最终选择: **方案 A（改进版）**

**选择理由**:

1. **符合项目思想** (user-conventions.md 第 1.1 节):
   - "插件化架构: 核心轻量，功能通过插件扩展，保持系统灵活性和可维护性"
   - 方案 A 让每个插件真正独立，符合插件化架构理念

2. **平衡性能和独立性** (user-conventions.md 第 1.2 节):
   - "避免引入过多的第三方依赖" → archiver 是唯一依赖，且体积小（50KB）
   - 300KB 总开销对于桌面应用可接受（相比 Tauri 应用的 MB 级体积）

3. **实现简单可靠**:
   - 复用现有成熟代码（178 行已验证的实现）
   - 无需重新发明轮子（ZIP 格式复杂）
   - 1-2 小时即可完成迁移

4. **向后完全兼容**:
   - ZIP 格式不变
   - 命令接口不变（`pnpm pack`）
   - 不影响现有工作流

5. **长期维护友好**:
   - 每个插件独立演进
   - 可根据需要定制打包逻辑
   - 易于调试和问题定位

### 4.2 改进点

**标准方案 A 的问题**:
- 直接复制 `pack-plugin.js` 到 6 个插件会产生代码重复
- 未来修改打包逻辑需要同步 6 份代码

**改进策略**: **混合方案（A + C 的优点）**

```
阶段 1: 短期（立即实施）
- 采用方案 A：每个插件复制 pack-plugin.js
- 快速实现独立打包能力

阶段 2: 中期（可选优化）
- 如果插件数量增长到 >10 个
- 再考虑抽取为 @quick-actions/plugin-packager 包
- 通过继承或组合方式减少重复
```

**决策依据**:
- 当前仅 6 个插件，代码重复可控
- 过早抽象会增加复杂性（违反 KISS 原则）
- 保留未来优化空间

## 5. 实现步骤

### 阶段 1: 准备独立打包脚本（1 小时）

#### 步骤 1.1: 创建插件级打包脚本模板

**文件**: `scripts/templates/pack-plugin-standalone.js`

**内容**: 基于现有 `scripts/pack-plugin.js`，调整为相对路径

**关键修改**:
```javascript
// 原代码（依赖根目录）
const pluginDir = path.resolve(__dirname, '..', 'plugins', pluginName);

// 新代码（插件内相对路径）
const pluginDir = path.resolve(__dirname, '..');
```

**完整模板结构**:
```javascript
#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Validate plugin directory and read metadata
 * @param {string} pluginDir - Absolute path to plugin directory
 * @returns {Object} Plugin metadata with id and version
 * @throws {Error} If plugin.json is missing or invalid (exits with code 1)
 */
function loadPluginMetadata(pluginDir) {
  // ... 保持原有逻辑
}

/**
 * Validate build output directory exists
 * @param {string} pluginDir - Absolute path to plugin directory
 * @throws {Error} If dist/ directory does not exist (exits with code 1)
 */
function validateBuildOutput(pluginDir) {
  // ... 保持原有逻辑
}

/**
 * Create ZIP archive from plugin files
 * @param {string} zipFilePath - Path for the output ZIP file
 * @param {string} distDir - Path to dist directory
 * @param {string} pluginJsonPath - Path to plugin.json
 * @param {string} pluginDir - Path to plugin root directory
 * @param {string} zipFileName - Name of the ZIP file for logging
 * @returns {Promise<void>}
 */
function createZipArchive(zipFilePath, distDir, pluginJsonPath, pluginDir, zipFileName) {
  // ... 保持原有逻辑
}

/**
 * Pack a plugin into a ZIP file
 * @param {string} pluginDir - Absolute path to plugin directory (optional, defaults to parent dir)
 * @throws {Error} If packing fails (exits with code 1)
 * @returns {Promise<void>}
 */
async function packPlugin(pluginDir = null) {
  console.log('🚀 Packing plugin...');

  // Resolve plugin directory (default to parent directory of this script)
  const resolvedPluginDir = pluginDir || path.resolve(__dirname, '..');

  // Validate plugin directory exists
  if (!fs.existsSync(resolvedPluginDir)) {
    console.error(`❌ Error: Plugin directory not found: ${resolvedPluginDir}`);
    process.exit(1);
  }

  // Load and validate plugin metadata
  const { pluginId, version, pluginJsonPath } = loadPluginMetadata(resolvedPluginDir);

  // Validate build output
  const distDir = validateBuildOutput(resolvedPluginDir);

  // Generate ZIP file path
  const zipFileName = `${pluginId}-${version}.zip`;
  const zipFilePath = path.join(resolvedPluginDir, zipFileName);

  // Warn if ZIP file already exists
  if (fs.existsSync(zipFilePath)) {
    console.warn(`⚠️  Overwriting existing ZIP file: ${zipFileName}`);
  }

  console.log(`📦 Creating ZIP file: ${zipFileName}`);

  // Create ZIP archive
  await createZipArchive(zipFilePath, distDir, pluginJsonPath, resolvedPluginDir, zipFileName);
}

// Execute packing
packPlugin().catch((error) => {
  console.error(`❌ Unexpected error: ${error.message}`);
  process.exit(1);
});
```

**差异对比**:
| 项目 | 原脚本 | 新脚本 |
| :--- | :--- | :--- |
| 参数解析 | 从命令行读取插件名 | 无需参数，自动检测父目录 |
| 路径计算 | `path.resolve(__dirname, '..', 'plugins', pluginName)` | `path.resolve(__dirname, '..')` |
| 调用方式 | `node scripts/pack-plugin.js uuid-generator` | `node scripts/pack-plugin.js` |
| 依赖路径 | `import { ZipArchive } from 'archiver'` | `import archiver from 'archiver'` |

**注意**: 原脚本使用 `import { ZipArchive } from 'archiver'`，但 archiver v8 的正确导入方式是 `import archiver from 'archiver'`，需要修正。

#### 步骤 1.2: 验证模板正确性

**测试命令**:
```bash
# 在 uuid-generator 插件中测试
cd plugins/uuid-generator
cp ../../scripts/templates/pack-plugin-standalone.js scripts/pack-plugin.js
pnpm install archiver --save-dev
node scripts/pack-plugin.js
# 应成功生成 uuid-generator-1.0.0.zip
```

---

### 阶段 2: 批量应用到现有插件（30 分钟）

#### 步骤 2.1: 为每个插件创建 scripts 目录

**目标插件列表**:
1. `plugins/uuid-generator`
2. `plugins/everything-search`
3. `plugins/js-console`
4. `plugins/json-explorer`
5. `plugins/process-manager`
6. `plugins/qa-test-plugin`

**操作**:
```bash
# 为每个插件创建 scripts 目录并复制脚本
for plugin in uuid-generator everything-search js-console json-explorer process-manager qa-test-plugin; do
  mkdir -p plugins/$plugin/scripts
  cp scripts/templates/pack-plugin-standalone.js plugins/$plugin/scripts/pack-plugin.js
done
```

#### 步骤 2.2: 更新每个插件的 package.json

**修改前**:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "pack": "node ../../scripts/pack-plugin.js"
  }
}
```

**修改后**:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "pack": "node ./scripts/pack-plugin.js"
  },
  "devDependencies": {
    "archiver": "^8.0.0"
  }
}
```

**批量更新脚本**（PowerShell）:
```powershell
$plugins = @("uuid-generator", "everything-search", "js-console", "json-explorer", "process-manager", "qa-test-plugin")

foreach ($plugin in $plugins) {
    $packageJsonPath = "plugins\$plugin\package.json"
    $packageJson = Get-Content $packageJsonPath | ConvertFrom-Json
    
    # 更新 pack 脚本路径
    $packageJson.scripts.pack = "node ./scripts/pack-plugin.js"
    
    # 添加 archiver 依赖
    if (-not $packageJson.devDependencies) {
        $packageJson.devDependencies = @{}
    }
    $packageJson.devDependencies.archiver = "^8.0.0"
    
    # 保存回文件
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath
}
```

#### 步骤 2.3: 安装依赖

**命令**:
```bash
# 在根目录执行，利用 pnpm workspace
pnpm install

# 或逐个插件安装
for plugin in uuid-generator everything-search js-console json-explorer process-manager qa-test-plugin; do
  cd plugins/$plugin
  pnpm install
  cd ../..
done
```

---

### 阶段 3: 更新插件创建模板（30 分钟）

#### 步骤 3.1: 修改 create-plugin.js

**文件**: `scripts/create-plugin.js`

**修改点 1**: 在生成的文件中添加 `scripts/pack-plugin.js`

**位置**: 在生成 package.json 后（约第 150-200 行之间）

**新增代码**:
```javascript
// Copy standalone pack script
const packScriptTemplate = fs.readFileSync(
  path.join(__dirname, 'templates', 'pack-plugin-standalone.js'),
  'utf-8'
);
const packScriptPath = path.join(pluginDir, 'scripts', 'pack-plugin.js');
fs.mkdirSync(path.dirname(packScriptPath), { recursive: true });
fs.writeFileSync(packScriptPath, packScriptTemplate, 'utf-8');
console.log('✅ Created scripts/pack-plugin.js');
```

**修改点 2**: 更新生成的 package.json 中的 pack 脚本

**位置**: 第 40-44 行（scripts 对象）

**修改前**:
```javascript
scripts: {
  dev: 'vite',
  build: 'vite build',
  preview: 'vite preview',
  pack: 'node ../../scripts/pack-plugin.js'
}
```

**修改后**:
```javascript
scripts: {
  dev: 'vite',
  build: 'vite build',
  preview: 'vite preview',
  pack: 'node ./scripts/pack-plugin.js'
}
```

**修改点 3**: 在生成的 package.json 中添加 archiver 依赖

**位置**: 在 devDependencies 对象中

**新增**:
```javascript
devDependencies: {
  // ... 现有依赖
  archiver: '^8.0.0'
}
```

#### 步骤 3.2: 更新 .gitignore 模板

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

#### 步骤 3.3: 更新 README.md 模板

**位置**: 第 343-378 行

**新增章节**（在 "Next steps" 后）:
```markdown
## 📦 Packaging

To distribute your plugin, pack it into a ZIP file:

```bash
pnpm pack
```

This will create `{plugin-id}-{version}.zip` in the plugin root directory.

The ZIP file contains:
- `dist/` - Built plugin files
- `plugin.json` - Plugin metadata
- `README.md` - Documentation (if exists)
```

---

### 阶段 4: 清理根目录脚本（可选，15 分钟）

#### 步骤 4.1: 标记旧脚本为废弃

**文件**: `scripts/pack-plugin.js`

**在文件顶部添加警告**:
```javascript
#!/usr/bin/env node

/**
 * ⚠️  DEPRECATED: This script is deprecated.
 * Each plugin now has its own independent packaging script.
 * Please use: plugins/{plugin-name}/scripts/pack-plugin.js
 * 
 * This file will be removed in a future version.
 */

console.warn('⚠️  Warning: This script is deprecated.');
console.warn('Please use the plugin-specific pack script instead:');
console.warn('  cd plugins/<plugin-name>');
console.warn('  pnpm pack\n');

// ... 原有代码保持不变，保持向后兼容
```

#### 步骤 4.2: 更新根目录 package.json（可选）

**移除不再需要的依赖**（如果确认所有插件都已迁移）:
```json
{
  "devDependencies": {
    // 移除 "archiver": "^8.0.0"
  }
}
```

**注意**: 建议暂时保留，直到确认所有插件正常工作后再移除。

---

### 阶段 5: 测试验证（1 小时）

#### 测试用例 1: 新建插件测试

**步骤**:
```bash
# 1. 创建新插件
node scripts/create-plugin.js test-independent-pack

# 2. 进入插件目录
cd plugins/test-independent-pack

# 3. 安装依赖
pnpm install

# 4. 构建
pnpm build

# 5. 打包
pnpm pack

# 6. 验证 ZIP 文件
ls -lh test-independent-pack-1.0.0.zip
unzip -l test-independent-pack-1.0.0.zip
```

**预期结果**:
- ✅ 生成 `test-independent-pack-1.0.0.zip`
- ✅ ZIP 包含 `dist/`, `plugin.json`, `README.md`
- ✅ 文件大小合理（< 1MB）

#### 测试用例 2: 现有插件迁移测试

**步骤**:
```bash
# 测试 uuid-generator
cd plugins/uuid-generator
pnpm install  # 安装 archiver
pnpm build
pnpm pack

# 验证
ls -lh uuid-generator-1.0.0.zip
```

**对所有 6 个插件重复此测试**。

#### 测试用例 3: 独立性测试

**步骤**:
```bash
# 1. 复制插件到临时目录
cp -r plugins/uuid-generator /tmp/test-plugin-independence

# 2. 进入临时目录
cd /tmp/test-plugin-independence

# 3. 尝试打包（不应依赖原项目）
pnpm install
pnpm build
pnpm pack

# 4. 验证成功
ls -lh uuid-generator-1.0.0.zip
```

**预期结果**:
- ✅ 在完全独立的环境中成功打包
- ✅ 无任何关于 `../../scripts/pack-plugin.js` 的错误

#### 测试用例 4: 错误处理测试

**步骤**:
```bash
cd plugins/uuid-generator

# 测试 1: 未构建
rm -rf dist
pnpm pack
# 应显示: Error: dist/ directory not found

# 测试 2: 缺少 plugin.json
mv plugin.json plugin.json.bak
pnpm pack
# 应显示: Error: plugin.json not found

# 恢复
mv plugin.json.bak plugin.json
pnpm build
```

#### 测试用例 5: 跨平台测试

**Windows PowerShell**:
```powershell
cd plugins\uuid-generator
pnpm build
pnpm pack
Test-Path uuid-generator-1.0.0.zip  # 应返回 True
```

---

### 阶段 6: 文档更新（30 分钟）

#### 步骤 6.1: 更新 DEVELOPMENT_GUIDE.md

**位置**: 第 367-378 行（插件打包说明）

**修改前**:
```markdown
### Pack Plugin

After building your plugin, manually compress it:

```bash
cd plugins/your-plugin
zip -r ../your-plugin.zip dist/ plugin.json README.md
```
```

**修改后**:
```markdown
### Pack Plugin

Each plugin has its own independent packaging script. To pack a plugin:

```bash
cd plugins/your-plugin
pnpm pack
```

This will create `your-plugin-{version}.zip` in the plugin directory.

**Requirements**:
- Plugin must be built first (`pnpm build`)
- `plugin.json` must exist with valid `id` and `version` fields

**What's included in ZIP**:
- `dist/` - Built plugin files
- `plugin.json` - Plugin metadata
- `README.md` - Documentation (if exists)
```

#### 步骤 6.2: 创建迁移指南

**文件**: `docs/MIGRATION_TO_INDEPENDENT_PACKAGING.md`

**内容大纲**:
```markdown
# 迁移到独立打包指南

## 背景
从集中式打包迁移到插件独立打包，提升插件独立性。

## 迁移步骤
1. 更新到最新版本代码
2. 运行 `pnpm install` 安装新依赖
3. 使用 `pnpm pack` 替代 `node ../../scripts/pack-plugin.js`

## 常见问题
Q: 旧脚本还能用吗？
A: 可以，但会显示废弃警告。建议尽快迁移。

Q: 需要手动做什么？
A: 无需手动操作，`pnpm install` 会自动安装 archiver。

## 回滚方案
如遇问题，可临时使用根目录脚本：
```bash
node ../../scripts/pack-plugin.js <plugin-name>
```
```

---

## 6. 代码示例

### 6.1 独立打包脚本完整示例

**文件**: `plugins/uuid-generator/scripts/pack-plugin.js`

```javascript
#!/usr/bin/env node

/**
 * Standalone plugin packaging script
 * Packs the plugin into a ZIP file for distribution
 * 
 * Usage: node scripts/pack-plugin.js
 * Or: pnpm pack
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Validate plugin directory and read metadata
 * @param {string} pluginDir - Absolute path to plugin directory
 * @returns {Object} Plugin metadata with id and version
 * @throws {Error} If plugin.json is missing or invalid (exits with code 1)
 */
function loadPluginMetadata(pluginDir) {
  console.log('📂 Reading plugin metadata...');
  const pluginJsonPath = path.join(pluginDir, 'plugin.json');

  if (!fs.existsSync(pluginJsonPath)) {
    console.error(`❌ Error: plugin.json not found in ${pluginDir}`);
    process.exit(1);
  }

  let pluginMeta;
  try {
    const pluginJsonContent = fs.readFileSync(pluginJsonPath, 'utf-8');
    pluginMeta = JSON.parse(pluginJsonContent);
  } catch (error) {
    console.error(`❌ Error: Invalid plugin.json format - ${error.message}`);
    process.exit(1);
  }

  const pluginId = pluginMeta.id;
  const version = pluginMeta.version;

  if (!pluginId || !version) {
    console.error('❌ Error: plugin.json must contain "id" and "version" fields');
    process.exit(1);
  }

  console.log(`✅ Plugin ID: ${pluginId}`);
  console.log(`✅ Version: ${version}`);

  return { pluginId, version, pluginJsonPath };
}

/**
 * Validate build output directory exists
 * @param {string} pluginDir - Absolute path to plugin directory
 * @throws {Error} If dist/ directory does not exist (exits with code 1)
 */
function validateBuildOutput(pluginDir) {
  console.log('✅ Validating build output...');
  const distDir = path.join(pluginDir, 'dist');

  if (!fs.existsSync(distDir)) {
    console.error("❌ Error: dist/ directory not found. Run 'pnpm build' first.");
    process.exit(1);
  }

  // Check if dist is empty
  const distFiles = fs.readdirSync(distDir);
  if (distFiles.length === 0) {
    console.warn('⚠️  Warning: dist/ directory is empty. Consider running "pnpm build" first.');
  }

  return distDir;
}

/**
 * Create ZIP archive from plugin files
 * @param {string} zipFilePath - Path for the output ZIP file
 * @param {string} distDir - Path to dist directory
 * @param {string} pluginJsonPath - Path to plugin.json
 * @param {string} pluginDir - Path to plugin root directory
 * @param {string} zipFileName - Name of the ZIP file for logging
 * @returns {Promise<void>}
 */
function createZipArchive(zipFilePath, distDir, pluginJsonPath, pluginDir, zipFileName) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Handle stream close event
    output.on('close', () => {
      const sizeBytes = archive.pointer();
      const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);
      console.log('✅ Plugin packed successfully!');
      console.log(`📦 File: ${zipFileName}`);
      console.log(`📊 Size: ${sizeMB} MB`);
      resolve();
    });

    // Handle archive errors
    archive.on('error', (err) => {
      console.error(`❌ Error: Failed to create ZIP archive - ${err.message}`);
      reject(err);
    });

    // Pipe archive data to the file
    archive.pipe(output);

    // Add dist/ directory
    archive.directory(distDir, 'dist');

    // Add plugin.json
    archive.file(pluginJsonPath, { name: 'plugin.json' });

    // Add README.md if it exists
    const readmePath = path.join(pluginDir, 'README.md');
    if (fs.existsSync(readmePath)) {
      archive.file(readmePath, { name: 'README.md' });
    }

    // Finalize the archive
    archive.finalize().catch((err) => {
      console.error(`❌ Error: Failed to finalize archive - ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Pack a plugin into a ZIP file
 * @param {string} pluginDir - Absolute path to plugin directory (optional, defaults to parent dir)
 * @throws {Error} If packing fails (exits with code 1)
 * @returns {Promise<void>}
 */
async function packPlugin(pluginDir = null) {
  console.log('🚀 Packing plugin...');

  // Resolve plugin directory (default to parent directory of this script)
  const resolvedPluginDir = pluginDir || path.resolve(__dirname, '..');

  // Validate plugin directory exists
  if (!fs.existsSync(resolvedPluginDir)) {
    console.error(`❌ Error: Plugin directory not found: ${resolvedPluginDir}`);
    process.exit(1);
  }

  // Load and validate plugin metadata
  const { pluginId, version, pluginJsonPath } = loadPluginMetadata(resolvedPluginDir);

  // Validate build output
  const distDir = validateBuildOutput(resolvedPluginDir);

  // Generate ZIP file path
  const zipFileName = `${pluginId}-${version}.zip`;
  const zipFilePath = path.join(resolvedPluginDir, zipFileName);

  // Warn if ZIP file already exists
  if (fs.existsSync(zipFilePath)) {
    console.warn(`⚠️  Overwriting existing ZIP file: ${zipFileName}`);
  }

  console.log(`📦 Creating ZIP file: ${zipFileName}`);

  // Create ZIP archive
  await createZipArchive(zipFilePath, distDir, pluginJsonPath, resolvedPluginDir, zipFileName);
}

// Execute packing
packPlugin().catch((error) => {
  console.error(`❌ Unexpected error: ${error.message}`);
  process.exit(1);
});
```

### 6.2 package.json 配置示例

**文件**: `plugins/uuid-generator/package.json`

```json
{
  "name": "@quick-actions/plugin-uuid-generator",
  "version": "1.0.0",
  "type": "module",
  "description": "A Quick Actions plugin - uuid-generator",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "pack": "node ./scripts/pack-plugin.js"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "archiver": "^8.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

### 6.3 目录结构示例

**迁移后的插件结构**:
```
plugins/uuid-generator/
├── scripts/
│   └── pack-plugin.js          ← 新增：独立打包脚本
├── src/
│   ├── index.tsx
│   └── App.tsx
├── dist/                       ← 构建产物
│   └── index.js
├── package.json                ← 更新：pack 脚本路径 + archiver 依赖
├── plugin.json
├── vite.config.ts
├── tsconfig.json
├── README.md
└── uuid-generator-1.0.0.zip    ← 生成的 ZIP 文件
```

## 7. 迁移策略

### 7.1 迁移时间表

| 阶段 | 时间 | 任务 | 负责人 |
| :--- | :--- | :--- | :--- |
| **准备期** | Day 1 | 创建模板脚本，验证可行性 | Planning-Agent |
| **实施期** | Day 2 | 批量应用到 6 个现有插件 | Implementation-Agent |
| **测试期** | Day 3 | 全面测试（功能+独立性+兼容性） | QA-Agent |
| **文档期** | Day 4 | 更新文档和迁移指南 | Implementation-Agent |
| **观察期** | Day 5-7 | 监控使用情况，收集反馈 | CodeReview-Agent |
| **清理期** | Day 8+ | 移除废弃脚本（如需要） | Implementation-Agent |

**总计**: 4-8 天完成完整迁移

### 7.2 向后兼容性保障

**策略**: 渐进式迁移，分三个阶段

#### 阶段 1: 双轨并行（第 1-2 周）
- ✅ 新脚本可用：`node ./scripts/pack-plugin.js`
- ✅ 旧脚本保留：`node ../../scripts/pack-plugin.js`（带警告）
- ✅ 两者生成相同的 ZIP 格式

**实现**:
```javascript
// scripts/pack-plugin.js (根目录)
console.warn('⚠️  Warning: This script is deprecated.');
console.warn('Please use: cd plugins/<plugin-name> && pnpm pack\n');

// 继续执行原有逻辑，保持兼容
```

#### 阶段 2: 警告强化（第 3-4 周）
- ⚠️ 旧脚本显示更明显的警告
- ⚠️ 在 CI/CD 中标记使用旧脚本为警告
- ✅ 鼓励所有开发者迁移到新脚本

#### 阶段 3: 完全移除（第 5 周+）
- ❌ 移除根目录 `scripts/pack-plugin.js`
- ❌ 从根目录 `package.json` 移除 archiver 依赖
- ✅ 仅保留插件级脚本

**判断标准**:
- 所有 6 个插件已成功迁移
- 连续 2 周无使用旧脚本的记录
- 团队确认可安全移除

### 7.3 风险控制

#### 风险 1: 依赖安装失败

**场景**: 某些插件安装 archiver 时失败

**缓解措施**:
```bash
# 提供备用安装命令
pnpm add archiver --save-dev --filter "./plugins/*"

# 或逐个安装
cd plugins/uuid-generator
pnpm add archiver --save-dev
```

**回滚方案**: 继续使用根目录脚本

#### 风险 2: 路径问题（Windows vs Unix）

**场景**: 相对路径在不同操作系统表现不一致

**缓解措施**:
- 使用 `path.resolve()` 而非硬编码路径
- 在所有平台测试验证
- 使用 `fileURLToPath` 处理 ES 模块路径

#### 风险 3: ZIP 格式不一致

**场景**: 新旧脚本生成的 ZIP 内容有细微差异

**验证方法**:
```bash
# 比较两种方式的输出
cd plugins/uuid-generator

# 方式 1: 新脚本
pnpm pack
mv uuid-generator-1.0.0.zip new.zip

# 方式 2: 旧脚本
node ../../scripts/pack-plugin.js uuid-generator
mv uuid-generator-1.0.0.zip old.zip

# 比较内容
unzip -l new.zip > new.txt
unzip -l old.zip > old.txt
diff new.txt old.txt
```

**预期**: 应无差异或仅有时间戳差异

### 7.4 迁移检查清单

**实施前**:
- [ ] 备份现有代码（git commit）
- [ ] 创建测试分支
- [ ] 准备回滚计划

**实施中**:
- [ ] 逐个插件迁移，每迁移一个立即测试
- [ ] 记录遇到的问题和解决方案
- [ ] 保持与团队的沟通

**实施后**:
- [ ] 所有插件测试通过
- [ ] 文档已更新
- [ ] 团队成员知晓变更
- [ ] CI/CD 管道验证通过

## 8. 验收标准

### 8.1 功能完整性

- [ ] **独立打包**: 每个插件可独立执行 `pnpm pack` 生成 ZIP
- [ ] **ZIP 格式**: 文件名 `{plugin-id}-{version}.zip`，内容与原方案一致
- [ ] **压缩质量**: 使用 zlib level 9 压缩
- [ ] **文件内容**: 包含 `dist/`, `plugin.json`, `README.md`（如存在）
- [ ] **错误处理**: 缺少 dist/ 或 plugin.json 时给出明确提示

**验证命令**:
```bash
cd plugins/uuid-generator
pnpm build
pnpm pack
unzip -l uuid-generator-1.0.0.zip
# 应显示: dist/, plugin.json, README.md
```

### 8.2 独立性验收

- [ ] **脱离 Monorepo**: 复制插件到其他目录仍可打包
- [ ] **无外部依赖**: 不依赖 `../../scripts/pack-plugin.js`
- [ ] **自包含依赖**: 每个插件有自己的 archiver 实例

**验证方法**:
```bash
# 复制到临时目录
cp -r plugins/uuid-generator /tmp/independent-test
cd /tmp/independent-test

# 清理 node_modules 重新安装
rm -rf node_modules
pnpm install
pnpm build
pnpm pack

# 验证成功
ls -lh uuid-generator-1.0.0.zip
```

### 8.3 兼容性验收

- [ ] **向后兼容**: 旧脚本仍可工作（带警告）
- [ ] **ZIP 兼容**: 新生成的 ZIP 与原格式完全一致
- [ ] **命令兼容**: `pnpm pack` 命令接口不变
- [ ] **工作流不变**: 不影响 `pnpm build`, `pnpm dev` 等其他命令

**验证方法**:
```bash
# 测试旧脚本仍可用
cd plugins/uuid-generator
node ../../scripts/pack-plugin.js uuid-generator
# 应显示警告但仍生成 ZIP
```

### 8.4 命名一致性

- [ ] **变量命名**: 符合 user-conventions.md 第 2.1 节（camelCase）
- [ ] **函数命名**: 符合 user-conventions.md 第 2.1 节（动词开头）
- [ ] **注释语言**: 使用英文注释
- [ ] **JSDoc**: 公共函数有完整 JSDoc 注释

**检查工具**:
```bash
# 人工审查关键函数命名
grep -n "function\|const\|let" plugins/*/scripts/pack-plugin.js
```

### 8.5 规范遵循

- [ ] **代码风格**: 遵循 user-conventions.md 第 2.2 节
  - 函数长度 < 50 行
  - 文件长度 < 300 行
  - 2 空格缩进
- [ ] **错误处理**: 遵循 user-conventions.md 第 2.5 节
  - 所有异步操作有错误处理
  - 无空 catch 块
  - 有意义的错误信息
- [ ] **文档要求**: 遵循 user-conventions.md 第 4 节
  - 公共函数有 JSDoc
  - 复杂逻辑有注释

### 8.6 编译/运行检查

- [ ] **语法检查**: `node --check scripts/pack-plugin.js` 无错误
- [ ] **依赖可用**: archiver 可正常导入
- [ ] **跨平台**: Windows/macOS/Linux 均可运行
- [ ] **ES 模块**: 使用 import/export 语法

**验证命令**:
```bash
cd plugins/uuid-generator
node --check scripts/pack-plugin.js
# 应无输出（成功）
```

### 8.7 性能要求

- [ ] **打包速度**: 单个插件打包时间 < 2 秒
- [ ] **内存占用**: 峰值内存 < 100MB
- [ ] **压缩率**: ZIP 比原始 dist/ 小至少 30%

**测试方法**:
```bash
# 测量时间
time pnpm pack
# real 时间应 < 2s

# 测量大小
du -sh dist/
ls -lh *.zip
# 压缩率应 > 30%
```

### 8.8 集成验收

- [ ] **create-plugin 更新**: 新创建的插件自动包含独立打包能力
- [ ] **现有插件更新**: 6 个插件全部迁移完成
- [ ] **.gitignore 更新**: ZIP 文件被正确忽略
- [ ] **文档更新**: DEVELOPMENT_GUIDE.md 反映新流程

**验证命令**:
```bash
# 测试新建插件
node scripts/create-plugin.js test-new
cd plugins/test-new
cat package.json | grep "pack"
# 应显示: "pack": "node ./scripts/pack-plugin.js"

ls scripts/pack-plugin.js
# 应存在
```

## 9. 风险评估

### 9.1 技术风险

#### 风险 1: archiver 版本冲突

**描述**: 不同插件可能安装不同版本的 archiver

**概率**: 低  
**影响**: 低（archiver API 稳定）  
**缓解措施**: 
- 在根目录锁定版本 `"archiver": "^8.0.0"`
- 使用 pnpm 的 peer dependencies 机制
- 定期同步各插件的依赖版本

**监控方法**:
```bash
pnpm list archiver --recursive
# 应显示所有插件使用相同版本
```

#### 风险 2: Node.js 版本兼容性

**描述**: archiver v8 可能需要较新的 Node.js 版本

**概率**: 低  
**影响**: 中  
**缓解措施**: 
- 在脚本开头检查 Node.js 版本
- 要求 Node.js >= 18（已在项目中满足）

**检查代码**:
```javascript
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1));
if (majorVersion < 18) {
  console.error('❌ Error: Node.js 18 or higher is required');
  process.exit(1);
}
```

#### 风险 3: 大文件打包性能

**描述**: 如果插件包含大量静态资源，打包可能较慢

**概率**: 低（插件通常很小）  
**影响**: 低  
**缓解措施**: 
- archiver 已使用流式处理，内存效率高
- 如需优化，可添加进度提示

### 9.2 兼容性风险

#### 风险 4: 路径分隔符问题

**描述**: Windows 使用 `\`，Unix 使用 `/`

**概率**: 低（archiver 自动处理）  
**影响**: 低  
**缓解措施**: 
- 使用 `path.join()` 和 `path.resolve()`
- 在所有平台测试验证

#### 风险 5: 文件编码问题

**描述**: plugin.json 中的中文可能乱码

**概率**: 低  
**影响**: 低  
**缓解措施**: 
- 确保使用 UTF-8 编码读写
- archiver 默认支持 UTF-8

### 9.3 用户体验风险

#### 风险 6: 开发者混淆新旧脚本

**描述**: 开发者可能不清楚应该使用哪个脚本

**概率**: 中  
**影响**: 中  
**缓解措施**: 
- 旧脚本显示清晰的废弃警告
- 在文档中明确说明新流程
- 在 PR 模板中提醒使用新脚本

**警告示例**:
```
⚠️  Warning: This script is deprecated.
Please use the plugin-specific pack script instead:
  cd plugins/<plugin-name>
  pnpm pack
```

#### 风险 7: 忘记安装 archiver

**描述**: 开发者拉取代码后忘记运行 `pnpm install`

**概率**: 中  
**影响**: 中  
**缓解措施**: 
- 在 pack 脚本中检测 archiver 是否可用
- 给出清晰的安装提示

**检测代码**:
```javascript
try {
  await import('archiver');
} catch (error) {
  console.error('❌ Error: archiver module not found');
  console.error('Please run: pnpm install');
  process.exit(1);
}
```

### 9.4 维护风险

#### 风险 8: 代码重复导致维护困难

**描述**: 6 份相同的 pack-plugin.js 难以同步更新

**概率**: 中  
**影响**: 中  
**缓解措施**: 
- 将脚本提取为模板文件
- 在 create-plugin.js 中统一维护
- 如需修改，通过脚本批量更新

**批量更新脚本**:
```javascript
// scripts/update-pack-scripts.js
import fs from 'fs';
import path from 'path';

const template = fs.readFileSync('scripts/templates/pack-plugin-standalone.js', 'utf-8');
const plugins = ['uuid-generator', 'everything-search', /* ... */];

plugins.forEach(plugin => {
  const targetPath = path.join('plugins', plugin, 'scripts', 'pack-plugin.js');
  fs.writeFileSync(targetPath, template, 'utf-8');
  console.log(`✅ Updated ${plugin}`);
});
```

#### 风险 9: 插件结构变化

**描述**: 未来插件目录结构可能调整

**概率**: 低  
**影响**: 中  
**缓解措施**: 
- 脚本中使用相对路径和配置化设计
- 在文档中记录打包规范
- 添加单元测试验证基本功能

## 10. 相关约定引用

### 10.1 user-conventions.md

- **第 1.1 节 - 插件化架构**: "核心轻量，功能通过插件扩展，保持系统灵活性和可维护性"
  - → 本方案让每个插件真正独立，符合插件化理念
  
- **第 1.2 节 - 技术选型原则**: "避免引入过多的第三方依赖，控制 bundle size"
  - → 仅引入 archiver（50KB），体积可控
  
- **第 2.1 节 - 命名规范**: camelCase/PascalCase 等命名规则
  - → 所有变量、函数命名遵循此规范
  
- **第 2.5 节 - 错误处理**: "所有异步操作必须包含错误处理"
  - → 打包脚本中所有异步操作都有 try-catch
  
- **第 4 节 - 文档要求**: "公共 API 必须有 JSDoc/tsdoc 注释"
  - → 所有导出函数有完整 JSDoc

### 10.2 project-conventions.md

- **第 5.1 节 - 插件打包**: 
  - "每个插件必须支持 `pnpm pack` 命令生成 ZIP 包"
  - "ZIP 文件命名格式：`{plugin-id}-{version}.zip`"
  - "ZIP 内容必须包含：dist/, plugin.json, README.md（如果存在）"
  - "使用 archiver 库进行打包，压缩级别为 9（最高）"
  - "打包前必须先执行 `pnpm build`"
  - → 本方案完全遵循这些规范

## 11. 实施时间表

| 阶段 | 任务 | 预估时间 | 优先级 | 负责人 |
| :--- | :--- | :--- | :--- | :--- |
| **1** | 创建独立打包脚本模板 | 1 小时 | P0 | Planning-Agent |
| **2** | 批量应用到 6 个现有插件 | 30 分钟 | P0 | Implementation-Agent |
| **3** | 更新 create-plugin.js 模板 | 30 分钟 | P0 | Implementation-Agent |
| **4** | 测试验证（功能+独立性+兼容性） | 1 小时 | P0 | QA-Agent |
| **5** | 文档更新（DEVELOPMENT_GUIDE + 迁移指南） | 30 分钟 | P1 | Implementation-Agent |
| **6** | 标记旧脚本为废弃 | 15 分钟 | P1 | Implementation-Agent |
| **7** | 观察期和反馈收集 | 1 周 | P2 | CodeReview-Agent |
| **8** | 清理废弃脚本（可选） | 15 分钟 | P3 | Implementation-Agent |

**总计**: 3.5-4 小时实施 + 1 周观察期

## 12. 交付物清单

- [ ] `scripts/templates/pack-plugin-standalone.js` - 独立打包脚本模板
- [ ] `plugins/*/scripts/pack-plugin.js` - 6 个插件的独立打包脚本
- [ ] `plugins/*/package.json` - 更新的 package.json（添加 archiver 依赖）
- [ ] `scripts/create-plugin.js` - 更新的插件创建脚本
- [ ] `scripts/pack-plugin.js` - 标记为废弃的旧脚本
- [ ] `docs/MIGRATION_TO_INDEPENDENT_PACKAGING.md` - 迁移指南
- [ ] `DEVELOPMENT_GUIDE.md` - 更新的开发文档
- [ ] 测试报告 - 验证所有测试用例通过
- [ ] 本文档 - `.lingma/plans/plugin-independent-packaging.md`

## 13. 后续优化方向

### 13.1 短期优化（1-2 个月内）

1. **批量更新工具**: 创建 `scripts/update-pack-scripts.js` 一键同步所有插件的打包脚本
2. **自动化测试**: 在 CI/CD 中添加打包测试，确保每个插件可独立打包
3. **性能监控**: 记录打包时间和文件大小，发现异常及时优化

### 13.2 中期优化（3-6 个月内）

1. **插件市场集成**: 打包后自动上传到插件市场（需要 API 支持）
2. **增量打包**: 仅打包变更的文件，提升速度
3. **校验和生成**: 生成 SHA256 校验文件用于完整性验证

### 13.3 长期优化（6 个月以上）

1. **抽取为 npm 包**: 如果插件数量增长到 >10 个，考虑抽取为 `@quick-actions/plugin-packager`
2. **签名支持**: 为 ZIP 文件添加数字签名确保安全性
3. **版本管理**: 自动生成 changelog 并嵌入 ZIP

## 14. 总结

### 14.1 方案优势

✅ **完全独立**: 每个插件可在任何位置打包  
✅ **实现简单**: 复用现有代码，1-2 小时即可完成  
✅ **向后兼容**: ZIP 格式和命令接口完全一致  
✅ **维护清晰**: 每个插件独立管理，易于调试  
✅ **符合约定**: 遵循 user-conventions.md 和 project-conventions.md  

### 14.2 权衡取舍

⚖️ **存储空间**: +300KB（6 个插件 × 50KB archiver）  
- 可接受：相比 Tauri 应用的 MB 级体积，300KB 微不足道  

⚖️ **代码重复**: 6 份相同的 pack-plugin.js  
- 可管理：通过模板和批量更新工具控制  

⚖️ **依赖管理**: 需要确保所有插件的 archiver 版本一致  
- 可解决：使用 pnpm workspace 和统一的 package.json 模板  

### 14.3 最终建议

**立即实施方案 A（改进版）**，理由：
1. 快速见效：1-2 小时即可完成核心迁移
2. 风险可控：复用成熟代码，兼容性好
3. 符合项目思想：真正的插件化架构
4. 留有退路：保留旧脚本作为过渡期的备选

**不建议的方案**:
- ❌ 方案 B（原生实现）: 开发成本高，风险大
- ❌ 方案 C（npm 包）: 当前插件数量少，过早抽象
- ❌ 方案 D（npx）: 网络依赖强，离线不可用

---

**规划完成时间**: 2026-05-09  
**规划作者**: Planning-Agent  
**审核状态**: 待 Implementation-Agent 实现  
**关联文档**: 
- `.lingma/plans/plugin-zip-packaging.md`（已有 ZIP 打包规划）
- `.lingma/conventions/user-conventions.md`
- `.lingma/conventions/project-conventions.md`
