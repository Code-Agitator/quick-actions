# 插件动态加载功能规划文档

**版本**: v1.0  
**创建日期**: 2026-05-11  
**复杂度评级**: L3（复杂，需要拆分为7个子模块）  
**作者**: Planning-Agent

---

## 1. 现状分析

### 1.1 当前架构概览

#### 前端架构
- **插件类型定义** (`src/types/plugin.ts`):
  - `PluginManifest`: 插件元数据接口（id, name, version, entry等）
  - `Plugin`: 扩展了 manifest，包含可选的 `execute` 函数
  - `PluginResult`: 插件执行结果结构
  - 支持三种入口类型: `js`, `html`, `esm`

- **插件加载器** (`src/utils/pluginLoader.ts`):
  - `loadPluginFromManifest()`: 从 manifest 加载插件
  - 使用 Tauri 的 `convertFileSrc()` 将本地路径转换为 asset URL
  - 通过动态 `import()` 加载 ES 模块
  - 错误处理：单个插件失败不影响其他插件

- **插件管理 Hook** (`src/hooks/usePlugins.ts`):
  - `usePlugins()`: 管理插件状态和生命周期
  - `loadPlugins()`: 从 Rust 端获取插件列表
  - `loadPluginModule()`: 懒加载插件模块（按需加载）
  - `executePlugin()`: 执行插件并缓存已加载的模块
  - `installPlugin()`: 调用 Rust 命令安装插件（当前仅支持目录路径）
  - `uninstallPlugin()`: 卸载插件并触发重新索引

#### Rust 后端架构
- **插件管理器** (`src-tauri/src/plugin_manager.rs`):
  - `PluginManager`: 核心管理类
    - `plugins`: HashMap<String, PluginMetadata> - 内存中的插件注册表
    - `plugin_paths`: HashMap<String, PathBuf> - 插件路径映射
    - `plugin_dir`: PathBuf - 用户插件目录（AppData/quick-actions/plugins）
    - `watcher`: 文件系统监听器（notify crate）
  - `scan_plugins()`: 扫描三个目录
    1. 用户目录: `%APPDATA%/quick-actions/plugins`
    2. 内置目录: `<exe_dir>/plugins`（打包时捆绑）
    3. 源码目录: `<project_root>/plugins`（开发模式）
  - `install_plugin()`: 从源目录复制文件到用户目录
  - `uninstall_plugin()`: 从多个目录删除插件
  - `get_plugin_path()`: 获取插件的实际路径

- **Tauri 命令** (`src-tauri/src/commands.rs`):
  - `get_plugins()`: 返回已加载的插件列表
  - `install_plugin(path: String)`: 安装插件（需要完整目录路径）
  - `uninstall_plugin(id: String)`: 卸载插件
  - `get_plugin_path(id: String)`: 获取插件路径
  - `reload_plugins()`: 重新扫描插件目录

### 1.2 现有功能限制

1. **安装方式受限**:
   - 当前 `install_plugin()` 只接受目录路径，不支持 ZIP 文件
   - 需要用户手动解压 ZIP 后才能安装
   - 没有提供文件选择对话框

2. **缺少持久化**:
   - 插件信息仅存储在内存中
   - 应用重启后依赖文件系统扫描重新加载
   - 没有插件启用/禁用状态管理

3. **安全性不足**:
   - 没有插件签名验证
   - 没有沙箱隔离机制
   - 插件可以访问任意系统资源（通过 Tauri API）

4. **用户体验问题**:
   - 安装插件需要命令行或手动操作
   - 没有安装进度反馈
   - 更新插件需要手动卸载再安装

### 1.3 可复用资源

| 资源 | 位置 | 说明 |
|------|------|------|
| 插件类型定义 | `src/types/plugin.ts` | 可直接复用，可能需要扩展 |
| 动态导入逻辑 | `src/utils/pluginLoader.ts` | 核心的模块加载代码 |
| 插件管理器 | `src-tauri/src/plugin_manager.rs` | 已有文件操作基础 |
| 安装/卸载命令 | `src-tauri/src/commands.rs` | 可扩展支持 ZIP |
| 打包脚本 | `scripts/pack-plugin.js` | 生成标准 ZIP 格式 |
| 插件 UI 组件 | `src/components/settings/PluginsTab.tsx` | 可扩展安装按钮 |
| 文件系统监听 | `plugin_manager.rs:start_watching()` | 已有 notify 集成 |

---

## 2. 技术方案设计

### 2.1 架构设计

#### 整体流程

```
用户操作流程:
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│ 选择ZIP文件 │────▶│ 上传到Rust端 │────▶│ 解压并验证  │────▶│ 注册到管理器 │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
                                                                   │
                                                                   ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│ 前端重新加载│◀────│ 发送事件通知 │◀────│ 保存到存储  │◀────│ 写入插件目录 │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘

卸载流程:
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│ 点击卸载按钮│────▶│ 停用插件模块 │────▶│ 删除文件    │────▶│ 更新注册表  │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
                                                                   │
                                                                   ▼
┌─────────────┐     ┌──────────────┐
│ 前端重新加载│◀────│ 发送事件通知 │
└─────────────┘     └──────────────┘
```

