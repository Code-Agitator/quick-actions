# JSON Explorer 插件 - 功能概览

## 🎯 核心功能

### 1. 实时 JSON 解析
- ✅ 粘贴即解析，无需手动触发
- ✅ 即时错误提示，显示具体错误信息
- ✅ 支持所有合法 JSON 格式

### 2. 树形可视化
```
root
  ▶ name: "JSON Explorer"
  ▶ version: "1.0.0"
  ▶ features: Array(4)
    ▼ features
      ▶ 0: "Format"
      ▶ 1: "Minify"
      ▶ 2: "Copy"
      ▶ 3: "Path Access"
  ▶ config: Object{3}
    ▼ config
      ▶ theme: "modern"
      ▶ autoFormat: true
      ▶ maxDepth: 10
```

**交互特性**:
- 点击箭头展开/折叠（带旋转动画）
- 悬停显示快速操作按钮
- 缩进清晰展示层级关系
- 左侧边框线连接父子节点

### 3. 智能格式化
**Format 🎨 按钮**:
```json
// 压缩前
{"name":"test","value":123}

// 格式化后
{
  "name": "test",
  "value": 123
}
```

### 4. 压缩优化
**Minify 📦 按钮**:
- 移除所有空白字符
- 单行显示，减小体积
- 适合网络传输

### 5. 快速拷贝
**Copy 📋 按钮**:
- 拷贝当前格式的 JSON
- 保持缩进和换行

**Copy Escaped 🔐 按钮**:
```javascript
// 原始 JSON
{"key": "value"}

// 转义后
"{\"key\": \"value\"}"
```

适用场景：
- 嵌入 JavaScript 字符串
- 作为 API 参数传递
- 存储在配置文件中

### 6. JS 路径访问
**底部路径输入框**:

支持的路径格式：
```javascript
data.users[0].name        // 数组索引访问
config.theme              // 对象属性访问
stats.rating              // 嵌套属性
items[1].tags[2]          // 多层数组
```

操作流程：
1. 输入路径（如 `config.theme`）
2. 按 Enter 或点击 "Access & Copy 🎯"
3. 自动获取值并拷贝到剪贴板
4. 显示成功提示 "✓ Value Copied!"

错误处理：
- 路径不存在时显示错误信息
- 防止访问 null/undefined 的属性

## 🎨 UI/UX 设计

### 视觉风格
**配色方案**:
- 主色调: Blue → Indigo 渐变
- 背景: Slate-50 → Blue-50 → Indigo-50
- 文字: Gray-700 (主要), Gray-500 (次要)

**类型颜色编码**:
| 类型 | 颜色 | 示例 |
|------|------|------|
| String | 🟢 Green-600 | `"hello"` |
| Number | 🔵 Blue-600 | `123` |
| Boolean | 🟠 Orange-600 | `true` |
| Array | 🟣 Purple-600 | `Array(4)` |
| Object | ⚫ Gray-500 | `Object{3}` |
| Null | ⚫ Gray-500 | `null` |

### 布局结构
```
┌─────────────────────────────────────────┐
│  Header (毛玻璃效果)                      │
│  ┌───────┐  Title       [Load Example]  │
│  │  📋   │  Subtitle                    │
│  └───────┘                              │
│  [Format] [Minify] [Copy] [Escaped]     │
├──────────────────┬──────────────────────┤
│  Input Panel     │  Tree View Panel     │
│                  │                      │
│  ┌────────────┐  │  root                │
│  │ Textarea   │  │    ▶ name: "..."    │
│  │            │  │    ▶ version: "..." │
│  │            │  │    ▼ features       │
│  │            │  │        ▶ 0: "..."   │
│  │            │  │        ▶ 1: "..."   │
│  └────────────┘  │                      │
│  ⚠️ Error msg    │                      │
├──────────────────┴──────────────────────┤
│  JS Path: [input________] [Access&Copy] │
│                           ✓ Copied!     │
└─────────────────────────────────────────┘
```

