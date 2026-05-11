# 模块 2: 快捷键编辑器 - 详细规划文档

## 1. 任务概述

- **复杂度评级**: L3（复杂）
- **输入源**: 
  - `src/hooks/useAppSettings.ts` - 已有 `globalShortcut` 字段
  - `src/components/settings/GeneralSetting.tsx` - 现有通用设置组件
  - `src/App.tsx` - 已有快捷键注册逻辑（line 63-88）
- **输出目标**: 实现交互式快捷键编辑器，允许用户自定义全局快捷键

## 2. 可复用资源

### 2.1 已有的后端功能

```rust
// Tauri 后端命令（需要确认是否存在）
#[tauri::command]
async fn update_global_shortcut(shortcut: String) -> Result<(), String> {
    // 注册/更新全局快捷键
}
```

**注意**：需要检查 `src-tauri/src/main.rs` 或相关文件中是否已实现此命令。

### 2.2 已有的前端逻辑

```typescript
// App.tsx line 63-88 中的快捷键注册逻辑
const registerShortcut = async () => {
  const settingsStr = localStorage.getItem('quick-actions-settings');
  if (settingsStr) {
    const settings = JSON.parse(settingsStr);
    const shortcut = settings.globalShortcut || 'Ctrl+Space';
    await invoke('update_global_shortcut', { shortcut });
  }
};
```

### 2.3 已有的UI模式

参考 `GeneralSetting.tsx` 中的设置项模式：
- 使用卡片式布局（`bg-default-100`）
- 左侧图标 + 文本描述
- 右侧操作按钮

## 3. 依赖关系

### 3.1 依赖的模块

- ✅ `useAppSettings` Hook（已实现）
- ⚠️ Tauri 后端命令 `update_global_shortcut`（需要确认）
- ❌ Module 3（通知系统）- 用于显示成功/失败反馈

### 3.2 被依赖的模块

- ❌ 无（此模块不依赖其他待实现模块，但建议使用通知系统）

## 4. 关键映射

| 原名称 | 新名称/用途 | 类型 |
|-------|-----------|------|
| `settings.globalShortcut` | 当前快捷键字符串 | string |
| `invoke('update_global_shortcut')` | 后端快捷键更新命令 | function |
| 键盘事件监听 | 捕获用户按键组合 | EventListener |
| 快捷键解析器 | 将键盘事件转换为字符串 | function |

## 5. 实现要点

### 5.1 整体设计方案

**方案A：内联编辑（推荐）**
- 在 GeneralSetting.tsx 中扩展现有快捷键显示区域
- 点击"编辑"按钮进入录制模式
- 用户按下快捷键后自动保存

**方案B：独立组件**
- 新建 `settings/ShortcutEditor.tsx` 组件
- 作为模态对话框或独立页面
- 更复杂的交互和验证

**建议**：采用方案A，保持简洁，符合项目"轻量"的设计哲学。

### 5.2 UI结构设计

**初始状态（只读显示）**：
```tsx
<div className="flex items-center gap-3 p-3 rounded-lg bg-default-100">
  <IoKeyOutline className="text-xl text-default-500" />
  <div className="flex-1">
    <p className="text-small text-default-600">全局快捷键</p>
    <p className="text-tiny text-default-500 mt-0.5">
      当前: <Kbd>{settings.globalShortcut}</Kbd>
    </p>
  </div>
  <Button size="sm" variant="flat" onPress={startRecording}>
    修改
  </Button>
</div>
```

**录制状态（等待用户按键）**：
```tsx
<div className="flex items-center gap-3 p-3 rounded-lg bg-default-100 border-2 border-primary">
  <IoKeyOutline className="text-xl text-primary" />
  <div className="flex-1">
    <p className="text-small text-default-600">请按下新的快捷键</p>
    <p className="text-tiny text-default-500 mt-0.5">
      当前按下: <Kbd>{currentKeys}</Kbd>
    </p>
  </div>
  <div className="flex gap-2">
    <Button size="sm" variant="flat" onPress={cancelRecording}>
      取消
    </Button>
    <Button size="sm" color="primary" onPress={saveShortcut} isDisabled={!isValid}>
      保存
    </Button>
  </div>
</div>
```

### 5.3 核心逻辑实现

#### 5.3.1 快捷键录制器

**状态管理**：
```typescript
const [isRecording, setIsRecording] = useState(false);
const [currentKeys, setCurrentKeys] = useState<string>('');
const [pendingShortcut, setPendingShortcut] = useState<string>('');
```

