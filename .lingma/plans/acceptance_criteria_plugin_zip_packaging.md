# 插件 ZIP 打包功能验收标准

## 模块信息

- **模块 ID**: plugin-zip-packaging
- **复杂度等级**: L2 - 中等
- **预估代码量**: 300-500 行
- **相关文件**: 
  - `scripts/pack-plugin.js` (新建)
  - `scripts/create-plugin.js` (修改)
  - `plugins/*/package.json` (修改，5个文件)

---

## 1. 功能完整性验收

### 1.1 核心打包功能

- [ ] **脚本可执行**: `node scripts/pack-plugin.js <plugin-name>` 能正常运行
- [ ] **参数验证**: 未提供参数时显示用法提示并退出（exit code 1）
- [ ] **插件目录解析**: 正确解析相对路径和绝对路径
- [ ] **plugin.json 读取**: 成功读取 id 和 version 字段
- [ ] **dist 目录验证**: 检测 dist/ 是否存在，不存在时给出明确错误
- [ ] **ZIP 文件生成**: 在插件根目录生成 `{id}-{version}.zip` 文件
- [ ] **压缩级别**: 使用最高压缩级别（zlib level 9）
- [ ] **文件大小显示**: 打包完成后输出文件大小（MB 格式，保留2位小数）

**测试命令**:
```bash
cd plugins/uuid-generator
pnpm build
node ../../scripts/pack-plugin.js uuid-generator
# 应生成: uuid-generator-1.0.0.zip
```

### 1.2 ZIP 内容验证

