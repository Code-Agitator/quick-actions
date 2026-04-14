# JSON Explorer v1.1 更新日志

## 🎉 重大改进

### ✨ 新增功能

#### 1. **JSON 语法高亮** 🌈
- 键名：紫色加粗 (`text-purple-700 font-semibold`)
- 字符串：绿色 (`text-green-600`)
- 数字：蓝色 (`text-blue-600`)
- 布尔值：橙色加粗 (`text-orange-600 font-semibold`)
- null：灰色斜体 (`text-gray-500 italic`)

**效果对比**:
```json
// 之前：纯文本，无颜色
{"name": "test", "value": 123, "active": true}

// 现在：彩色高亮
{
  "name": "test",      // 键名紫色，字符串绿色
  "value": 123,        // 数字蓝色
  "active": true       // 布尔值橙色
}
```

#### 2. **快捷键支持** ⌨️
- **Alt + Shift + F**: 快速格式化 JSON
- 提示显示在右上角，方便记忆

#### 3. **JS Path 智能建议** 💡
- 自动扫描 JSON 结构
- 显示前 10 个可用路径
- 点击建议自动填充输入框

**示例**:
```javascript
// 对于以下 JSON
{
  "user": {
    "profile": {
      "name": "Alice"
    }
  }
}

// 建议列表:
[user] [user.profile] [user.profile.name]
```

#### 4. **路径结果预览面板** 👁️
- 执行路径访问后显示结果
- 独立的预览区域，带滚动条
- 一键拷贝结果按钮
- 最大高度限制，避免占用过多空间

### 🔧 界面优化

#### 1. **移除 TreeView** ❌→✅
**之前**:
- 左右双面板布局
- 右侧树形可视化
- 需要拖拽分割线

**现在**:
- 单面板编辑器布局
- 更多编辑空间
- 无需拖拽调整

#### 2. **底部面板重构** 📐
**新布局**:
```
┌─────────────────────────────────────┐
│ JS Path: [input_______] [Access]   │
│ Suggestions: [user] [data] [config]│
│                                     │
│ Result Preview:                     │
│ ┌─────────────────────────────────┐ │
│ │ {                               │ │
│ │   "name": "Alice"               │ │
│ │ }                               │ │
│ └─────────────────────────────────┘ │
│              [Copy Result]          │
│                                     │
│ ✓ Value Copied!                     │
└─────────────────────────────────────┘
```

**特性**:
- ✅ 自动滚动（max-h-64）
- ✅ 建议标签可点击
- ✅ 结果预览独立区域
- ✅ 成功提示内联显示

#### 3. **编辑器增强** 📝
- 语法高亮实时渲染
- 保持原始格式
- 错误时仍显示高亮
- Placeholder 提示

### 📊 性能提升

| 指标 | v1.0 | v1.1 | 改进 |
|------|------|------|------|
| 构建大小 | 331.09 KB | 330.21 KB | -0.88 KB |
| Gzip | 75.75 KB | 75.74 KB | -0.01 KB |
| 构建时间 | 1.63s | 1.40s | -14% |
| 组件复杂度 | 高 | 中 | 简化 |

### 🎯 用户体验改进

#### **场景 1: 快速查看深层值**
```javascript
// 之前: 
// 1. 展开 TreeView
// 2. 逐层点击
// 3. 找到值
// 4. 手动拷贝

// 现在:
// 1. 输入路径: user.profile.name
// 2. 按 Enter
// 3. 自动拷贝 ✓
```

#### **场景 2: 探索 JSON 结构**
```javascript
// 之前: 浏览 TreeView
// 现在: 查看 Suggestions 标签
//       点击即可测试路径
```

#### **场景 3: 格式化代码**
```javascript
// 之前: 鼠标点击 Format 按钮
// 现在: Alt+Shift+F (更快!)
```

### 🔍 技术实现