#### 插件存储位置

**推荐方案**: 使用 Tauri 的 AppData 目录
- Windows: `%APPDATA%/com.develop.quick-actions/plugins`
- macOS: `~/Library/Application Support/com.develop.quick-actions/plugins`
- Linux: `~/.local/share/com.develop.quick-actions/plugins`

**目录结构**:
```
<AppData>/com.develop.quick-actions/
├── plugins/                    # 插件安装目录
│   ├── uuid-generator/        # 每个插件独立子目录
│   │   ├── dist/
│   │   ├── plugin.json
│   │   └── README.md
│   └── json-explorer/
├── plugins_registry.json      # 插件注册表（持久化）
└── logs/                      # 日志目录
```

**插件注册表格式** (`plugins_registry.json`):
```json
{
  "version": "1.0",
  "plugins": {
    "uuid-generator": {
      "id": "uuid-generator",
      "name": "UUID 生成器",
      "version": "1.0.0",
      "installed_at": "2026-05-11T10:00:00Z",
      "enabled": true,
      "source_hash": "sha256:abc123...",
      "permissions": ["clipboard:write"]
    }
  }
}
```

### 2.2 技术选型

#### A. 前端文件选择
**方案**: 使用 Tauri 的 `dialog` API

```typescript
import { open } from '@tauri-apps/plugin-dialog';

const selected = await open({
  multiple: false,
  filters: [{
    name: 'Plugin Package',
    extensions: ['zip']
  }]
});
```

**优点**: 
- 原生文件选择对话框
- 跨平台兼容
- 支持文件类型过滤

**依赖**: 需要添加 `tauri-plugin-dialog` (v2)

#### B. Rust 端 ZIP 解压
**方案**: 使用 `zip` crate + `tempfile` crate

```toml
[dependencies]
zip = "0.6"
tempfile = "3"
sha2 = "0.10"  # 用于计算哈希
```

**实现要点**:
```rust
use zip::ZipArchive;
use std::fs::File;
use std::io::Cursor;

fn extract_zip(zip_data: Vec<u8>, target_dir: &Path) -> Result<(), String> {
    let cursor = Cursor::new(zip_data);
    let mut archive = ZipArchive::new(cursor).map_err(|e| e.to_string())?;
    
    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = target_dir.join(file.name());
        
        if file.name().ends_with('/') {
            std::fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
        } else {
            if let Some(p) = outpath.parent() {
                std::fs::create_dir_all(p).map_err(|e| e.to_string())?;
            }
            let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
```

**优点**:
- 纯 Rust 实现，无外部依赖
- 支持流式解压，内存效率高
- 跨平台兼容

#### C. 动态模块加载
**方案**: 保持现有的 `import()` 动态导入

**当前实现已足够**:
```typescript
const assetUrl = convertFileSrc(entryPath);
const module = await import(/* @vite-ignore */ assetUrl);
```

**优化建议**:
1. 添加加载超时控制（防止恶意插件阻塞）
2. 添加模块缓存清理机制（卸载时）
3. 添加加载重试逻辑（网络/文件系统临时故障）

#### D. 插件元数据存储
**方案**: JSON 文件 + 内存缓存

**理由**:
- 轻量级，无需数据库依赖
- 易于调试和手动编辑
- 启动时一次性加载到内存

**实现**:
```rust
// 启动时加载
let registry = load_registry()?;  // 从 JSON 文件读取

// 运行时操作
registry.plugins.insert(id, metadata);
save_registry(&registry)?;  // 同步到磁盘

// 查询时直接从内存读取
registry.plugins.get(&id)
```

**性能考虑**:
- 插件数量通常 < 100，JSON 解析开销可忽略
- 写操作频率低（仅安装/卸载/更新时）
- 读操作高频，内存缓存保证性能

### 2.3 安全考虑

#### A. 插件来源验证

**短期方案**（MVP）:
- 计算 ZIP 文件的 SHA256 哈希
- 记录到注册表中，用于完整性校验
- 显示警告提示用户确认安装未知来源插件

**长期方案**:
- 支持插件签名（使用 RSA/ECDSA）
- 维护可信发布者列表
- 集成插件市场（官方审核）

#### B. 沙箱隔离

**浏览器层面**:
- 插件运行在 Webview 中，天然沙箱化
- 无法直接访问文件系统（需通过 Tauri API）
- 无法执行系统命令（需通过 Tauri API）

**Tauri 权限控制**:
```json
// tauri.conf.json
{
  "app": {
    "security": {
      "capabilities": {
        "default": {
          "windows": ["main"],
          "permissions": [
            "core:default",
            "fs:allow-read-file",
            "dialog:allow-open"
          ]
        }
      }
    }
  }
}
```