- [ ] **包含 dist/ 目录**: ZIP 中包含完整的 dist/ 目录结构
- [ ] **包含 plugin.json**: ZIP 根目录包含 plugin.json 文件
- [ ] **包含 README.md**: 如果插件有 README.md，则包含在 ZIP 中
- [ ] **不包含 node_modules/**: ZIP 中不应有 node_modules 目录
- [ ] **不包含 src/**: ZIP 中不应有源代码目录
- [ ] **路径格式**: ZIP 内部路径使用 Unix 风格（`/` 分隔符）

**验证命令**:
```bash
unzip -l plugins/uuid-generator/uuid-generator-1.0.0.zip
# 或 Windows: 7z l plugins\uuid-generator\uuid-generator-1.0.0.zip
```

**期望输出示例**:
```
Archive:  uuid-generator-1.0.0.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
     1234  2026-05-09 10:00   dist/index.js
      345  2026-05-09 10:00   plugin.json
     2345  2026-05-09 10:00   README.md
---------                     -------
     3924                     3 files
```

### 1.3 错误处理

- [ ] **缺少 plugin.json**: 抛出错误 "plugin.json not found in {path}"
- [ ] **缺少 dist/ 目录**: 抛出错误 "dist/ directory not found. Run 'pnpm build' first."
- [ ] **无效的 plugin.json**: JSON 解析失败时显示 "Invalid plugin.json format"
- [ ] **权限错误**: 无法写入 ZIP 文件时显示 "Permission denied: {path}"
- [ ] **archiver 初始化失败**: 捕获异常并显示详细错误信息
- [ ] **所有错误都有 exit code 1**: 确保脚本返回非零退出码

**测试场景**:
```bash
# 测试 1: 未构建的插件
cd plugins/uuid-generator
rm -rf dist
node ../../scripts/pack-plugin.js uuid-generator
# 应显示: Error: dist/ directory not found. Run 'pnpm build' first.
# exit code: 1

# 测试 2: 不存在的插件
node ../../scripts/pack-plugin.js non-existent-plugin
# 应显示: Error: Plugin directory not found: ...
# exit code: 1
```

### 1.4 日志输出

- [ ] **开始提示**: 显示 "🚀 Packing plugin: {plugin-name}"
- [ ] **进度信息**: 显示 "📂 Reading plugin metadata..."
- [ ] **验证信息**: 显示 "✅ Validating build output..."
- [ ] **成功消息**: 显示 "✅ Plugin packed successfully!"
- [ ] **文件信息**: 显示 "📦 File: {filename}"
- [ ] **大小信息**: 显示 "📊 Size: {size} MB"
- [ ] **错误日志**: 使用红色或明显的错误标识（❌）

**期望输出示例**:
```
🚀 Packing plugin: uuid-generator
📂 Reading plugin metadata...
✅ Plugin ID: uuid-generator
✅ Version: 1.0.0
✅ Validating build output...
📦 Creating ZIP file: uuid-generator-1.0.0.zip
✅ Plugin packed successfully!
📦 File: uuid-generator-1.0.0.zip
📊 Size: 0.45 MB
```

---

## 2. 命名一致性验收

### 2.1 变量命名

- [ ] **camelCase 变量**: 所有变量使用 camelCase（如 `pluginDir`, `zipFilePath`）
- [ ] **PascalCase 常量/类**: 如有自定义类或组件，使用 PascalCase
- [ ] **UPPER_SNAKE_CASE 常量**: 配置常量使用大写蛇形（如 `MAX_COMPRESSION_LEVEL = 9`）
- [ ] **布尔变量前缀**: 布尔值以 `is`, `has`, `can` 开头（如 `isDistExist`）

**检查示例**:
```javascript
// ✅ 正确
const pluginDir = path.join(...);
const zipFileName = `${pluginId}-${version}.zip`;
const isDistExist = fs.existsSync(distDir);

// ❌ 错误
const plugin_dir = path.join(...);
const ZipFileName = `${pluginId}-${version}.zip`;
```

### 2.2 函数命名

- [ ] **异步函数前缀**: 异步函数以 `fetch`, `load`, `get`, `create`, `pack` 开头
- [ ] **事件处理前缀**: 如有回调函数，以 `handle` 开头
- [ ] **工具函数**: 纯函数使用动词开头（如 `validatePlugin`, `calculateSize`）

**检查示例**:
```javascript
// ✅ 正确
async function packPlugin(pluginName) { ... }
function validatePluginJson(json) { ... }
function handleArchiveError(err) { ... }

// ❌ 错误
async function pluginPack(pluginName) { ... }
function check(json) { ... }
```

### 2.3 注释语言

- [ ] **英文注释**: 所有代码注释使用英文（与项目保持一致）
- [ ] **JSDoc 格式**: 公共函数使用 JSDoc 注释
- [ ] **清晰简洁**: 注释说明意图而非实现细节

**检查示例**:
```javascript
// ✅ 正确
/**
 * Pack a plugin into a ZIP file
 * @param {string} pluginName - The name of the plugin directory
 * @returns {Promise<void>}
 */
async function packPlugin(pluginName) { ... }

// ❌ 错误
// 打包插件
async function packPlugin(pluginName) { ... }
```

---

## 3. 规范遵循验收

### 3.1 代码风格（user-conventions.md 第 2.2 节）

- [ ] **严格模式**: 文件顶部无 `"use strict"`（ES 模块默认严格模式）
- [ ] **函数长度**: 单个函数不超过 50 行
- [ ] **文件长度**: 单个文件不超过 300 行
- [ ] **缩进**: 使用 2 空格缩进
- [ ] **分号**: 语句末尾使用分号
- [ ] **箭头函数**: 优先使用箭头函数简化语法

**检查工具**:
```bash
# 手动检查行数
wc -l scripts/pack-plugin.js
# 应 < 300

# 检查函数长度（人工审查）
# 最长函数应 < 50 行
```

### 3.2 错误处理（user-conventions.md 第 2.5 节）

- [ ] **try-catch 包裹**: 所有可能失败的操作都有错误处理
- [ ] **无空 catch 块**: 每个 catch 块都有日志或重新抛出
- [ ] **有意义的错误信息**: 错误消息清晰描述问题
- [ ] **异步错误传播**: 使用 async/await + try-catch 或 .catch()

**检查示例**:
```javascript
// ✅ 正确
try {
  const pluginJson = JSON.parse(fs.readFileSync(path, 'utf-8'));
} catch (error) {
  console.error(`❌ Failed to parse plugin.json: ${error.message}`);
  process.exit(1);
}