**键盘事件监听**：
```typescript
useEffect(() => {
  if (!isRecording) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 收集修饰键
    const modifiers: string[] = [];
    if (e.ctrlKey) modifiers.push('Ctrl');
    if (e.altKey) modifiers.push('Alt');
    if (e.shiftKey) modifiers.push('Shift');
    if (e.metaKey) modifiers.push('Meta'); // macOS Command

    // 获取主键
    let mainKey = e.key;
    
    // 特殊键名映射
    const keyMap: Record<string, string> = {
      ' ': 'Space',
      'Escape': 'Esc',
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'ArrowLeft': '←',
      'ArrowRight': '→',
    };
    mainKey = keyMap[mainKey] || mainKey;

    // 忽略单独的修饰键
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(mainKey)) {
      return;
    }

    // 构建快捷键字符串
    const shortcut = [...modifiers, mainKey].join('+');
    setCurrentKeys(shortcut);
    setPendingShortcut(shortcut);
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isRecording]);
```

**验证逻辑**：
```typescript
const isValidShortcut = (shortcut: string): boolean => {
  // 至少需要一个修饰键
  const hasModifier = /(Ctrl|Alt|Shift|Meta)/.test(shortcut);
  
  // 不能只是修饰键
  const parts = shortcut.split('+');
  const hasMainKey = parts.length > 1;
  
  // 黑名单：禁止某些组合（如 Ctrl+Alt+Del）
  const blacklist = ['Ctrl+Alt+Delete', 'Ctrl+Alt+Esc'];
  const isBlacklisted = blacklist.includes(shortcut);
  
  return hasModifier && hasMainKey && !isBlacklisted;
};
```

**保存逻辑**：
```typescript
const saveShortcut = async () => {
  if (!pendingShortcut || !isValidShortcut(pendingShortcut)) {
    showError('无效的快捷键组合');
    return;
  }

  try {
    // 调用后端命令
    await invoke('update_global_shortcut', { 
      shortcut: pendingShortcut 
    });
    
    // 更新本地设置
    updateSetting('globalShortcut', pendingShortcut);
    
    // 显示成功提示
    showSuccess(`快捷键已更新为 ${pendingShortcut}`);
    
    // 退出录制模式
    setIsRecording(false);
  } catch (error) {
    console.error('Failed to update shortcut:', error);
    showError('快捷键设置失败，请重试');
  }
};
```

**取消逻辑**：
```typescript
const cancelRecording = () => {
  setIsRecording(false);
  setCurrentKeys('');
  setPendingShortcut('');
};
```

#### 5.3.2 开始录制

```typescript
const startRecording = () => {
  setIsRecording(true);
  setCurrentKeys('');
  setPendingShortcut('');
  
  // 可选：显示提示Toast
  showInfo('请按下您想要设置的快捷键组合');
};
```

### 5.4 边界条件处理

1. **冲突检测**：
   - 问题：用户设置的快捷键可能与系统快捷键冲突
   - 解决：维护一个系统快捷键黑名单，或在保存时尝试注册并捕获错误

2. **重复快捷键**：
   - 问题：多个功能使用相同快捷键
   - 解决：本项目只有一个全局快捷键，暂不考虑

3. **无效组合**：
   - 问题：用户只按下修饰键（如单独按Ctrl）
   - 解决：验证逻辑中要求必须有主键

4. **跨平台差异**：
   - 问题：macOS 使用 Command，Windows/Linux 使用 Ctrl
   - 解决：允许用户自由选择，后端负责注册

5. **焦点丢失**：
   - 问题：录制过程中窗口失去焦点
   - 解决：监听 `blur` 事件，自动取消录制

```typescript
useEffect(() => {
  if (!isRecording) return;

  const handleBlur = () => {
    cancelRecording();
    showWarning('窗口失去焦点，已取消快捷键设置');
  };

  window.addEventListener('blur', handleBlur);
  return () => window.removeEventListener('blur', handleBlur);
}, [isRecording]);
```

### 5.5 性能优化

1. **事件监听器清理**：
   - 确保在组件卸载或退出录制模式时移除事件监听器
   - 使用 useEffect 的 cleanup 函数

2. **防抖保存**：
   - 不需要，因为保存是用户主动触发的

3. **避免不必要的重渲染**：
   - 使用 `useCallback` 包裹事件处理函数
   - 使用 `useMemo` 计算派生状态

### 5.6 代码组织

**修改文件**：`src/components/settings/GeneralSetting.tsx`

**新增导入**：
```tsx
import { useState, useEffect, useCallback } from 'react';
import { Kbd } from '@heroui/react';
import { IoKeyOutline } from 'react-icons/io5';
import { showSuccess, showError, showWarning, showInfo } from '../../utils/notifications';
```

**新增辅助函数**：
- `isValidShortcut(shortcut: string): boolean`
- `formatKeyName(key: string): string` - 格式化键名

**状态添加**：
在 `GeneralSetting` 组件顶部添加：
```tsx
const [isRecording, setIsRecording] = useState(false);
const [currentKeys, setCurrentKeys] = useState<string>('');
const [pendingShortcut, setPendingShortcut] = useState<string>('');
```

## 6. 引用约定

### 6.1 user-conventions.md

