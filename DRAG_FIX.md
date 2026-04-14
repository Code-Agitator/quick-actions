# 窗口拖拽修复说明

## 🐛 问题描述

所有窗体无法进行拖拽移动。

## 🔍 原因分析

Tauri 应用使用无边框窗口模式（`decorations: false`）时，需要手动添加 `data-tauri-drag-region` 属性来指定可拖拽区域。

### 受影响的窗口

1. **主窗口** (Main Window) - Quick Actions 搜索框
2. **插件窗口** (Plugin Windows) - JSON Explorer 等插件界面

## ✅ 修复方案

### 1. 主窗口修复

**文件**: `src/App.tsx`

**修改位置**: 最外层容器 div

```tsx
<div 
  className="h-screen flex flex-col overflow-hidden bg-transparent" 
  style={{ 
    borderRadius: '28px',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale'
  }}
  data-tauri-drag-region  // ✅ 添加此属性
>
```

**效果**: 
- 整个主窗口背景区域都可拖拽
- 包括搜索框周围的空白区域
- 保持输入框等其他交互元素正常工作

---

### 2. JSON Explorer 插件修复

**文件**: `plugins/json-explorer/src/App.tsx`

**修改位置**: Header 区域

```tsx
{/* Header */}
<div 
  className="bg-white/80 backdrop-blur-lg border-b border-gray-200 px-6 py-4 shadow-sm select-none"
  data-tauri-drag-region  // ✅ 添加此属性
>
```

**额外优化**:
- 添加 `select-none` 类，防止拖拽时选中文本
- Header 区域是理想的拖拽区域（非交互元素集中区）

**效果**:
- 顶部标题栏可拖拽
- 工具栏按钮仍可正常点击
- Monaco Editor 编辑区域不受影响

---

### 3. 其他插件窗口

**文件**: `src/components/PluginUI.tsx`

**状态**: ✅ 已有拖拽支持（第135行）

```tsx
<div 
  className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-transparent backdrop-blur-xl select-none"
  data-tauri-drag-region  // ✅ 已存在
>
```

---

## 📋 Tauri 拖拽机制

### 工作原理

```html
<!-- 任何带有此属性的元素都可作为拖拽手柄 -->
<div data-tauri-drag-region>
  拖拽我移动窗口
</div>
```

### 最佳实践

1. **选择合适区域**:
   - ✅ Header/标题栏
   - ✅ 工具栏空白区域
   - ✅ 背景容器
   - ❌ 按钮、输入框等交互元素

2. **添加样式**:
   ```css
   .draggable {
     user-select: none;  /* 防止文本选择 */
     cursor: default;    /* 或 cursor: move */
   }
   ```

3. **避免冲突**:
   - 不要在可编辑区域添加
   - 不要在滚动区域添加
   - 确保子元素的交互功能正常

---

## 🎯 测试验证

### 测试步骤

1. **启动应用**:
   ```bash
   pnpm tauri dev
   ```

2. **测试主窗口**:
   - 呼出 Quick Actions (默认快捷键)
   - 在搜索框周围空白区域按住鼠标左键
   - 拖动窗口 → ✅ 应该可以移动

3. **测试 JSON Explorer**:
   - 搜索 "json" 打开插件
   - 在顶部 Header 区域按住鼠标左键
   - 拖动窗口 → ✅ 应该可以移动

4. **测试其他插件**:
   - 打开任意插件窗口
   - 在标题栏拖动 → ✅ 应该可以移动

### 预期行为

| 窗口 | 可拖拽区域 | 不可拖拽区域 |
|------|-----------|-------------|
| **主窗口** | 整个背景区域 | 输入框、按钮 |
| **JSON Explorer** | Header 标题栏 | 编辑器、输入框、按钮 |
| **其他插件** | Header 标题栏 | 内容区域、交互元素 |

---

## 🔧 技术细节

### Tauri 配置

```json
{
  "app": {
    "windows": [
      {
        "label": "main",
        "decorations": false,  // 无边框模式
        "transparent": true,   // 透明背景
        // ...
      }
    ]
  }
}
```

**关键点**:
- `decorations: false` → 需要自定义拖拽
- `transparent: true` → 支持毛玻璃效果
- 两者结合时必须使用 `data-tauri-drag-region`

### CSS 样式

```css
/* 推荐的拖拽区域样式 */
[data-tauri-drag-region] {
  user-select: none;      /* 防止文本选择 */
  -webkit-app-region: drag; /* Electron 兼容（可选）*/
}

/* 子元素如果需要交互，重置 */
[data-tauri-drag-region] button,
[data-tauri-drag-region] input {
  user-select: text;
  -webkit-app-region: no-drag;
}
```

---

## 📝 开发指南

### 为新插件添加拖拽支持

如果你的插件也需要拖拽，遵循以下步骤：

1. **确定拖拽区域**:
   - 通常是 Header 或标题栏
   - 避免覆盖交互元素

2. **添加属性**:
   ```tsx
   <div 
     className="your-header-styles select-none"
     data-tauri-drag-region
   >
     {/* Header 内容 */}
   </div>
   ```

3. **测试**:
   - 构建插件: `pnpm build`
   - 在主应用中打开插件
   - 尝试拖拽 Header

### 示例模板

```tsx
export function MyPlugin() {
  return (
    <div className="h-screen flex flex-col">
      {/* 可拖拽的 Header */}
      <header 
        className="p-4 bg-gray-100 select-none"
        data-tauri-drag-region
      >
        <h1>My Plugin</h1>
      </header>
      
      {/* 内容区域（不可拖拽）*/}
      <main className="flex-1 p-4">
        {/* 插件内容 */}
      </main>
    </div>
  );
}
```

---

## ⚠️ 注意事项

### 常见问题

1. **拖拽不生效**:
   - 检查是否添加了 `data-tauri-drag-region`
   - 确认窗口配置 `decorations: false`
   - 重启应用使更改生效

2. **子元素无法点击**:
   - 确保按钮/输入框不在拖拽区域内
   - 或使用 CSS 重置: `-webkit-app-region: no-drag`

3. **文本被选中**:
   - 添加 `select-none` 或 `user-select: none`
   - 或在拖拽区域禁用文本选择

### 性能考虑

- `data-tauri-drag-region` 不会显著影响性能
- 避免在大面积复杂 DOM 上使用
- 优先选择简单的矩形区域

---

## 🚀 总结

✅ **主窗口**: 整个背景可拖拽  
✅ **JSON Explorer**: Header 可拖拽  
✅ **其他插件**: Header 可拖拽（已有）  

**修复完成！所有窗口现在都可以正常拖拽移动了。** 🎉

---

**最后更新**: 2026-04-03  
**相关 PR**: 窗口拖拽修复  
**影响范围**: 所有无边框窗口
