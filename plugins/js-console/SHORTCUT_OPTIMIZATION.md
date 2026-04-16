# 快捷键优化说明

## 🎯 优化目标

使 js-console 插件的快捷键更符合开发者习惯，与主流 IDE（VS Code）和浏览器控制台保持一致。

## 📋 优化前后对比

### 1. 代码执行快捷键

#### ❌ 优化前的问题
- **Enter键行为混乱**：
  - 单行模式：Enter执行代码
  - 多行模式：Enter换行，Shift+Enter执行
  - 问题：与主流IDE习惯不一致，用户容易混淆

- **Shift+Enter行为不一致**：
  - 单行模式：执行代码
  - 多行模式：执行代码
  - 问题：在单行模式下，用户可能期望Shift+Enter换行

#### ✅ 优化后
```javascript
// Ctrl/Cmd + Enter: 始终执行代码（最常用操作，推荐）
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
  executeCodeRef.current();
});

// Shift + Enter: 在多行模式下执行，单行模式下换行
editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
  if (isMultiLine) {
    executeCodeRef.current();
  }
  // 单行模式：不拦截，让 Monaco 默认行为（换行）生效
});

// Enter: 根据模式决定行为
editor.addCommand(monaco.KeyCode.Enter, () => {
  if (!isMultiLine) {
    // 单行模式：Enter 执行代码（类似浏览器控制台）
    executeCodeRef.current();
  }
  // 多行模式：不拦截，让 Monaco 默认行为（换行）生效
});
```

**优势**：
- ✅ `Ctrl+Enter` 始终执行代码，符合大多数IDE习惯
- ✅ 单行模式下，Enter执行代码（类似浏览器控制台）
- ✅ 多行模式下，Enter换行（符合编辑器习惯）
- ✅ Shift+Enter在多行模式下执行代码（提供备选方案）

### 2. 命令历史导航

#### ❌ 优化前的问题
- **上下箭头被占用**：
  - 无法在编辑器中正常使用上下箭头移动光标
  - 严重影响多行代码编辑体验

#### ✅ 优化后
```javascript
// Ctrl + Up/Down: 浏览命令历史（不干扰光标移动）
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.UpArrow, () => {
  if (history.length > 0) {
    const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
    setHistoryIndex(newIndex);
    setCode(history[newIndex]);
    // 将光标移到末尾
    const model = editor.getModel();
    if (model) {
      const lineCount = model.getLineCount();
      const lastColumn = model.getLineMaxColumn(lineCount);
      editor.setPosition({ lineNumber: lineCount, column: lastColumn });
    }
  }
});

editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.DownArrow, () => {
  // ... 类似的逻辑
});
```

**优势**：
- ✅ 上下箭头可以正常移动光标
- ✅ 使用 `Ctrl+↑/↓` 浏览历史，不冲突
- ✅ 自动将光标移到末尾，方便继续编辑

### 3. 新增标准IDE快捷键

#### ✅ 新增功能

```javascript
// Ctrl + L: 清空控制台（浏览器控制台标准快捷键）
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL, () => {
  clearConsole();
});

// Ctrl + K: 清空编辑器内容
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
  setCode('');
  editor.focus();
});

// Ctrl + D: 复制当前行（VS Code标准快捷键）
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, () => {
  const action = editor.getAction('editor.action.copyLinesDownAction');
  if (action) action.run();
});

// Alt + Up/Down: 移动行（VS Code标准快捷键）
editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.UpArrow, () => {
  const action = editor.getAction('editor.action.moveLinesUpAction');
  if (action) action.run();
});

editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.DownArrow, () => {
  const action = editor.getAction('editor.action.moveLinesDownAction');
  if (action) action.run();
});
```

**优势**：
- ✅ `Ctrl+L` 清空控制台 - 与Chrome DevTools一致
- ✅ `Ctrl+K` 清空编辑器 - 快速重新开始
- ✅ `Ctrl+D` 复制行 - VS Code标准快捷键
- ✅ `Alt+↑/↓` 移动行 - VS Code标准快捷键

## 📊 完整快捷键列表

### 核心操作
| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `Ctrl/Cmd + Enter` | 执行代码 | **推荐**，始终执行代码 |
| `Enter` | 执行/换行 | 单行模式执行，多行模式换行 |
| `Shift + Enter` | 执行/换行 | 多行模式执行，单行模式换行 |