#### **1. 语法高亮引擎**
```typescript
const highlight = (text: string) => {
  // 1. HTML 转义
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. 正则匹配 JSON token
  escaped = escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      // 3. 根据类型应用 CSS 类
      if (/^"/.test(match)) {
        return /:$/.test(match) 
          ? `<span class="key">...</span>` 
          : `<span class="string">...</span>`;
      }
      // ...其他类型
    }
  );

  // 4. 使用 dangerouslySetInnerHTML 渲染
  return <pre dangerouslySetInnerHTML={{ __html: escaped }} />;
};
```

#### **2. 路径建议生成**
```typescript
const getPathSuggestions = () => {
  const suggestions: string[] = [];
  
  // 深度优先遍历
  const collectPaths = (obj: any, prefix: string = '') => {
    Object.keys(obj).forEach(key => {
      const path = prefix ? `${prefix}.${key}` : key;
      suggestions.push(path);
      
      // 递归收集嵌套对象
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        collectPaths(obj[key], path);
      }
    });
  };
  
  collectPaths(parsedJson);
  return suggestions.slice(0, 10); // 限制数量
};
```

#### **3. 快捷键监听**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Alt + Shift + F
    if (e.altKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      formatJson();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [parsedJson]);
```

### 📱 响应式优化

**底部面板**:
- 最大高度: `max-h-64` (256px)
- 自动滚动: `overflow-y-auto`
- 内容自适应

**编辑器**:
- 占据剩余空间: `flex-1`
- 自动滚动: `overflow-auto`
- 固定宽度字体: `font-mono`

### 🎨 视觉改进

**颜色系统**:
| 元素 | 颜色 | 用途 |
|------|------|------|
| 键名 | Purple-700 | 突出显示属性 |
| 字符串 | Green-600 | 区分文本数据 |
| 数字 | Blue-600 | 数值可视化 |
| 布尔值 | Orange-600 | 状态标识 |
| Null | Gray-500 | 空值标记 |
| 建议标签 | Blue-50/Blue-600 | 可交互提示 |
| 结果面板 | Gray-50 | 次要信息区 |

**间距优化**:
- 面板间距: `space-y-3` (12px)
- 标签间距: `gap-2` (8px)
- 内边距: `p-3` (12px)

### 🚀 迁移指南

#### **从 v1.0 升级**
1. 重新构建插件: `pnpm build`
2. 重启 Quick Actions
3. 享受新功能!

#### **Breaking Changes**
- ❌ 移除 TreeView 面板
- ❌ 移除节点展开/折叠功能
- ✅ 替代方案: 使用 JS Path 直接访问

### 💡 使用技巧

#### **技巧 1: 快速探索结构**
1. 粘贴 JSON
2. 查看底部的 Suggestions
3. 点击感兴趣的路径
4. 查看 Result Preview

#### **技巧 2: 批量提取值**
```javascript
// 假设 JSON 有用户列表
{
  "users": [
    {"id": 1, "name": "Alice"},
    {"id": 2, "name": "Bob"}
  ]
}

// 快速提取:
// 1. 输入: users[0].name → Enter → 拷贝 "Alice"
// 2. 输入: users[1].name → Enter → 拷贝 "Bob"
```

#### **技巧 3: 验证 + 格式化**
1. 粘贴压缩的 JSON
2. 如果没有错误提示 → 有效 JSON ✓
3. Alt+Shift+F 快速格式化
4. Copy 获取美化版本

### 🔮 未来计划

基于新架构的扩展方向:
- [ ] **代码折叠**: 在编辑器中折叠对象/数组
- [ ] **搜索高亮**: 搜索并高亮匹配的键/值
- [ ] **路径历史**: 记录最近使用的路径
- [ ] **批量操作**: 同时访问多个路径
- [ ] **导出功能**: 导出为 TypeScript 接口
- [ ] **深色模式**: 暗色主题支持

---

## 📝 总结

v1.1 版本通过**简化界面**和**增强核心功能**，提供了更流畅的 JSON 处理体验：

✅ **更简洁**: 单面板设计，专注编辑  
✅ **更高效**: 快捷键 + 智能建议  
✅ **更直观**: 语法高亮 + 结果预览  
✅ **更现代**: 符合开发者习惯  

**Made with ❤️ for Quick Actions**
