# Everything CLI 中文乱码修复与封装

## 🐛 问题描述

Everything 搜索插件在显示中文文件名时出现乱码。

## 🔍 问题分析

### 初步诊断

最初怀疑是编码问题，尝试添加 `-utf8` 参数，但 es.exe 报错：
```
Error 6: Unknown switch.
```

### 根本原因

通过阅读 `es.exe -h` 帮助文档和实际测试发现：

1. **es.exe 默认输出 UTF-8** ✅
   ```bash
   .\es.exe "测试" -json -n 5
   # 输出正常显示中文："SAST测试样品"
   ```

2. **问题在于 Rust 代码** ❌
   - 使用了错误的参数：`-max-results`（应该是 `-n`）
   - 使用 `String::from_utf8_lossy()` 会静默替换无效字符为 ``

3. **正确的参数**（来自帮助文档）：
   - `-n <num>` 或 `-count <num>` - 限制结果数量
   - `-date-format <format>` - 日期格式（1=ISO-8601）
   - `-size-format <format>` - 大小格式（0=auto）
   - **没有 `-utf8` 参数** - es.exe 默认就是 UTF-8

## ✅ 解决方案

### 1. 修正命令行参数

**之前（错误）**：
```rust
.args(&[&query, "-json", "-max-results", "100", "-utf8"])
//                          ^^^^^^^^^^^^^^ 错误的参数
//                                          ^^^^^^^ 不存在的参数
```

**之后（正确）**：
```rust
.args(&[&query, "-json", "-n", "100", "-date-format", "1"])
//                        ^^ 正确的参数     ^^^^^^^^^^^^^^ ISO-8601 日期格式
```

### 2. 改进 UTF-8 处理

**之前**：
```rust
let stdout = String::from_utf8_lossy(&output.stdout);
// 静默替换无效 UTF-8 为 ，导致乱码
```

**之后**：
```rust
let stdout_str = match String::from_utf8(output.stdout) {
    Ok(s) => s,  // 成功解码
    Err(e) => {
        eprintln!("[Everything CLI] UTF-8 decode error: {}", e);
        // 降级方案：记录错误并使用 lossy 转换
        String::from_utf8_lossy(&output.stdout).to_string()
    }
};
```

### 3. 创建类型安全的封装模块

新建 `src-tauri/src/everything_cli.rs`，提供：

#### EsSearchOptions - 搜索选项
```rust
pub struct EsSearchOptions {
    pub query: String,
    pub max_results: u32,
    pub date_format: u8,      // 0=auto, 1=ISO-8601, 2=FILETIME...
    pub size_format: u8,      // 0=auto, 1=Bytes, 2=KB, 3=MB
    pub match_path: bool,     // -p 匹配整个路径
    pub folders_only: bool,   // /ad 只搜索文件夹
    pub files_only: bool,     // /a-d 只搜索文件
}
```

#### EsResult - 搜索结果
```rust
pub struct EsResult {
    pub filename: String,     // 完整路径
    pub size: u64,            // 文件大小
    pub date_modified: String, // ISO-8601 格式
}
```

#### EsError - 错误类型
```rust
pub enum EsError {
    ExecutionError(String),   // 执行失败
    CommandError(String),     // 命令错误
    ParseError(String),       // JSON 解析失败
    EncodingError,            // UTF-8 解码失败
}
```

#### search() - 搜索函数
```rust
pub async fn search(
    options: EsSearchOptions, 
    es_path: &str
) -> Result<Vec<EsResult>, EsError>
```

### 4. 增强的调试日志

```rust
eprintln!("[Everything CLI] Raw output length: {} bytes", stdout_str.len());
if stdout_str.len() > 0 {
    let preview = if stdout_str.len() > 300 { 
        &stdout_str[..300] 
    } else { 
        &stdout_str 
    };
    eprintln!("[Everything CLI] Raw output preview: {}", preview);
}
```

## 📊 修改的文件

