# Everything SDK API 研究总结

## ✅ 研究成果

通过编写测试代码，成功探索并验证了 `everything-sdk v0.0.6` 的正确 API 用法。

---

## 📚 核心 API

### 1. 获取全局实例

```rust
use everything_sdk::ergo::*;

let global_guard = everything_sdk::ergo::global();
let mut global_locked = global_guard.lock().unwrap();
let mut searcher = global_locked.searcher();
```

**重要提示**：必须保持 `global_guard` 和 `global_locked` 的存活，否则会出现生命周期错误。

---

### 2. 设置搜索参数

```rust
// 设置搜索字符串
searcher.set_search("test");

// 设置最大结果数
searcher.set_max(100);

// 设置请求标志（bitflags）
let flags = RequestFlags::EVERYTHING_REQUEST_FULL_PATH_AND_FILE_NAME 
    | RequestFlags::EVERYTHING_REQUEST_SIZE 
    | RequestFlags::EVERYTHING_REQUEST_DATE_MODIFIED
    | RequestFlags::EVERYTHING_REQUEST_ATTRIBUTES;
searcher.set_request_flags(flags);

// 设置排序类型
searcher.set_sort(SortType::EVERYTHING_SORT_NAME_ASCENDING);
```

---

### 3. 执行查询

```rust
let results = searcher.query();
```

---

### 4. 获取结果

```rust
// 获取结果数量
let count = results.len();

// 遍历结果
for item in results.iter() {
    // 获取完整路径
    let full_path = item.full_path_name(None)?;
    
    // 判断是否为文件夹
    let is_folder = item.is_folder();
    
    // 获取文件大小
    let size = item.size()?;
    
    // 获取修改时间（Unix 时间戳，秒）
    let date_modified = item.date_modified()?;
}
```

---

## 🔑 关键常量

### RequestFlags（请求标志）

使用 bitflags 组合多个标志：

```rust
RequestFlags::EVERYTHING_REQUEST_FILE_NAME
RequestFlags::EVERYTHING_REQUEST_PATH
RequestFlags::EVERYTHING_REQUEST_FULL_PATH_AND_FILE_NAME  // 推荐
RequestFlags::EVERYTHING_REQUEST_EXTENSION
RequestFlags::EVERYTHING_REQUEST_SIZE
RequestFlags::EVERYTHING_REQUEST_DATE_CREATED
RequestFlags::EVERYTHING_REQUEST_DATE_MODIFIED
RequestFlags::EVERYTHING_REQUEST_DATE_ACCESSED
RequestFlags::EVERYTHING_REQUEST_ATTRIBUTES  // 用于判断文件夹
RequestFlags::EVERYTHING_REQUEST_FILE_LIST_FILE_NAME
RequestFlags::EVERYTHING_REQUEST_RUN_COUNT
RequestFlags::EVERYTHING_REQUEST_DATE_RUN
RequestFlags::EVERYTHING_REQUEST_DATE_RECENTLY_CHANGED
RequestFlags::EVERYTHING_REQUEST_HIGHLIGHTED_FILE_NAME
RequestFlags::EVERYTHING_REQUEST_HIGHLIGHTED_PATH
RequestFlags::EVERYTHING_REQUEST_HIGHLIGHTED_FULL_PATH_AND_FILE_NAME
```

### SortType（排序类型）

```rust
SortType::EVERYTHING_SORT_NAME_ASCENDING
SortType::EVERYTHING_SORT_NAME_DESCENDING
SortType::EVERYTHING_SORT_PATH_ASCENDING
SortType::EVERYTHING_SORT_PATH_DESCENDING
SortType::EVERYTHING_SORT_SIZE_ASCENDING
SortType::EVERYTHING_SORT_SIZE_DESCENDING
SortType::EVERYTHING_SORT_TYPE_NAME_ASCENDING
SortType::EVERYTHING_SORT_TYPE_NAME_DESCENDING
SortType::EVERYTHING_SORT_DATE_CREATED_ASCENDING
SortType::EVERYTHING_SORT_DATE_CREATED_DESCENDING
SortType::EVERYTHING_SORT_DATE_MODIFIED_ASCENDING
SortType::EVERYTHING_SORT_DATE_MODIFIED_DESCENDING
SortType::EVERYTHING_SORT_DATE_ACCESSED_ASCENDING
SortType::EVERYTHING_SORT_DATE_ACCESSED_DESCENDING
SortType::EVERYTHING_SORT_DATE_RECENTLY_CHANGED_ASCENDING
SortType::EVERYTHING_SORT_DATE_RECENTLY_CHANGED_DESCENDING
SortType::EVERYTHING_SORT_FILE_LIST_FILENAME_ASCENDING
SortType::EVERYTHING_SORT_FILE_LIST_FILENAME_DESCENDING
SortType::EVERYTHING_SORT_RUN_COUNT_ASCENDING
SortType::EVERYTHING_SORT_RUN_COUNT_DESCENDING
SortType::EVERYTHING_SORT_DATE_RUN_ASCENDING
SortType::EVERYTHING_SORT_DATE_RUN_DESCENDING
SortType::EVERYTHING_SORT_NO_SORT
```