// ❌ 错误
try {
  const pluginJson = JSON.parse(fs.readFileSync(path, 'utf-8'));
} catch (error) {
  // 空的 catch 块
}
```

### 3.3 文档要求（user-conventions.md 第 4 节）

- [ ] **JSDoc 注释**: 所有导出的函数有完整的 JSDoc
- [ ] **参数说明**: 每个参数有类型和描述
- [ ] **返回值说明**: 说明返回类型和含义
- [ ] **复杂逻辑注释**: 关键步骤有行内注释说明

**检查示例**:
```javascript
/**
 * Create a ZIP archive from plugin build output
 * 
 * @param {string} pluginDir - Absolute path to the plugin directory
 * @param {Object} pluginMeta - Plugin metadata from plugin.json
 * @param {string} pluginMeta.id - Plugin identifier
 * @param {string} pluginMeta.version - Plugin version string
 * @returns {Promise<string>} Path to the created ZIP file
 * @throws {Error} If dist/ directory is missing or archiver fails
 */
async function createZipArchive(pluginDir, pluginMeta) {
  // Use highest compression level for smaller file size
  const archive = archiver('zip', { zlib: { level: 9 } });
  ...
}
```

---

## 4. 编译/运行检查

### 4.1 语法检查

- [ ] **Node.js 语法检查**: `node --check scripts/pack-plugin.js` 无错误
- [ ] **ES 模块兼容**: 使用 `import/export` 而非 `require/module.exports`
- [ ] **无未定义变量**: 所有变量都已声明
- [ ] **无未使用的导入**: 清理未使用的 import 语句

**验证命令**:
```bash
node --check scripts/pack-plugin.js
# 应无输出（成功）
```

### 4.2 依赖可用性

- [ ] **archiver 可导入**: `import archiver from 'archiver'` 成功
- [ ] **内置模块可用**: `fs`, `path`, `url` 正常导入
- [ ] **版本兼容**: archiver v8.0.0 与 Node.js 版本兼容

**验证命令**:
```bash
node -e "import('archiver').then(() => console.log('OK')).catch(e => console.error(e))"
# 应输出: OK
```

### 4.3 跨平台兼容性

- [ ] **Windows 测试**: 在 Windows PowerShell/CMD 中正常运行
- [ ] **路径分隔符**: 使用 `path.join()` 而非硬编码 `/` 或 `\`
- [ ] **文件权限**: 正确处理 Windows 文件权限
- [ ] **编码一致**: 所有文件读写使用 UTF-8 编码

**测试命令**（Windows）:
```powershell
cd plugins\uuid-generator
pnpm build
node ..\..\scripts\pack-plugin.js uuid-generator
# 应成功生成 ZIP 文件
```

### 4.4 向后兼容性

- [ ] **不影响 build**: `pnpm build` 仍然正常工作
- [ ] **不影响 dev**: `pnpm dev` 仍然正常工作
- [ ] **可选功能**: 未添加 pack 命令的插件不受影响
- [ ] **无破坏性变更**: 现有插件无需修改即可继续使用

**验证命令**:
```bash
# 测试现有流程未受影响
cd plugins/uuid-generator
pnpm build
ls dist/
# 应正常输出 dist 内容
```

---

## 5. 性能要求验收

### 5.1 打包速度

- [ ] **小插件 (< 1MB)**: 打包时间 < 1 秒
- [ ] **中等插件 (1-5MB)**: 打包时间 < 2 秒
- [ ] **大插件 (> 5MB)**: 打包时间 < 5 秒

**测试方法**:
```bash
# 使用 time 命令测量
time node scripts/pack-plugin.js uuid-generator
# real 时间应 < 2s
```

### 5.2 内存占用

- [ ] **峰值内存**: 打包过程峰值内存 < 100MB
- [ ] **流式处理**: 使用 archiver 流式 API，避免一次性加载所有文件

**测试方法**:
```bash
# macOS/Linux
/usr/bin/time -v node scripts/pack-plugin.js uuid-generator
# 查看 "Maximum resident set size"

