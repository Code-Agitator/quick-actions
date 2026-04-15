# Everything CLI (Sidecar) 集成指南

## ✅ 集成完成

已成功将 Everything 搜索从 HTTP API 迁移到 CLI (es.exe) Sidecar 方式。

## 📋 实施步骤回顾

### 1. 下载 es.exe
```powershell
# 自动下载并配置
Invoke-WebRequest -Uri "https://www.voidtools.com/ES-1.1.0.37.x64.zip" -OutFile "libs\es.zip"
Expand-Archive -Path "libs\es.zip" -DestinationPath "libs\es-temp" -Force
Get-ChildItem "libs\es-temp" -Recurse -Filter "*.exe" | Copy-Item -Destination "libs\es.exe" -Force
```

### 2. 创建 Sidecar 文件（带平台后缀）
```powershell
$targetTriple = (rustc -Vv | Select-String "host:" | ForEach-Object { $_.Line.Split(" ")[1] })
Copy-Item "libs\es.exe" "libs\es-$targetTriple.exe" -Force
# 结果: libs\es-x86_64-pc-windows-msvc.exe
```

### 3. 配置 tauri.conf.json
```json
{
  "bundle": {
    "externalBin": [
      "libs/es"
    ]
  }
}
```

### 4. 配置 capabilities/default.json
```json
{
  "permissions": [
    "shell:allow-execute",
    {
      "identifier": "shell:allow-execute",
      "allow": [
        {
          "name": "libs/es",
          "sidecar": true,
          "args": true
        }
      ]
    }
  ]
}
```

### 5. Rust 代码实现

**commands.rs**:
```rust
use tauri_plugin_shell::ShellExt;

#[tauri::command]
pub async fn everything_search(query: String, _host: Option<String>, app: tauri::AppHandle) -> Result<EverythingResponse, String> {
    // 使用 shell plugin 的 sidecar API
    let command = app.shell()
        .sidecar("libs/es")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .args(&[&query, "-json", "-max-results", "100"]);
    
    let output = command.output().await
        .map_err(|e| format!("Failed to execute es.exe: {}", e))?;
    
    // 解析 JSON 输出...
}
```

## 🔧 工作原理

```
用户输入搜索关键词
    ↓
前端调用 invoke('everything_search', { query: 'xxx' })
    ↓
Rust 后端通过 Tauri Shell Plugin 调用 Sidecar
    ↓
Tauri 自动找到 libs/es-x86_64-pc-windows-msvc.exe
    ↓
es.exe 通过 IPC 与 Everything 通信
    ↓
返回 JSON 格式结果
    ↓
Rust 解析并返回给前端
```

## 📁 文件结构

```
src-tauri/
├── libs/
│   ├── es.exe                              # 原始文件
│   └── es-x86_64-pc-windows-msvc.exe       # Sidecar 文件（带平台后缀）
├── tauri.conf.json                         # 配置 externalBin
├── capabilities/
│   └── default.json                        # 配置权限
└── src/
    ├── commands.rs                         # everything_search 命令
    └── plugin_api.rs                       # plugin_everything_search API
```

## ✨ 优势

| 特性 | CLI (Sidecar) | HTTP API | SDK DLL |
|------|---------------|----------|---------|
| 复杂度 | ⭐ 简单 | ⭐⭐ 中等 | ⭐⭐⭐ 复杂 |
| 兼容性 | ✅ 完美 | ⚠️ 需启用HTTP | ❌ 版本敏感 |
| 性能 | ✅ 良好 | ✅ 良好 | ✅ 略快 |
| 安全性 | ✅ Tauri管理 | ⚠️ 开放端口 | ⚠️ DLL加载 |
| 打包 | ✅ 自动包含 | ❌ 需外部安装 | ⚠️ 手动配置 |
| 调试 | ✅ 容易 | ✅ 容易 | ❌ 困难 |

## 🐛 故障排查

### 问题 1: "Failed to create sidecar command"

**原因**: Sidecar 文件不存在或命名错误

**解决**:
```powershell
# 检查文件是否存在
Get-ChildItem "src-tauri\libs" -Filter "es-*.exe"

# 重新创建
$targetTriple = (rustc -Vv | Select-String "host:" | ForEach-Object { $_.Line.Split(" ")[1] })
Copy-Item "libs\es.exe" "libs\es-$targetTriple.exe" -Force
```

### 问题 2: "es.exe error: ..."

**原因**: Everything 未运行或索引未完成

**解决**:
1. 确保 Everything 应用程序正在运行
2. 等待索引完成（查看 Everything 窗口底部状态）
3. 在 Everything 窗口中测试相同关键词

### 问题 3: 搜索无结果

**原因**: 查询词不匹配或权限问题

**解决**:
1. 尝试简单关键词如 "test" 或 "a"
2. 以管理员身份运行 Everything
3. 检查 Everything 是否有权访问目标目录

## 🔄 更新 es.exe

如果需要更新 es.exe 版本：

```powershell
# 1. 下载新版本
Invoke-WebRequest -Uri "https://www.voidtools.com/ES-1.1.0.37.x64.zip" -OutFile "libs\es-new.zip"

# 2. 解压
Expand-Archive -Path "libs\es-new.zip" -DestinationPath "libs\es-new-temp" -Force

# 3. 替换
Get-ChildItem "libs\es-new-temp" -Recurse -Filter "*.exe" | Copy-Item -Destination "libs\es.exe" -Force

# 4. 重新创建 Sidecar
$targetTriple = (rustc -Vv | Select-String "host:" | ForEach-Object { $_.Line.Split(" ")[1] })
Copy-Item "libs\es.exe" "libs\es-$targetTriple.exe" -Force

# 5. 清理
Remove-Item "libs\es-new.zip", "libs\es-new-temp" -Recurse -Force
```

## 📝 命令行参数

es.exe 支持的常用参数：

| 参数 | 说明 | 示例 |
|------|------|------|
| `-json` | JSON 格式输出 | `es.exe "test" -json` |
| `-max-results N` | 最大结果数 | `es.exe "test" -max-results 100` |
| `-name-only` | 仅返回文件名 | `es.exe "test" -name-only` |
| `-path` | 包含完整路径 | `es.exe "test" -path` |
| `-size` | 显示文件大小 | `es.exe "test" -size` |
| `-date-modified` | 显示修改日期 | `es.exe "test" -date-modified` |

## 🎯 最佳实践

1. **始终检查 Everything 是否运行**: es.exe 依赖后台服务
2. **限制结果数量**: 使用 `-max-results` 避免返回过多数据
3. **异步调用**: 使用 `async/await` 避免阻塞 UI
4. **错误处理**: 捕获并友好地显示错误信息
5. **缓存结果**: 对频繁搜索的关键词进行缓存

## 🔗 相关资源

- [Everything 官方文档](https://www.voidtools.com/support/everything/)
- [es.exe 命令行参考](https://www.voidtools.com/support/everything/command_line_interface/)
- [Tauri Sidecar 文档](https://tauri.app/v2/guides/building/sidecar/)
- [Tauri Shell Plugin](https://v2.tauri.app/plugin/shell/)

---

**最后更新**: 2026-04-15  
**版本**: v1.0  
**状态**: ✅ 生产就绪