**插件权限声明** (`plugin.json`):
```json
{
  "id": "uuid-generator",
  "permissions": [
    "clipboard:write",
    "notification:show"
  ]
}
```

**权限检查**（在 plugin_api.rs 中）:
```rust
fn check_permission(plugin_id: &str, permission: &str) -> Result<(), String> {
    let registry = load_registry()?;
    let plugin = registry.plugins.get(plugin_id)
        .ok_or("Plugin not found")?;
    
    if !plugin.permissions.contains(&permission.to_string()) {
        return Err(format!("Plugin {} lacks permission: {}", plugin_id, permission));
    }
    Ok(())
}
```

#### C. 资源限制

**防止恶意插件**:
1. **超时控制**: 插件执行超过 5 秒自动终止
2. **内存限制**: 监控插件内存占用（通过 Webview 隔离）
3. **API 速率限制**: 限制剪贴板读写频率

**实现示例**:
```typescript
// 带超时的插件执行
async function executeWithTimeout(plugin: Plugin, query: string, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const result = await plugin.execute(query);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Plugin ${plugin.id} execution timed out`);
    }
    throw error;
  }
}
```

---

## 3. 模块拆解

将整个功能拆分为 7 个独立模块，按依赖关系排序：

### 模块 1: Rust 端 ZIP 解压和文件管理
**复杂度**: L2 (500-700 行)  
**依赖**: 无  
**被依赖**: 模块 2, 模块 6

**职责**:
- 接收 ZIP 文件数据（字节数组）
- 解压到临时目录
- 验证 `plugin.json` 存在且格式正确
- 移动到目标插件目录
- 清理临时文件

**关键函数**:
```rust
#[tauri::command]
pub fn install_plugin_from_zip(zip_path: String, state: State<AppState>) -> Result<PluginMetadata, String>

fn extract_and_validate(zip_path: &Path, temp_dir: &Path) -> Result<PluginMetadata, String>

fn move_to_plugin_dir(metadata: &PluginMetadata, temp_dir: &Path, plugin_dir: &Path) -> Result<(), String>

fn calculate_file_hash(file_path: &Path) -> Result<String, String>
```

**验收标准**:
- [ ] 能成功解压标准 ZIP 文件
- [ ] 验证 plugin.json 必填字段（id, name, version, entry）
- [ ] 检测并拒绝路径遍历攻击（`../` 等）
- [ ] 解压失败时清理临时文件
- [ ] 支持覆盖安装（删除旧版本）
- [ ] 计算并返回 SHA256 哈希值

---

### 模块 2: 插件元数据存储和查询
**复杂度**: L2 (400-600 行)  
**依赖**: 模块 1（部分数据结构）  
**被依赖**: 模块 3, 模块 4, 模块 6

**职责**:
- 定义插件注册表结构
- 实现注册表的加载/保存
- 提供 CRUD 操作接口
- 支持插件启用/禁用状态管理

**关键结构**:
```rust
#[derive(Serialize, Deserialize)]
pub struct PluginRegistry {
    pub version: String,
    pub plugins: HashMap<String, PluginRecord>,
}

#[derive(Serialize, Deserialize)]
pub struct PluginRecord {
    pub id: String,
    pub name: String,
    pub version: String,
    pub installed_at: DateTime<Utc>,
    pub enabled: bool,
    pub source_hash: String,
    pub permissions: Vec<String>,
}
```

**关键函数**:
```rust
pub fn load_registry(plugin_dir: &Path) -> Result<PluginRegistry, String>

pub fn save_registry(registry: &PluginRegistry, plugin_dir: &Path) -> Result<(), String>

pub fn register_plugin(registry: &mut PluginRegistry, metadata: &PluginMetadata, hash: String)

pub fn unregister_plugin(registry: &mut PluginRegistry, plugin_id: &str)

pub fn toggle_plugin_enabled(registry: &mut PluginRegistry, plugin_id: &str, enabled: bool) -> Result<(), String>
```

**验收标准**:
- [ ] 首次启动时创建空注册表文件
- [ ] 注册表损坏时自动重建（备份旧文件）
- [ ] 保存时使用原子写操作（先写临时文件再重命名）
- [ ] 支持查询已启用的插件列表
- [ ] 支持按 ID 查询单个插件
- [ ] 并发安全（使用 Mutex 保护）

---

### 模块 3: 前端插件安装 UI
**复杂度**: L2 (300-500 行)  
**依赖**: 模块 1（Tauri 命令）  
**被依赖**: 无

**职责**:
- 添加"安装插件"按钮到 PluginsTab
- 打开文件选择对话框
- 显示安装进度
- 处理安装成功/失败反馈

**关键组件**:
```tsx
// src/components/settings/InstallPluginButton.tsx
export function InstallPluginButton({ onInstalled }: { onInstalled: () => void })

