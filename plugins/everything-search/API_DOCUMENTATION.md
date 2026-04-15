# ACTIONS.everything API 文档

## 概述

`ACTIONS.everything` 提供 Everything 文件搜索和文件操作功能。

## API 方法

### 1. `search(query, host?)`

搜索文件。

**参数**:
- `query` (string) - 搜索关键词，支持正则表达式
- `host` (string, 可选) - Everything 主机地址（目前未使用）

**返回**: `Promise<Array<{name, path, size, dateModified}>>`

**示例**:
```typescript
const results = await window.ACTIONS.everything.search('document');
console.log(results[0].name); // 文件名
console.log(results[0].path); // 文件路径
```

---

### 2. `open(filePath)` ⭐ 新增

使用系统默认应用打开文件或文件夹。

**参数**:
- `filePath` (string) - 完整的文件路径

**返回**: `Promise<void>`

**示例**:
```typescript
// 打开文本文件（会用记事本或其他默认编辑器打开）
await window.ACTIONS.everything.open('C:\\Users\\test\\document.txt');

// 打开文件夹
await window.ACTIONS.everything.open('C:\\Users\\test');

// 打开图片（会用默认图片查看器打开）
await window.ACTIONS.everything.open('C:\\Users\\test\\photo.jpg');
```

**优势**:
- ✅ 使用系统默认应用，更加可靠
- ✅ 自动处理文件关联
- ✅ 支持所有文件类型
- ✅ 路径验证，防止打开不存在的文件

---

### 3. `revealInFolder(filePath)` ⭐ 新增

在文件管理器中显示并选中文件。

**参数**:
- `filePath` (string) - 完整的文件路径

**返回**: `Promise<void>`

**示例**:
```typescript
// 在资源管理器中显示文件（并选中）
await window.ACTIONS.everything.revealInFolder('C:\\Users\\test\\document.txt');
```

**用途**:
- 让用户快速定位文件位置
- 方便用户进行后续操作（复制、移动、删除等）

---

## 完整示例

### Everything 搜索插件

```typescript
// 1. 搜索文件
const results = await window.ACTIONS.everything.search('report');

// 2. 遍历结果
for (const file of results) {
  const fullPath = `${file.path}\\${file.name}`;
  
  console.log(`找到文件: ${fullPath}`);
  
  // 3. 打开文件
  if (file.name.endsWith('.pdf')) {
    await window.ACTIONS.everything.open(fullPath);
  }
  
  // 4. 或者在文件夹中显示
  if (file.name.endsWith('.docx')) {
    await window.ACTIONS.everything.revealInFolder(fullPath);
  }
}
```

### 键盘事件处理

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && selectedFile) {
      const fullPath = `${selectedFile.path}\\${selectedFile.name}`;
      
      // 优先使用 ACTIONS API
      if (window.ACTIONS?.everything?.open) {
        window.ACTIONS.everything.open(fullPath);
      } else {
        // 降级方案
        window.open(`file://${fullPath}`, '_blank');
      }
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedFile]);
```

### 点击事件处理

```typescript
<div
  onClick={async () => {
    const fullPath = `${item.path}\\${item.name}`;
    
    try {
      // 使用系统默认应用打开
      await window.ACTIONS.everything.open(fullPath);
    } catch (error) {
      console.error('打开文件失败:', error);
      // 可以显示错误提示
    }
  }}
>
  {item.name}
</div>
```

---

## 错误处理

### 常见错误

1. **文件不存在**
   ```typescript
   try {
     await window.ACTIONS.everything.open('C:\\not-exist.txt');
   } catch (error) {
     console.error(error); // "Path does not exist: C:\not-exist.txt"
   }
   ```

2. **权限不足**
   ```typescript
   try {
     await window.ACTIONS.everything.open('C:\\Windows\\system32\\config');
   } catch (error) {
     console.error(error); // 权限错误
   }
   ```

### 最佳实践

```typescript
async function safeOpenFile(filePath: string) {
  try {
    // 检查 API 是否可用
    if (!window.ACTIONS?.everything?.open) {
      throw new Error('ACTIONS API 不可用');
    }
    
    // 尝试打开文件
    await window.ACTIONS.everything.open(filePath);
    
  } catch (error) {
    console.error('打开文件失败:', error);
    
    // 降级方案
    if (confirm('无法使用系统应用打开，是否尝试其他方式？')) {
      window.open(`file://${filePath}`, '_blank');
    }
  }
}
```

---

## 技术实现

### 后端命令

```rust
// commands.rs

/// 打开文件或文件夹（使用系统默认应用）
#[tauri::command]
pub fn open_path(path: String, app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    
    // 验证路径是否存在
    let path_obj = std::path::Path::new(&path);
    if !path_obj.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    
    // 使用 opener 插件打开文件/文件夹
    app.opener()
        .open_path(&path, None::<&str>)
        .map_err(|e| format!("Failed to open path: {}", e))?;
    
    Ok(())
}

/// 在文件管理器中显示文件（选中文件）
#[tauri::command]
pub fn reveal_in_folder(path: String, app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    
    // 验证路径是否存在
    let path_obj = std::path::Path::new(&path);
    if !path_obj.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    
    // 使用 opener 插件在文件夹中显示文件
    app.opener()
        .reveal_item_in_dir(&path)
        .map_err(|e| format!("Failed to reveal in folder: {}", e))?;
    
    Ok(())
}
```

### 前端 API

```typescript
// actionsAPI.ts / pluginAPI.ts

everything: {
  open: async (filePath: string) => {
    await invoke('open_path', { path: filePath });
  },
  
  revealInFolder: async (filePath: string) => {
    await invoke('reveal_in_folder', { path: filePath });
  }
}
```

---

## 平台支持

| 功能 | Windows | macOS | Linux |
|------|---------|-------|-------|
| `open()` | ✅ | ✅ | ✅ |
| `revealInFolder()` | ✅ | ✅ | ✅ |

**注意**: 
- Windows: 使用资源管理器
- macOS: 使用 Finder
- Linux: 使用默认文件管理器（Nautilus、Dolphin 等）

---

## 版本历史

- **v1.2.0** (2026-04-16) - 初始版本，添加 `open()` 和 `revealInFolder()` 方法

---

## 相关资源

- [Tauri Opener Plugin](https://tauri.app/plugin/opener)
- [Everything Search](https://www.voidtools.com/)
- [ACTIONS API 完整文档](../../ACTIONS_API_GUIDE.md)