# Windows (PowerShell)
Measure-Command { node scripts/pack-plugin.js uuid-generator }
```

### 5.3 压缩率

- [ ] **压缩比例**: ZIP 文件比原始 dist/ 小至少 30%
- [ ] **典型场景**: uuid-generator 插件压缩后 < 500KB

**测试方法**:
```bash
# 计算原始大小
du -sh plugins/uuid-generator/dist/

# 计算 ZIP 大小
ls -lh plugins/uuid-generator/uuid-generator-1.0.0.zip

# 压缩率应 > 30%
```

---

## 6. 集成验收

### 6.1 create-plugin.js 更新

- [ ] **package.json 模板**: 新生成的插件包含 `"pack": "node ../../scripts/pack-plugin.js"`
- [ ] **.gitignore 模板**: 包含 `*.zip` 规则
- [ ] **README 模板**: 包含打包使用说明
- [ ] **测试新建插件**: 
  ```bash
  node scripts/create-plugin.js test-new-plugin
  cd plugins/test-new-plugin
  cat package.json | grep pack
  # 应输出: "pack": "node ../../scripts/pack-plugin.js"
  ```

### 6.2 现有插件更新

至少更新以下 5 个插件的 `package.json`:

- [ ] `plugins/uuid-generator/package.json` - 添加 pack 脚本
- [ ] `plugins/everything-search/package.json` - 添加 pack 脚本
- [ ] `plugins/js-console/package.json` - 添加 pack 脚本
- [ ] `plugins/json-explorer/package.json` - 添加 pack 脚本
- [ ] `plugins/process-manager/package.json` - 添加 pack 脚本

**验证命令**:
```bash
for plugin in uuid-generator everything-search js-console json-explorer process-manager; do
  echo "Checking $plugin..."
  cat plugins/$plugin/package.json | grep -A 1 '"pack"'
done
```

### 6.3 .gitignore 更新

- [ ] **create-plugin.js 模板**: `.gitignore` 包含 `*.zip`
- [ ] **根目录 .gitignore**: 如果存在，也应包含 `plugins/**/*.zip`

**验证命令**:
```bash
cat scripts/create-plugin.js | grep -A 5 ".gitignore"
# 应看到 *.zip 在生成的内容中
```

### 6.4 文档更新

- [ ] **DEVELOPMENT_GUIDE.md**: 更新第 367-378 行，替换手动 zip 命令为 `pnpm pack`
- [ ] **README.md 模板**: 新插件 README 包含打包说明

**验证内容**:
```markdown
## 📦 Packaging

To distribute your plugin, pack it into a ZIP file:

```bash
pnpm pack
```