// src/hooks/usePluginInstaller.ts
export function usePluginInstaller() {
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const installFromZip = async (zipPath: string) => Promise<void>;
}
```

**UI 流程**:
1. 用户点击"安装插件"按钮
2. 弹出文件选择对话框（仅显示 .zip 文件）
3. 用户选择文件后显示加载动画
4. 调用 Tauri 命令 `install_plugin_from_zip`
5. 成功后刷新插件列表并显示 Toast 通知
6. 失败后显示错误详情

**验收标准**:
- [ ] 文件选择对话框只显示 .zip 文件
- [ ] 安装过程中按钮禁用并显示进度
- [ ] 安装成功显示绿色 Toast 通知
- [ ] 安装失败显示红色错误提示（包含错误原因）
- [ ] 支持取消安装（可选）
- [ ] 符合项目 UI 风格（HeroUI 组件）

---

### 模块 4: 前端插件列表和管理 UI
**复杂度**: L1 (200-300 行)  
**依赖**: 模块 2（注册表查询）  
**被依赖**: 无

**职责**:
- 扩展现有 PluginsTab 组件
- 显示插件启用/禁用状态
- 添加启用/禁用切换开关
- 显示插件安装时间和哈希值（调试模式）

**修改点**:
```tsx
// src/components/settings/PluginsTab.tsx
// 新增功能：
- 每个插件卡片添加 Toggle 开关（启用/禁用）
- 显示插件版本号旁边添加"更新"按钮（如果检测到新版本）
- 长按/右键菜单显示更多选项（查看详细信息、导出等）
```

**验收标准**:
- [ ] 禁用插件后不再出现在搜索结果中
- [ ] 切换启用状态立即生效（无需重启）
- [ ] 禁用插件灰显显示
- [ ] 显示插件安装时间（格式化显示）
- [ ] 支持批量操作（全选/反选）

---

### 模块 5: 动态模块加载器增强
**复杂度**: L2 (400-600 行)  
**依赖**: 模块 2（查询启用状态）  
**被依赖**: 模块 6

**职责**:
- 扩展现有 `pluginLoader.ts`
- 添加加载超时控制
- 添加模块缓存管理
- 添加加载重试逻辑
- 支持热重载（开发模式）

**关键函数**:
```typescript
// src/utils/pluginLoader.ts
export async function loadPluginWithTimeout(
  manifest: PluginManifest, 
  timeout?: number
): Promise<Plugin>

export function clearPluginCache(pluginId: string): void

export async function reloadPlugin(pluginId: string): Promise<Plugin>

export function getLoadedPlugins(): Map<string, Plugin>
```

**实现要点**:
```typescript
// 带超时的加载
const LOAD_TIMEOUT = 5000; // 5秒