### 交互动画
1. **展开/折叠**: 箭头旋转 90° (0.2s ease)
2. **悬停按钮**: 透明度 0 → 1 (0.15s)
3. **成功提示**: 脉冲动画 (pulse)
4. **按钮悬停**: 阴影增强 (shadow-lg)

### 响应式设计
- 双面板等宽布局（各占 50%）
- 垂直滚动支持大数据集
- 固定头部和底部，中间区域可滚动

## 💡 使用技巧

### 技巧 1: 快速验证 JSON
粘贴后立即查看是否有错误提示，无需外部工具。

### 技巧 2: 提取深层值
```javascript
// 复杂 JSON
{
  "response": {
    "data": {
      "users": [
        {"id": 1, "profile": {"name": "Alice"}}
      ]
    }
  }
}

// 快速提取
路径: response.data.users[0].profile.name
结果: "Alice" (自动拷贝)
```

### 技巧 3: 格式化对比
1. 粘贴压缩的 JSON
2. 点击 Format 查看结构
3. 编辑后点击 Minify 压缩
4. Copy 获取最终结果

### 技巧 4: 转义字符串
需要将 JSON 嵌入代码时：
```javascript
// 1. 粘贴 JSON
{"api_key": "secret123"}

// 2. 点击 "Copy Escaped"
// 3. 粘贴到代码
const config = "{\"api_key\": \"secret123\"}";
```

## 🔧 技术亮点

### 1. 递归渲染引擎
```typescript
interface JsonNode {
  key: string;
  value: any;
  path: string;      // 完整路径: "root.users.0.name"
  level: number;     // 缩进层级
}

function renderNode(node: JsonNode) {
  // 递归渲染子节点
  // 管理展开状态
  // 应用样式和交互
}
```

### 2. 路径解析算法
```typescript
// 输入: "data.users[0].name"
// 输出: ["data", "users", "0", "name"]

const pathParts = accessPath
  .replace(/\[(\w+)\]/g, '.$1')  // array[0] → array.0
  .split('.')
  .filter(Boolean);

// 安全访问
let result = jsonData;
for (const part of pathParts) {
  result = result[part];
}
```

### 3. 状态管理
```typescript
// 使用 Set 高效管理展开状态
const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

// 切换展开
const toggleExpand = (path: string) => {
  const newExpanded = new Set(expandedPaths);
  if (newExpanded.has(path)) {
    newExpanded.delete(path);
  } else {
    newExpanded.add(path);
  }
  setExpandedPaths(newExpanded);
};
```

### 4. 性能优化
- **useCallback**: 避免不必要的函数重建
- **条件渲染**: 只渲染可见节点
- **事件委托**: 减少事件监听器数量
- **防抖解析**: 输入延迟 300ms 后解析（可扩展）

## 📊 数据流

```
用户输入 JSON
    ↓
parseJson() 解析
    ↓
┌───────────┬────────────┐
│  成功      │  失败       │
│           │            │
│ setParsed │ setError   │
│ setExpanded│           │
└───────────┴────────────┘
    ↓
renderJsonNode() 递归渲染
    ↓
用户交互 (展开/拷贝/访问)
    ↓
更新状态 / 调用 API
```

## 🚀 扩展建议

### 短期优化
1. **搜索功能**: 高亮匹配的键/值
2. **撤销/重做**: 编辑历史记录
3. **导入/导出**: 文件操作
4. **主题切换**: 深色模式

### 长期规划
1. **JSON Schema**: 验证和自动补全
2. **Diff 视图**: 对比两个 JSON
3. **TypeScript 生成**: 自动生成接口定义
4. **图表可视化**: 饼图/柱状图展示数据
5. **协作编辑**: 多人实时编辑

## 📝 最佳实践

### ✅ 推荐做法
- 使用 Load Example 快速熟悉界面
- 利用 JS 路径快速提取深层值
- 格式化后再进行人工审查
- 使用转义拷贝嵌入代码

### ❌ 避免事项
- 不要粘贴超大 JSON (>10MB)，可能卡顿
- 不要在路径中使用特殊字符
- 不要依赖浏览器自动保存（无持久化）

---

**JSON Explorer** - 让 JSON 处理变得简单优雅 ✨
