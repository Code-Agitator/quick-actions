# 特殊对象统一处理机制

## 🎯 设计理念

为了解决 JavaScript 内置对象（如 `Date`、`URL`、`Map`、`Set` 等）的特殊显示和拷贝需求，我们设计了一个**可扩展的处理器注册表模式**。

## 🏗️ 架构设计

### 核心接口

```typescript
interface SpecialObjectHandler {
  // 检测是否是该类型的对象
  test: (value: any) => boolean;
  
  // 获取显示类型名称（用于 CSS 类名）
  getTypeName: (value: any) => string;
  
  // 格式化显示文本（变量面板中显示的内容）
  formatDisplay: (value: any) => string;
  
  // 格式化拷贝内容（点击拷贝按钮时的内容）
  formatCopy: (value: any) => string;
  
  // 是否应该展开子属性（默认 false）
  shouldExpand?: boolean;
}
```

### 处理器注册表

```typescript
const specialObjectHandlers: SpecialObjectHandler[] = [
  // 在这里注册所有特殊对象处理器
];

// 查找匹配的处理器
const findSpecialHandler = (value: any): SpecialObjectHandler | null => {
  return specialObjectHandlers.find(handler => handler.test(value)) || null;
};
```

## 📦 已支持的对象类型

### 1. Date 对象 📅

```typescript
{
  test: (value) => value instanceof Date,
  getTypeName: () => 'date',
  formatDisplay: (value) => value.toISOString(),
  formatCopy: (value) => value.toISOString(),
}
```

**示例**:
```javascript
let now = new Date();
// 显示: 2026-04-16T08:16:21.411Z (青色)
// 拷贝: 2026-04-16T08:16:21.411Z
```

### 2. RegExp 对象 🔤

```typescript
{
  test: (value) => value instanceof RegExp,
  getTypeName: () => 'regexp',
  formatDisplay: (value) => value.toString(),
  formatCopy: (value) => value.toString(),
}
```

**示例**:
```javascript
let pattern = /hello/gi;
// 显示: /hello/gi (粉色)
// 拷贝: /hello/gi
```

### 3. Error 对象 ❌

```typescript
{
  test: (value) => value instanceof Error,
  getTypeName: (value) => value.name.toLowerCase(),
  formatDisplay: (value) => `${value.name}: ${value.message}`,
  formatCopy: (value) => `${value.name}: ${value.message}\n${value.stack || ''}`,
}
```

**示例**:
```javascript
let error = new Error('Test error');
// 显示: Error: Test error (红色)
// 拷贝: Error: Test error\n    at <stack trace>
```

### 4. URL 对象 🔗 (新增)

```typescript
{
  test: (value) => value instanceof URL,
  getTypeName: () => 'url',
  formatDisplay: (value) => value.href,
  formatCopy: (value) => value.href,
}
```

**示例**:
```javascript
let url = new URL('https://example.com/path?query=1');
// 显示: https://example.com/path?query=1 (靛蓝色)
// 拷贝: https://example.com/path?query=1
```

### 5. Map 对象 🗺️ (新增)

```typescript
{
  test: (value) => value instanceof Map,
  getTypeName: () => 'map',
  formatDisplay: (value) => `Map(${value.size})`,
  formatCopy: (value) => JSON.stringify(Array.from(value.entries()), null, 2),
  shouldExpand: true,  // 允许展开查看键值对
}
```

**示例**:
```javascript
let map = new Map([
  ['name', 'Alice'],
  ['age', 25]
]);
// 显示: Map(2) (紫罗兰色)
// 展开后:
//   ▼ Map(2)
//     ├─ [0]: { key: "name", value: "Alice" }
//     └─ [1]: { key: "age", value: 25 }
// 拷贝: [
//         ["name", "Alice"],
//         ["age", 25]
//       ]
```

### 6. Set 对象 📚 (新增)

```typescript
{
  test: (value) => value instanceof Set,
  getTypeName: () => 'set',
  formatDisplay: (value) => `Set(${value.size})`,
  formatCopy: (value) => JSON.stringify(Array.from(value), null, 2),
  shouldExpand: true,  // 允许展开查看元素
}
```

**示例**:
```javascript
let set = new Set([1, 2, 3]);
// 显示: Set(3) (紫红色)
// 展开后:
//   ▼ Set(3)
//     ├─ [0]: 1
//     ├─ [1]: 2
//     └─ [2]: 3
// 拷贝: [1, 2, 3]
```

## 🎨 颜色方案