async function loadPluginWithTimeout(manifest: PluginManifest, timeout = LOAD_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const plugin = await loadPluginFromManifest(manifest);
    clearTimeout(timeoutId);
    return plugin;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Plugin ${manifest.id} load timeout`);
    }
    throw error;
  }
}

// 缓存管理
const pluginCache = new Map<string, {
  module: any;
  loadedAt: number;
}>();

export function cachePlugin(pluginId: string, module: any) {
  pluginCache.set(pluginId, {
    module,
    loadedAt: Date.now()
  });
}

export function clearPluginCache(pluginId: string) {
  pluginCache.delete(pluginId);
}
```

**验收标准**:
- [ ] 加载超时抛出明确错误
- [ ] 卸载插件时清除缓存
- [ ] 支持手动刷新插件（开发模式）
- [ ] 缓存命中时直接返回（性能优化）
- [ ] 记录加载时间日志

---

### 模块 6: 插件生命周期管理
**复杂度**: L2 (500-700 行)  
**依赖**: 模块 1, 模块 2, 模块 5  
**被依赖**: 模块 7

**职责**:
- 统一管理插件的安装、卸载、更新
- 协调前后端操作
- 发送事件通知前端更新 UI
- 处理错误恢复

**关键函数**:
```typescript
// src/hooks/usePluginLifecycle.ts
export function usePluginLifecycle() {
  const installPlugin = async (zipPath: string): Promise<void>;
  const uninstallPlugin = async (pluginId: string): Promise<void>;
  const updatePlugin = async (pluginId: string, zipPath: string): Promise<void>;
  const enablePlugin = async (pluginId: string): Promise<void>;
  const disablePlugin = async (pluginId: string): Promise<void>;
}
```

**安装流程**:
```typescript
async function installPlugin(zipPath: string) {
  try {
    // 1. 调用 Rust 端解压和验证
    const metadata = await invoke('install_plugin_from_zip', { zipPath });
    
    // 2. 更新前端缓存
    setPlugins(prev => [...prev, metadata]);
    
    // 3. 触发重新索引
    window.dispatchEvent(new CustomEvent('plugins-changed'));
    
    // 4. 显示成功通知
    showToast('success', `插件 ${metadata.name} 安装成功`);
  } catch (error) {
    // 5. 错误处理和回滚
    showToast('error', `安装失败: ${error.message}`);
    throw error;
  }
}
```

**卸载流程**:
```typescript
async function uninstallPlugin(pluginId: string) {
  try {
    // 1. 清除前端缓存
    clearPluginCache(pluginId);
    
    // 2. 调用 Rust 端删除文件
    await invoke('uninstall_plugin', { id: pluginId });
    
    // 3. 更新前端状态
    setPlugins(prev => prev.filter(p => p.id !== pluginId));
    
    // 4. 触发重新索引
    window.dispatchEvent(new CustomEvent('plugins-changed'));
    
    // 5. 显示成功通知
    showToast('success', '插件已卸载');
  } catch (error) {
    showToast('error', `卸载失败: ${error.message}`);
    throw error;
  }
}
```

**验收标准**:
- [ ] 安装成功后插件立即可用（无需重启）
- [ ] 卸载后插件从搜索结果中消失
- [ ] 卸载时清除所有缓存和状态
- [ ] 支持插件更新（先卸载旧版本再安装新版本）
- [ ] 操作失败时回滚到之前状态
- [ ] 发送事件通知所有订阅者

---

### 模块 7: 插件验证和安全检查
**复杂度**: L1 (200-300 行)  
**依赖**: 模块 1（哈希计算）  
**被依赖**: 无

**职责**:
- 验证插件完整性（哈希校验）
- 检查插件权限声明
- 扫描潜在危险操作（可选）
- 记录安全审计日志

**关键函数**:
```typescript
// src/utils/pluginSecurity.ts
export async function verifyPluginIntegrity(
  pluginId: string, 
  expectedHash: string
): Promise<boolean>

export function validatePermissions(permissions: string[]): boolean

export function scanForDangerousPatterns(code: string): string[]
```

**实现要点**:
```typescript
// 哈希校验
export async function verifyPluginIntegrity(pluginId: string, expectedHash: string) {
  const actualHash = await invoke('calculate_plugin_hash', { pluginId });
  return actualHash === expectedHash;
}

// 权限白名单
const ALLOWED_PERMISSIONS = [
  'clipboard:read',
  'clipboard:write',
  'notification:show',
  'fs:read-file',
  'fs:write-file',
  'http:request'
];

export function validatePermissions(permissions: string[]): boolean {
  return permissions.every(p => ALLOWED_PERMISSIONS.includes(p));
}
```

**验收标准**:
- [ ] 安装时验证哈希匹配
- [ ] 拒绝包含未知权限的插件
- [ ] 记录所有安装/卸载操作到日志
- [ ] 检测到篡改时发出警告
- [ ] 支持手动触发完整性检查

---

## 4. 实现步骤

### 阶段 1: 基础设施（预计 2-3 天）
**目标**: 完成 Rust 端核心功能

1. **添加依赖** (0.5 天)
   - 在 `Cargo.toml` 中添加 `zip`, `tempfile`, `sha2`
   - 在前端添加 `@tauri-apps/plugin-dialog`

2. **实现模块 1** (1.5 天)
   - 编写 ZIP 解压函数
   - 实现文件验证逻辑
   - 添加 Tauri 命令 `install_plugin_from_zip`
   - 编写单元测试

3. **实现模块 2** (1 天)
   - 定义注册表结构
   - 实现加载/保存逻辑
   - 集成到 PluginManager
   - 修改 `scan_plugins()` 同时加载注册表

### 阶段 2: 前端集成（预计 2-3 天）
**目标**: 完成用户界面和交互

4. **实现模块 3** (1 天)
   - 创建 InstallPluginButton 组件
   - 实现 usePluginInstaller hook
   - 集成到 PluginsTab
   - 添加 Toast 通知

5. **实现模块 4** (0.5 天)
   - 扩展 PluginsTab 显示启用状态
   - 添加 Toggle 开关
   - 实现启用/禁用切换

6. **实现模块 5** (1 天)
   - 增强 pluginLoader.ts
   - 添加超时控制
   - 实现缓存管理
   - 添加重试逻辑

### 阶段 3: 完善和优化（预计 1-2 天）
**目标**: 提升稳定性和用户体验

7. **实现模块 6** (1 天)
   - 创建 usePluginLifecycle hook
   - 协调安装/卸载流程
   - 添加事件通知
   - 实现错误恢复

8. **实现模块 7** (0.5 天)
   - 添加哈希校验
   - 实现权限检查
   - 添加安全日志

9. **测试和优化** (0.5 天)
   - 端到端测试
   - 性能优化
   - 边界情况处理

### 总工期预估
- **乐观估计**: 5 天
- **保守估计**: 8 天
- **风险缓冲**: +2 天（处理意外问题）

---

## 5. 代码示例

### 5.1 Rust 端 ZIP 安装命令

```rust
// src-tauri/src/commands.rs

#[tauri::command]
pub fn install_plugin_from_zip(
    zip_path: String,
    state: State<AppState>,
) -> Result<PluginMetadata, String> {
    let mut manager = state.plugin_manager.lock().unwrap();
    
    // 1. 创建临时目录
    let temp_dir = tempfile::tempdir().map_err(|e| e.to_string())?;
    let temp_path = temp_dir.path();
    
    // 2. 解压 ZIP 文件
    let metadata = extract_and_validate(&zip_path, temp_path)?;
    
    // 3. 移动到插件目录
    let plugin_dir = manager.get_plugin_dir();
    move_to_plugin_dir(&metadata, temp_path, &plugin_dir)?;
    
    // 4. 计算哈希
    let plugin_path = plugin_dir.join(&metadata.id);
    let hash = calculate_directory_hash(&plugin_path)?;
    
    // 5. 更新注册表
    let mut registry = load_registry(&plugin_dir)?;
    register_plugin(&mut registry, &metadata, hash);
    save_registry(&registry, &plugin_dir)?;
    
    // 6. 重新扫描插件
    manager.scan_plugins()?;
    
    Ok(metadata)
}

fn extract_and_validate(zip_path: &str, temp_dir: &Path) -> Result<PluginMetadata, String> {
    let file = File::open(zip_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
    
    // 解压所有文件
    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = temp_dir.join(file.name());
        
        // 安全检查：防止路径遍历
        if file.name().contains("..") || file.name().starts_with("/") {
            return Err("Invalid file path in ZIP".to_string());
        }
        
        if file.name().ends_with('/') {
            std::fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
        } else {
            if let Some(p) = outpath.parent() {
                std::fs::create_dir_all(p).map_err(|e| e.to_string())?;
            }
            let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }
    }
    
    // 验证 plugin.json
    let manifest_path = temp_dir.join("plugin.json");
    if !manifest_path.exists() {
        return Err("Missing plugin.json".to_string());
    }
    
    let content = std::fs::read_to_string(&manifest_path).map_err(|e| e.to_string())?;
    let metadata: PluginMetadata = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    // 验证必填字段
    if metadata.id.is_empty() || metadata.name.is_empty() || metadata.version.is_empty() {
        return Err("Invalid plugin.json: missing required fields".to_string());
    }
    
    Ok(metadata)
}
```

### 5.2 前端安装按钮组件

```tsx
// src/components/settings/InstallPluginButton.tsx
import { Button, Progress, Tooltip } from '@heroui/react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';
import { IoCloudUploadOutline } from 'react-icons/io5';

interface InstallPluginButtonProps {
  onInstalled: () => void;
}

export function InstallPluginButton({ onInstalled }: InstallPluginButtonProps) {
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleInstall = async () => {
    try {
      setInstalling(true);
      setProgress(10);
      
      // 1. 打开文件选择对话框
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Plugin Package',
          extensions: ['zip']
        }]
      });
      
      if (!selected) {
        setInstalling(false);
        return;
      }
      
      setProgress(30);
      
      // 2. 调用 Rust 端安装
      const metadata = await invoke('install_plugin_from_zip', { 
        zipPath: selected 
      });
      
      setProgress(80);
      
      // 3. 通知父组件刷新
      onInstalled();
      
      setProgress(100);
      setTimeout(() => {
        setInstalling(false);
        setProgress(0);
      }, 500);
      
      // 4. 显示成功通知
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          type: 'success',
          message: `插件 ${metadata.name} 安装成功`
        }
      }));
      
    } catch (error) {
      console.error('Installation failed:', error);
      setInstalling(false);
      setProgress(0);
      
      // 显示错误通知
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          type: 'error',
          message: `安装失败: ${error}`
        }
      }));
    }
  };

  return (
    <div className="relative">
      <Button
        size="sm"
        color="primary"
        startContent={<IoCloudUploadOutline />}
        onPress={handleInstall}
        isDisabled={installing}
        className="px-4"
      >
        {installing ? '安装中...' : '安装插件'}
      </Button>
      
      {installing && (
        <div className="absolute top-full left-0 right-0 mt-2">
          <Progress
            value={progress}
            color="primary"
            size="sm"
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
```

### 5.3 插件生命周期 Hook

```typescript
// src/hooks/usePluginLifecycle.ts
import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { clearPluginCache } from '../utils/pluginLoader';

export function usePluginLifecycle() {
  const [busy, setBusy] = useState<string | null>(null); // 当前操作的插件 ID

  const installPlugin = useCallback(async (zipPath: string) => {
    setBusy('installing');
    try {
      const metadata = await invoke('install_plugin_from_zip', { zipPath });
      
      // 触发重新加载
      window.dispatchEvent(new CustomEvent('plugins-changed'));
      
      return metadata;
    } finally {
      setBusy(null);
    }
  }, []);

  const uninstallPlugin = useCallback(async (pluginId: string) => {
    setBusy(pluginId);
    try {
      // 1. 清除缓存
      clearPluginCache(pluginId);
      
      // 2. 调用后端卸载
      await invoke('uninstall_plugin', { id: pluginId });
      
      // 3. 触发重新加载
      window.dispatchEvent(new CustomEvent('plugins-changed'));
    } finally {
      setBusy(null);
    }
  }, []);

  const updatePlugin = useCallback(async (pluginId: string, zipPath: string) => {
    setBusy(pluginId);
    try {
      // 1. 卸载旧版本
      await uninstallPlugin(pluginId);
      
      // 2. 安装新版本
      await installPlugin(zipPath);
    } finally {
      setBusy(null);
    }
  }, [uninstallPlugin, installPlugin]);

  const enablePlugin = useCallback(async (pluginId: string) => {
    await invoke('toggle_plugin_enabled', { 
      id: pluginId, 
      enabled: true 
    });
    window.dispatchEvent(new CustomEvent('plugins-changed'));
  }, []);

  const disablePlugin = useCallback(async (pluginId: string) => {
    // 1. 清除缓存
    clearPluginCache(pluginId);
    
    // 2. 更新注册表
    await invoke('toggle_plugin_enabled', { 
      id: pluginId, 
      enabled: false 
    });
    
    // 3. 触发重新加载
    window.dispatchEvent(new CustomEvent('plugins-changed'));
  }, []);

  return {
    busy,
    installPlugin,
    uninstallPlugin,
    updatePlugin,
    enablePlugin,
    disablePlugin,
  };
}
```

---

## 6. 验收标准

### 6.1 功能完整性

#### 核心功能
- [ ] 用户能通过文件选择对话框选择 ZIP 文件
- [ ] ZIP 文件能正确解压到插件目录
- [ ] plugin.json 验证通过后才注册插件
- [ ] 安装成功后插件立即可用（无需重启）
- [ ] 卸载插件后从搜索结果中消失
- [ ] 支持插件启用/禁用切换
- [ ] 禁用插件不参与搜索和执行

#### 持久化
- [ ] 应用重启后已安装插件自动加载
- [ ] 插件启用/禁用状态持久化
- [ ] 注册表文件损坏时自动修复

#### 错误处理
- [ ] 无效 ZIP 文件显示明确错误提示
- [ ] 缺少 plugin.json 时拒绝安装
- [ ] 解压失败时清理临时文件
- [ ] 网络/文件系统错误有友好提示
- [ ] 单个插件失败不影响其他插件

### 6.2 性能要求

- [ ] 安装 10MB 以内的插件耗时 < 3 秒
- [ ] 插件加载（从点击到可用）耗时 < 1 秒
- [ ] 启动时加载 50 个插件耗时 < 2 秒
- [ ] 内存占用增加 < 50MB（相比当前版本）
- [ ] 卸载插件后内存完全释放

### 6.3 安全性

- [ ] 拒绝包含 `../` 路径的 ZIP 文件
- [ ] 验证插件哈希完整性
- [ ] 检查权限声明合法性
- [ ] 插件执行超时 5 秒自动终止
- [ ] 记录所有安装/卸载操作到日志
- [ ] 不支持执行系统命令的权限

### 6.4 用户体验

- [ ] 安装过程显示进度条
- [ ] 成功/失败有明确的 Toast 通知
- [ ] 安装过程中按钮禁用防止重复点击
- [ ] 错误提示包含具体原因和解决建议
- [ ] UI 符合项目设计规范（HeroUI）
- [ ] 支持键盘操作（无障碍访问）

### 6.5 兼容性

- [ ] Windows 10/11 测试通过
- [ ] macOS 12+ 测试通过（如有条件）
- [ ] Linux Ubuntu 20.04+ 测试通过（如有条件）
- [ ] 不同分辨率下 UI 正常显示
- [ ] 深色/浅色主题适配

---

## 7. 风险评估

### 7.1 技术风险

| 风险 | 概率 | 影响 | 缓解方案 |
|------|------|------|----------|
| ZIP 解压库兼容性问题 | 低 | 中 | 使用成熟的 `zip` crate，充分测试 |
| 动态导入失败（路径问题） | 中 | 高 | 统一路径分隔符处理，添加详细日志 |
| 注册表文件损坏 | 低 | 高 | 原子写操作 + 自动备份恢复 |
| 内存泄漏（插件缓存） | 中 | 中 | 卸载时强制清除缓存，添加监控 |
| Tauri 权限配置错误 | 中 | 高 | 参考官方文档，逐步测试权限 |

### 7.2 安全风险

| 风险 | 概率 | 影响 | 缓解方案 |
|------|------|------|----------|
| 恶意插件执行危险操作 | 中 | 高 | 权限白名单 + 沙箱隔离 |
| ZIP 炸弹（超大文件） | 低 | 中 | 限制单个文件大小 < 50MB |
| 路径遍历攻击 | 低 | 高 | 严格验证文件路径，拒绝 `..` |
| 插件篡改（中间人攻击） | 低 | 中 | SHA256 哈希校验 + 未来支持签名 |

### 7.3 用户体验风险

| 风险 | 概率 | 影响 | 缓解方案 |
|------|------|------|----------|
| 安装失败用户不知道原因 | 中 | 中 | 详细的错误提示 + 日志查看入口 |
| 插件加载慢导致卡顿 | 低 | 高 | 懒加载 + 超时控制 + 进度提示 |
| 误卸载重要插件 | 低 | 中 | 卸载前二次确认 + 回收站机制（可选） |
| 更新插件丢失配置 | 中 | 中 | 保留配置文件，只替换代码文件 |

### 7.4 项目进度风险

| 风险 | 概率 | 影响 | 缓解方案 |
|------|------|------|----------|
| Rust ZIP 库学习曲线 | 低 | 低 | 提前阅读文档，准备示例代码 |
| Tauri 权限调试耗时 | 中 | 中 | 预留 2 天缓冲时间 |
| 跨平台兼容性问题 | 中 | 高 | 优先保证 Windows，其他平台后续适配 |
| 需求变更（如增加插件市场） | 低 | 高 | 保持架构可扩展性，预留接口 |

---

## 8. 可复用资源清单

### 8.1 现有代码复用

| 资源 | 位置 | 复用方式 | 修改需求 |
|------|------|----------|----------|
| PluginManifest 类型 | `src/types/plugin.ts` | 直接使用 | 可能添加 `enabled` 字段 |
| loadPluginFromManifest | `src/utils/pluginLoader.ts` | 封装为带超时版本 | 添加超时控制和缓存 |
| PluginManager | `src-tauri/src/plugin_manager.rs` | 扩展方法 | 添加注册表管理 |
| install_plugin 命令 | `src-tauri/src/commands.rs` | 废弃，替换为新命令 | 保留作为备用 |
| PluginsTab 组件 | `src/components/settings/PluginsTab.tsx` | 扩展 UI | 添加安装按钮和 Toggle |
| usePlugins Hook | `src/hooks/usePlugins.ts` | 扩展功能 | 添加生命周期管理 |
| 打包脚本 | `scripts/pack-plugin.js` | 直接使用 | 无需修改 |

### 8.2 第三方库复用

| 库 | 用途 | 版本 | 许可证 |
|----|------|------|--------|
| `zip` | Rust ZIP 解压 | 0.6.x | MIT/Apache-2.0 |
| `tempfile` | 临时文件管理 | 3.x | MIT/Apache-2.0 |
| `sha2` | SHA256 哈希计算 | 0.10.x | MIT/Apache-2.0 |
| `@tauri-apps/plugin-dialog` | 文件选择对话框 | 2.x | MIT/Apache-2.0 |
| `archiver` | 前端 ZIP 打包（已有） | 最新版 | MIT |

### 8.3 设计模式复用

- **观察者模式**: 使用 `CustomEvent` 通知插件变化（已有实践）
- **工厂模式**: `loadPluginFromManifest` 根据 entry_type 创建不同插件
- **单例模式**: `PluginManager` 通过 Tauri State 管理
- **策略模式**: 不同 entry_type 采用不同加载策略

---

## 9. 后续优化方向

### 9.1 短期优化（1-2 个月）
1. **插件市场集成**: 从 GitHub 直接下载安装
2. **插件评分和评论**: 用户反馈机制
3. **自动更新检查**: 定期检测新版本
4. **插件依赖管理**: 处理插件间依赖关系

### 9.2 中期优化（3-6 个月）
1. **插件签名验证**: RSA/ECDSA 数字签名
2. **沙箱强化**: WebAssembly 隔离执行
3. **性能监控**: 插件资源占用统计
4. **插件模板**: 快速创建新插件

### 9.3 长期愿景（6-12 个月）
1. **云端插件仓库**: 官方维护和审核
2. **插件协作**: 插件间通信和组合
3. **AI 辅助**: 智能推荐插件
4. **企业版**: 私有插件管理和审计

---

## 10. 附录

### 10.1 术语表

- **Plugin Manifest**: 插件清单文件（plugin.json），描述插件元数据
- **Plugin Registry**: 插件注册表，持久化存储插件状态
- **Entry Type**: 插件入口类型（js/html/esm）
- **Asset Protocol**: Tauri 的资源访问协议（asset://）
- **Hot Reload**: 热重载，无需重启应用更新插件

### 10.2 参考资料

- [Tauri 2.0 文档](https://tauri.app/v2/guides/)
- [Tauri Plugin System](https://tauri.app/v2/guides/features/plugin/)
- [Rust zip crate](https://docs.rs/zip/latest/zip/)
- [Web Security Best Practices](https://developer.mozilla.org/en-US/docs/Web/Security)

### 10.3 变更记录

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2026-05-11 | 初始版本，完成详细规划 | Planning-Agent |

---

**下一步行动**:
1. Implementation-Agent 读取本规划文档
2. 从模块 1 开始实现（Rust 端 ZIP 解压）
3. 每完成一个模块更新进度文件 `.lingma/plans/progress_module_X.json`
4. 遇到复杂问题时请求子规划

**联系方式**: 如有疑问或需要调整规划，请联系项目维护者。