| 文件 | 修改内容 |
|------|---------|
| `src-tauri/src/commands.rs` | 修正参数，改进 UTF-8 处理 |
| `src-tauri/src/lib.rs` | 注册 `everything_cli` 模块 |
| `src-tauri/src/everything_cli.rs` | **新增** 类型安全封装 |

## 🧪 测试验证

### 测试 1: 中文文件名
```bash
# 命令行测试
.\es.exe "测试" -json -n 5

# 预期输出
[{"filename":"D:\\data\\SAST测试样品\\"}, ...]
```

### 测试 2: Rust 调用
```rust
let options = EsSearchOptions {
    query: "文档".to_string(),
    max_results: 10,
    date_format: 1, // ISO-8601
    ..Default::default()
};

let results = search(options, "libs/es.exe").await?;
for result in results {
    println!("File: {}", result.filename); // 应该正常显示中文
}
```

### 测试 3: 应用内搜索
1. 打开 Quick Actions
2. 输入中文关键词如 "测试" 或 "文档"
3. 验证搜索结果中的中文文件名正常显示

## 📚 es.exe 常用参数参考

### 搜索选项
| 参数 | 说明 | 示例 |
|------|------|------|
| `-r`, `-regex` | 正则表达式搜索 | `-r ".*\.txt$"` |
| `-i`, `-case` | 区分大小写 | `-i "README"` |
| `-w`, `-whole-word` | 全词匹配 | `-w "test"` |
| `-p`, `-match-path` | 匹配完整路径 | `-p "C:\Users"` |
| `/ad` | 只搜索文件夹 | `/ad` |
| `/a-d` | 只搜索文件 | `/a-d` |

### 输出控制
| 参数 | 说明 | 值 |
|------|------|-----|
| `-n <num>` | 最大结果数 | 1-1000000 |
| `-json` | JSON 格式输出 | - |
| `-csv` | CSV 格式输出 | - |
| `-date-format` | 日期格式 | 0=auto, 1=ISO-8601, 2=FILETIME |
| `-size-format` | 大小格式 | 0=auto, 1=Bytes, 2=KB, 3=MB |

### 高级功能
| 参数 | 说明 |
|------|------|
| `-path <path>` | 在指定路径下搜索 |
| `-export-json <file>` | 导出到 JSON 文件 |
| `-get-result-count` | 获取结果数量 |
| `-get-total-size` | 获取总大小 |

## 🎯 最佳实践

### 1. 始终使用 `-n` 限制结果数
```rust
// ✅ 好的做法
.args(&["query", "-json", "-n", "100"])

// ❌ 避免：可能返回数百万结果
.args(&["query", "-json"])
```

### 2. 使用 ISO-8601 日期格式
```rust
// ✅ 标准化的日期格式
.args(&["-date-format", "1"])

// 输出: "2024-01-15T10:30:00"
```

### 3. 正确处理 UTF-8
```rust
// ✅ 先尝试严格解码，失败再降级
match String::from_utf8(output.stdout) {
    Ok(s) => s,
    Err(_) => String::from_utf8_lossy(&output.stdout).to_string()
}
```

### 4. 使用类型安全的封装
```rust
// ✅ 使用 everything_cli 模块
let options = EsSearchOptions {
    query: "文档".to_string(),
    max_results: 50,
    ..Default::default()
};
let results = search(options, "libs/es.exe").await?;

// ❌ 避免：手动拼接参数
Command::new("es.exe")
    .args(&["文档", "-json", "-n", "50"])
```

## 🔮 未来改进

1. **缓存机制** - 缓存常用搜索结果
2. **增量搜索** - 支持实时搜索建议
3. **过滤器链** - 组合多个过滤条件
4. **性能监控** - 记录搜索耗时和结果数

---

**修复日期**: 2026-04-16  
**影响范围**: Everything 搜索功能  
**兼容性**: ✅ 完全兼容现有代码  
**测试状态**: ⏳ 待验证