This will create `{plugin-id}-{version}.zip` in the plugin root directory.
```

---

## 7. 边界条件验收

### 7.1 特殊字符处理

- [ ] **插件名含空格**: 正确处理（虽然不推荐，但不应崩溃）
- [ ] **插件名含中文**: 文件名正确编码，无乱码
- [ ] **版本号含特殊字符**: 如 `1.0.0-beta.1`，正确生成文件名

**测试用例**:
```bash
# 测试特殊版本号
# 修改 plugin.json version 为 "1.0.0-beta.1"
# 运行 pack
# 应生成: uuid-generator-1.0.0-beta.1.zip
```

### 7.2 空目录处理

- [ ] **空 dist/ 目录**: 检测到 dist/ 为空时给出警告但仍打包
- [ ] **缺少 README.md**: 不报错，仅跳过添加

### 7.3 重复打包

- [ ] **文件已存在**: 覆盖旧文件并输出警告 "⚠️ Overwriting existing ZIP file"
- [ ] **幂等性**: 多次打包结果一致（相同内容）

---

## 8. 验收测试清单

### 8.1 自动化测试脚本

创建测试脚本 `scripts/test-pack-plugin.js`（可选但推荐）:

```javascript
#!/usr/bin/env node
/**
 * Automated test for pack-plugin.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const testPlugin = 'uuid-generator';
const pluginDir = path.join('plugins', testPlugin);

console.log('🧪 Running pack-plugin tests...\n');

// Test 1: Build plugin
console.log('Test 1: Building plugin...');
try {
  execSync('pnpm build', { cwd: pluginDir, stdio: 'inherit' });
  console.log('✅ Build successful\n');
} catch (error) {
  console.error('❌ Build failed');
  process.exit(1);
}

// Test 2: Pack plugin
console.log('Test 2: Packing plugin...');
try {
  execSync(`node ../../scripts/pack-plugin.js ${testPlugin}`, { 
    cwd: pluginDir, 
    stdio: 'inherit' 
  });
  console.log('✅ Pack successful\n');
} catch (error) {
  console.error('❌ Pack failed');
  process.exit(1);
}

// Test 3: Verify ZIP exists
const zipFile = path.join(pluginDir, `${testPlugin}-1.0.0.zip`);
console.log('Test 3: Verifying ZIP file...');
if (fs.existsSync(zipFile)) {
  const stats = fs.statSync(zipFile);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`✅ ZIP file exists (${sizeMB} MB)\n`);
} else {
  console.error('❌ ZIP file not found');
  process.exit(1);
}

console.log('🎉 All tests passed!');
```

### 8.2 手动验收步骤

按顺序执行以下步骤，每项打勾表示通过：

#### 步骤 1: 新建插件测试
- [ ] 运行 `node scripts/create-plugin.js验收-test`
- [ ] 进入目录 `cd plugins/验收-test`
- [ ] 运行 `pnpm install`
- [ ] 运行 `pnpm build`
- [ ] 运行 `pnpm pack`
- [ ] 验证生成了 `验收-test-1.0.0.zip`
- [ ] 清理测试插件 `cd ../.. && rm -rf plugins/验收-test`

#### 步骤 2: 现有插件测试
- [ ] 进入 `cd plugins/uuid-generator`
- [ ] 运行 `pnpm build`
- [ ] 运行 `pnpm pack`
- [ ] 验证生成了 `uuid-generator-1.0.0.zip`
- [ ] 使用解压软件打开，验证内容正确

#### 步骤 3: 错误处理测试
- [ ] 删除 dist/ 目录
- [ ] 运行 `pnpm pack`
- [ ] 验证显示友好错误提示
- [ ] 恢复 dist/ 目录（重新 build）

#### 步骤 4: 跨平台测试（如在 Windows 上开发）
- [ ] 在 PowerShell 中运行打包命令
- [ ] 验证 ZIP 文件正常生成
- [ ] 使用 7-Zip 或 WinRAR 打开验证

#### 步骤 5: 性能测试
- [ ] 记录打包时间（应 < 2 秒）
- [ ] 记录 ZIP 文件大小
- [ ] 计算压缩率（应 > 30%）

---

## 9. 验收签字

### 9.1 验收人员

- **实施者**: Implementation-Agent
- **审核者**: CodeReview-Agent
- **测试者**: QA-Agent

### 9.2 验收日期

- **计划完成日期**: 2026-05-09
- **实际完成日期**: _______________

### 9.3 验收结论

- [ ] **通过**: 所有验收标准满足，可以合并到主分支
- [ ] **有条件通过**: 存在非关键问题，需在 X 天内修复
- [ ] **不通过**: 存在关键问题，需要重新实现

**备注**: _______________________________________________________

__________________________________________________________________

### 9.4 问题记录

| 序号 | 问题描述 | 严重程度 | 解决方案 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | | 高/中/低 | | 待解决/已解决 |
| 2 | | 高/中/低 | | 待解决/已解决 |

---

**文档版本**: v1.0  
**最后更新**: 2026-05-09  
**关联规划**: `.lingma/plans/plugin-zip-packaging.md`