### 编辑操作
| 快捷键 | 功能 | 来源 |
|--------|------|------|
| `Ctrl/Cmd + D` | 复制当前行 | VS Code |
| `Alt + ↑/↓` | 移动当前行 | VS Code |
| `Shift + Alt + F` | 格式化代码 | VS Code |
| `Ctrl/Cmd + /` | 注释/取消注释 | VS Code |

### 管理操作
| 快捷键 | 功能 | 来源 |
|--------|------|------|
| `Ctrl/Cmd + L` | 清空控制台 | Chrome DevTools |
| `Ctrl/Cmd + K` | 清空编辑器 | 自定义 |
| `Ctrl/Cmd + ↑/↓` | 浏览命令历史 | 自定义 |

### Monaco Editor 内置快捷键
以下快捷键由 Monaco Editor 自动提供，无需额外配置：
- `Ctrl/Cmd + Z` - 撤销
- `Ctrl/Cmd + Y` 或 `Ctrl/Cmd + Shift + Z` - 重做
- `Ctrl/Cmd + C` - 复制
- `Ctrl/Cmd + V` - 粘贴
- `Ctrl/Cmd + X` - 剪切
- `Ctrl/Cmd + A` - 全选
- `Ctrl/Cmd + F` - 查找
- `Ctrl/Cmd + H` - 替换
- `Tab` - 缩进
- `Shift + Tab` - 减少缩进

## 🎨 用户体验改进

### 1. 底部状态栏提示更新
```javascript
// 多行模式
'Ctrl+Enter: Execute • Shift+Enter: Execute • Enter: New line • Ctrl+↑↓: History • Ctrl+L: Clear Console'

// 单行模式
'Enter: Execute • Ctrl+Enter: Execute • Shift+Enter: New line • Ctrl+↑↓: History • Ctrl+L: Clear Console'
```

### 2. 编辑器顶部提示更新
```javascript
// 多行模式
'Multi-line mode (Enter for new line)'

// 单行模式
'Single-line mode (Enter to execute)'
```

## 🔄 兼容性说明

### 向后兼容
- ✅ 保留了原有的 `Ctrl+Enter` 执行代码功能
- ✅ 单行模式下 `Enter` 仍然执行代码（浏览器控制台风格）
- ✅ 所有原有功能保持不变

### 破坏性变更
- ⚠️ 上下箭头不再用于浏览历史，改为 `Ctrl+↑/↓`
  - **理由**：上下箭头在编辑器中移动光标是基本需求
  - **迁移**：用户需要使用 `Ctrl+↑/↓` 浏览历史

## 💡 设计理念

### 1. 遵循最小惊讶原则
- 使用开发者熟悉的快捷键（VS Code、Chrome DevTools）
- 避免自定义不常见的快捷键组合

### 2. 优先级设计
- **最高频操作**（执行代码）：提供最便捷的快捷键 `Ctrl+Enter`
- **高频操作**（清空、复制）：使用标准IDE快捷键
- **低频操作**（历史浏览）：使用修饰键组合

### 3. 模式感知
- 单行模式：更像浏览器控制台，Enter执行
- 多行模式：更像代码编辑器，Enter换行

### 4. 不干扰基本编辑
- 保留所有Monaco Editor内置快捷键
- 不占用基本的方向键、选择键等

## 📝 测试建议

### 基础功能测试
1. ✅ 单行模式下按Enter执行代码
2. ✅ 多行模式下按Enter换行
3. ✅ 两种模式下按Ctrl+Enter都能执行代码
4. ✅ 多行模式下按Shift+Enter执行代码

### 历史记录测试
1. ✅ 按Ctrl+↑浏览上一条历史
2. ✅ 按Ctrl+↓浏览下一条历史
3. ✅ 在编辑器中按↑↓能正常移动光标

### 新增功能测试
1. ✅ 按Ctrl+L清空控制台
2. ✅ 按Ctrl+K清空编辑器
3. ✅ 按Ctrl+D复制当前行
4. ✅ 按Alt+↑/↓移动当前行

### 兼容性测试
1. ✅ 所有Monaco内置快捷键正常工作
2. ✅ 代码格式化、注释等功能正常
3. ✅ 自动补全、括号匹配等功能正常

## 🎯 总结

本次快捷键优化主要解决了以下问题：
1. ✅ 消除了Enter键行为的混乱
2. ✅ 释放了上下箭头用于光标移动
3. ✅ 添加了标准IDE快捷键
4. ✅ 提供了清晰的快捷键提示
5. ✅ 保持了向后兼容性

优化后的快捷键系统更加符合开发者习惯，提高了工作效率和用户体验。