| 类型 | 颜色 | 示例 |
|------|------|------|
| String | 🟢 绿色 | `"hello"` |
| Number | 🔵 蓝色 | `42` |
| Boolean | 🟠 橙色 | `true` |
| Function | 🟡 黄色 | `[Function: name]` |
| Date | 🔷 青色 | `2026-04-16T...` |
| RegExp | 🌸 粉色 | `/pattern/` |
| Error | 🔴 红色 | `Error: msg` |
| **URL** | **🔵 靛蓝** | `https://...` |
| **Map** | **🟣 紫罗兰** | `Map(2)` |
| **Set** | **💜 紫红** | `Set(3)` |

## ➕ 如何添加新类型

### 步骤 1: 定义处理器

在 `specialObjectHandlers` 数组中添加新的处理器对象：

```typescript
{
  test: (value) => value instanceof YourType,
  getTypeName: (value) => 'yourtype',
  formatDisplay: (value) => /* 显示格式 */,
  formatCopy: (value) => /* 拷贝格式 */,
  shouldExpand: false,  // 可选
}
```

### 步骤 2: 添加颜色样式

在渲染变量的 `<span>` 标签中添加颜色类：

```typescript
variable.type === 'yourtype' ? 'text-yourcolor-600 dark:text-yourcolor-400' :
```

### 示例：添加 Promise 支持

```typescript
// 1. 添加处理器
{
  test: (value) => value instanceof Promise,
  getTypeName: () => 'promise',
  formatDisplay: (value) => 'Promise {<pending>}',
  formatCopy: (value) => '[Promise]',
}

// 2. 添加颜色
variable.type === 'promise' ? 'text-gray-500 dark:text-gray-500' :
```

## 🔧 工作流程

### 变量分析流程

```
analyzeValue(name, value)
  ↓
findSpecialHandler(value)
  ↓
找到处理器？
  ├─ 是 → 使用 handler.getTypeName()
  │        如果 shouldExpand，生成 children
  │
  └─ 否 → 使用 typeof value
           如果是普通对象，展开属性
```

### 格式化显示流程

```
formatValue(value)
  ↓
findSpecialHandler(value)
  ↓
找到处理器？
  ├─ 是 → 返回 handler.formatDisplay(value)
  │
  └─ 否 → 使用默认逻辑
           (null, undefined, string, function, object...)
```

### 拷贝流程

```
点击拷贝按钮
  ↓
findSpecialHandler(variable.value)
  ↓
找到处理器？
  ├─ 是 → 拷贝 handler.formatCopy(value)
  │
  └─ 否 → 使用 JSON.stringify 或 String()
```

## 💡 优势

### 1. **可扩展性** ⭐
- 添加新类型只需在注册表中添加一个对象
- 无需修改核心逻辑

### 2. **一致性**
- 所有特殊对象使用相同的处理流程
- 显示和拷贝逻辑集中管理

### 3. **灵活性**
- 每个处理器可以自定义显示和拷贝格式
- 可以选择是否展开子属性

### 4. **易维护**
- 处理器之间互不影响
- 清晰的职责分离

## 📊 对比旧方案

### 旧方案 ❌
```typescript
// 分散的 if-else 判断
if (value instanceof Date) { ... }
else if (value instanceof RegExp) { ... }
else if (value instanceof Error) { ... }
// ... 每添加一个类型就要修改多处代码
```

### 新方案 ✅
```typescript
// 统一的处理器注册表
const specialObjectHandlers = [
  { test: ..., formatDisplay: ..., formatCopy: ... },
  { test: ..., formatDisplay: ..., formatCopy: ... },
  // 添加新类型只需追加一项
];
```

## 🚀 未来扩展

可以轻松添加更多类型：

- **Promise** - 显示状态（pending/resolved/rejected）
- **Symbol** - 显示描述
- **BigInt** - 特殊格式化
- **ArrayBuffer** - 显示字节长度
- **TypedArray** - 显示类型和长度
- **WeakMap/WeakSet** - 特殊提示（无法枚举）
- **Custom Classes** - 用户自定义类的特殊处理

## 📝 完整示例

```typescript
// 添加 ArrayBuffer 支持
{
  test: (value) => value instanceof ArrayBuffer,
  getTypeName: () => 'arraybuffer',
  formatDisplay: (value) => `ArrayBuffer(${value.byteLength} bytes)`,
  formatCopy: (value) => `[ArrayBuffer: ${value.byteLength} bytes]`,
}

// 添加颜色
variable.type === 'arraybuffer' ? 'text-slate-600 dark:text-slate-400' :
```

---

通过这个统一的处理器机制，我们可以轻松支持任何 JavaScript 内置对象，保持代码的整洁和可维护性！🎉