- **2.1 命名规范**：
  - 事件处理函数以 `handle` 开头：`handleKeyDown` ✅
  - 异步函数以 `fetch`、`load` 或 `get` 开头：不适用
  - 布尔变量以 `is`、`has`、`can` 开头：`isRecording`、`isValid` ✅

- **2.3 React + TypeScript 特定约定**：
  - 组件使用函数式组件 + Hooks ✅
  - 禁止使用 `any` 类型 ✅

- **2.5 错误处理**：
  - 所有异步操作必须包含错误处理 ✅（try-catch包裹invoke调用）
  - API 调用失败必须显示友好的错误提示 ✅（使用showError）

- **5. 性能优化约定**：
  - 使用 React.memo 和 useMemo 优化重渲染 ⚠️ 需要考虑

### 6.2 project-conventions.md

- **2.4 用户交互规范**：
  - 应使用 Toast、Modal 或自定义对话框组件提供用户反馈 ✅（使用通知系统）
  - 错误提示应友好且包含可操作的解决方案 ✅

- **2.5 TypeScript 类型安全**：
  - 禁止使用 `as any` 类型断言 ✅
  - 应定义明确的接口类型 ✅

## 7. 测试要求

### 7.1 手动测试清单

- [ ] 点击"修改"按钮，进入录制模式
- [ ] 按下 Ctrl+Shift+A，确认显示正确的快捷键字符串
- [ ] 按下单独的 Ctrl 键，确认不会记录
- [ ] 点击"保存"按钮，确认快捷键更新
- [ ] 刷新页面，验证快捷键持久化
- [ ] 点击"取消"按钮，确认退出录制模式且不保存
- [ ] 在录制过程中点击窗口外部，确认自动取消

### 7.2 边界测试

- [ ] 尝试设置无效组合（如只有Ctrl），确认被拒绝
- [ ] 尝试设置黑名单组合（如Ctrl+Alt+Delete），确认被拒绝
- [ ] 快速连续按下多个键，确认只记录最后一次
- [ ] 在网络延迟情况下保存，确认有加载状态

### 7.3 跨平台测试

- [ ] Windows：测试 Ctrl、Alt、Win 键组合
- [ ] macOS：测试 Command、Option、Control 键组合
- [ ] Linux：测试 Ctrl、Alt、Super 键组合

## 8. 风险提示

### 8.1 技术风险（高）

1. **Tauri 后端命令可能不存在**
   - **风险等级**：🔴 高
   - **影响**：无法实际注册快捷键
   - **缓解措施**：
     1. 先检查 `src-tauri/src/` 目录下是否有相关命令
     2. 如果没有，需要先实现 Rust 后端命令
     3. 使用 `tauri::plugin::global_shortcut` 插件
   - **备选方案**：暂时只更新localStorage，标记TODO

2. **键盘事件捕获不准确**
   - **风险等级**：🟡 中
   - **影响**：快捷键字符串格式错误
   - **缓解措施**：
     1. 充分测试各种键组合
     2. 参考成熟的快捷键库（如 mousetrap.js）的实现
     3. 添加详细的日志输出便于调试

3. **与系统快捷键冲突**
   - **风险等级**：🟡 中
   - **影响**：用户设置的快捷键无法生效
   - **缓解措施**：
     1. 维护常见系统快捷键黑名单
     2. 在保存时尝试注册，捕获错误并提示用户
     3. 提供预设的安全快捷键列表

### 8.2 用户体验风险（中）

1. **录制过程可能让用户困惑**
   - **风险等级**：🟡 中
   - **影响**：用户不知道如何操作
   - **缓解措施**：
     1. 提供清晰的提示文本
     2. 显示当前按下的键
     3. 提供示例（如"例如：Ctrl+Shift+A"）

2. **保存失败没有明确反馈**
   - **风险等级**：🟢 低
   - **影响**：用户不知道是否成功
   - **缓解措施**：使用通知系统显示成功/失败消息

### 8.3 兼容性风险（低）

1. **不同浏览器的键盘事件差异**
   - **风险等级**：🟢 低
   - **影响**：某些键名可能不一致
   - **缓解措施**：
     1. 使用标准化的 `e.code` 而非 `e.key`
     2. 测试主流浏览器（Chrome、Firefox、Safari）
     3. 由于是Tauri应用，实际运行在WebView中，差异较小

## 9. 后续优化建议

1. **快捷键冲突检测**：
   - 扫描系统中已注册的快捷键
   - 实时提示是否冲突

2. **多快捷键支持**：
   - 允许为不同功能设置不同快捷键
   - 需要扩展数据结构和管理界面

3. **快捷键导入/导出**：
   - 支持JSON格式的配置导入导出
   - 方便用户备份和分享

4. **可视化快捷键编辑器**：
   - 拖拽式界面
   - 虚拟键盘展示

## 10. 下一步

由于此模块复杂度较高，建议在完成 Module 3（通知系统）后再实现，以便获得完整的用户反馈机制。如果后端命令尚未实现，需要优先开发后端功能。