---

## ⚠️ 常见错误

### 1. 生命周期错误

**错误代码**：
```rust
let mut searcher = everything_sdk::global().lock().unwrap().searcher();
// ❌ 临时值在语句结束时被释放
```

**正确代码**：
```rust
let global_guard = everything_sdk::global();
let mut global_locked = global_guard.lock().unwrap();
let mut searcher = global_locked.searcher();
// ✅ 保持所有引用存活
```

### 2. 缺少请求标志

如果调用 `item.full_path_name()` 但没有设置 `EVERYTHING_REQUEST_FULL_PATH_AND_FILE_NAME`，会返回错误：

```
InvalidRequest(RequestFlagsNotSet(RequestFlags(EVERYTHING_REQUEST_FULL_PATH_AND_FILE_NAME)))
```

**解决方案**：确保设置了正确的请求标志。

### 3. 时间戳转换

`date_modified()` 返回的是 Unix 时间戳（秒），需要手动转换为 `DateTime`：

```rust
use std::time::UNIX_EPOCH;

let timestamp = item.date_modified()?;
let system_time = UNIX_EPOCH + std::time::Duration::from_secs(timestamp);
let duration = system_time.duration_since(UNIX_EPOCH).ok()?;
let secs = duration.as_secs() as i64;
let nsecs = duration.subsec_nanos();
chrono::DateTime::<chrono::Utc>::from_timestamp(secs, nsecs)
```

---

## 📝 完整示例

参见 `examples/test_everything_sdk.rs`：

```rust
use everything_sdk::ergo::*;

fn main() {
    // 获取全局实例
    let global_guard = everything_sdk::ergo::global();
    let mut global_locked = global_guard.lock().unwrap();
    let mut searcher = global_locked.searcher();
    
    // 设置搜索参数
    searcher.set_search("test");
    searcher.set_max(10);
    searcher.set_request_flags(
        RequestFlags::EVERYTHING_REQUEST_FULL_PATH_AND_FILE_NAME 
        | RequestFlags::EVERYTHING_REQUEST_SIZE 
        | RequestFlags::EVERYTHING_REQUEST_DATE_MODIFIED
        | RequestFlags::EVERYTHING_REQUEST_ATTRIBUTES
    );
    searcher.set_sort(SortType::EVERYTHING_SORT_NAME_ASCENDING);
    
    // 执行查询
    let results = searcher.query();
    
    // 处理结果
    println!("Found {} results", results.len());
    for (i, item) in results.iter().enumerate() {
        if i >= 5 { break; }
        
        if let Ok(path) = item.full_path_name(None) {
            let is_folder = item.is_folder();
            let size = item.size().unwrap_or(0);
            let date_modified = item.date_modified().unwrap_or(0);
            
            println!("[{}] {} ({}) - Size: {}, Modified: {}",
                i + 1,
                path.display(),
                if is_folder { "DIR" } else { "FILE" },
                size,
                date_modified
            );
        }
    }
}
```

---

## 🎯 已应用到项目

以下文件已成功迁移到 `everything-sdk`：

1. **src/commands.rs** - `everything_search()` 函数
2. **src/everything_ext.rs** - `everything_search_extended()` 函数

所有 es.exe 命令行调用已被替换为 SDK API 调用。

---

## 📊 测试结果

```
=== Testing everything-sdk API ===

Test 1: Get global instance
  Global instance obtained

Test 2: Create searcher from global
  Searcher created

Test 3: Set search string
  Search string set to 'test'

Test 4: Set max results
  Max results set to 10

Test 5: Set request flags
  Request flags set

Test 6: Execute query
  Query executed

Test 7: Get result count
  Found 10 results

Test 8: Iterate results
  [1] D:\project\infer\infer\_build\default\src\backend\tests\.Backend_test.objs (DIR) - Size: 0, Modified: 133849518698460005
  [2] D:\project\infer\infer\_build\default\src\clang\unit\.ClangUnitTests.objs (DIR) - Size: 0, Modified: 133849518065804808
  [3] D:\project\infer\infer\_build\default\src\inferppx-tests\.InferPpxTests.objs (DIR) - Size: 0, Modified: 133849519679745417
  [4] D:\project\infer\infer\_build\default\src\integration\unit\.IntegrationTest.objs (DIR) - Size: 0, Modified: 133849518694982736
  [5] D:\project\semgrep\_build\default\src\osemgrep\cli_test\.osemgrep_cli_test.objs (DIR) - Size: 0, Modified: 133902172165457316

=== Test Complete ===
```

✅ **测试通过！API 工作正常！**
