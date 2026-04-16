# 数据拷贝功能说明

## 🎯 新增功能

JS Console 现已支持完整的数据拷贝功能，可以方便地复制控制台输出和变量值到剪贴板。

## ✨ 功能特性

### 1. 单行拷贝 📋

#### 控制台输出拷贝
- **触发方式**: 鼠标悬停在任意输出行上，点击右侧出现的 📋 按钮
- **拷贝内容**: 该行的完整输出内容（不含时间戳）
- **适用场景**: 快速复制特定的日志、错误或结果

![Console Copy](https://via.placeholder.com/400x100?text=Hover+to+see+copy+button)

#### 变量值拷贝
- **触发方式**: 鼠标悬停在任意变量行上，点击右侧出现的 📋 按钮
- **拷贝内容**: 
  - 简单类型：直接拷贝值的字符串表示
  - 对象/数组：拷贝格式化后的 JSON（2空格缩进）
- **适用场景**: 复制变量值用于调试或分享

### 2. 批量拷贝 📑

#### 拷贝所有控制台输出
- **位置**: 控制台输出区域右上角的 "Copy All" 按钮
- **格式**: `[时间戳] 内容` 每行一条
- **示例**:
  ```
  [10:30:15] Hello, World!
  [10:30:16] Number: 42
  [10:30:17] Error: Something went wrong
  ```

#### 拷贝所有变量
- **位置**: 变量预览区域右上角的 "Copy All" 按钮
- **格式**: `变量名 = 值` 每行一个
- **示例**:
  ```
  name = "Alice"
  age = 25
  user = {
    "name": "Alice",
    "age": 25
  }
  ```

## 💡 使用场景

### 场景 1: 调试 API 响应
```javascript
const response = await fetch('/api/users');
const data = await response.json();
console.log(data);
```
👉 悬停在输出行上，点击 📋 拷贝完整的 JSON 数据

### 场景 2: 分享错误信息
```javascript
try {
  // 一些可能出错的代码
} catch (error) {
  console.error(error.message);
}
```
👉 点击 "Copy All" 拷贝所有错误日志，方便向同事求助

### 场景 3: 导出数据
```javascript
const users = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" }
];
```
👉 在变量面板中展开 `users`，点击 📋 拷贝格式化后的 JSON

### 场景 4: 记录测试结果
```javascript
const testResults = {
  passed: 42,
  failed: 3,
  skipped: 5
};
console.log('Test completed:', testResults);
```
👉 点击 "Copy All" 保存完整的测试报告

## 🎨 UI 设计

### 交互细节

1. **悬停显示** 
   - 拷贝按钮默认隐藏（`opacity-0`）
   - 鼠标悬停时淡入显示（`group-hover:opacity-100`）
   - 平滑过渡动画（`transition-all`）

2. **视觉反馈**
   - 半透明背景：`bg-white/50 dark:bg-black/20`
   - 悬停高亮：`hover:bg-white/80 dark:hover:bg-black/40`
   - 圆角设计：`rounded`

3. **布局优化**
   - 使用 `flex-shrink-0` 防止按钮被压缩
   - 内容区域使用 `flex-1 min-w-0` 确保正确截断
   - 添加 `break-all` 支持长文本换行

### 深色模式适配

所有拷贝按钮都完美支持深色/浅色主题切换：
- 浅色模式：白色半透明背景
- 深色模式：黑色半透明背景

## 🔧 技术实现

### 拷贝函数
```typescript
const copyToClipboard = async (text: string, label: string = 'Content') => {
  try {
    await navigator.clipboard.writeText(text);
    console.log(`${label} copied to clipboard`);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};
```

### 控制台行拷贝
```tsx
<div className="group ...">
  <div className="flex-1 min-w-0">
    <span>{item.content}</span>
  </div>
  <button
    onClick={() => copyToClipboard(item.content, 'Console output')}
    className="opacity-0 group-hover:opacity-100 ..."
  >
    📋
  </button>
</div>
```

### 变量值拷贝
```typescript
// 智能处理不同类型的值
const variableValue = typeof variable.value === 'object' 
  ? JSON.stringify(variable.value, null, 2)  // 对象/数组：格式化 JSON
  : String(variable.value);                   // 简单类型：转字符串

<button
  onClick={(e) => {
    e.stopPropagation();  // 阻止触发展开/折叠
    copyToClipboard(variableValue, `Variable ${variable.name}`);
  }}
>
  📋
</button>
```

### 批量拷贝
```typescript
// 拷贝所有输出
const allOutput = output.map(item => 
  `[${item.timestamp.toLocaleTimeString()}] ${item.content}`
).join('\n');

// 拷贝所有变量
const allVars = variables.map(v => 
  `${v.name} = ${formatValue(v.value)}`
).join('\n');
```

## ⚠️ 注意事项

### 浏览器兼容性
- ✅ Chrome 66+
- ✅ Firefox 63+
- ✅ Safari 12.1+
- ✅ Edge 79+
- ❌ IE（不支持）

### 权限要求
- 需要 HTTPS 或 localhost 环境
- 某些浏览器可能需要用户交互才能访问剪贴板

### 性能考虑
- 大型对象会自动限制为前 20 个属性（在 `analyzeValue` 中）
- JSON 序列化可能会较慢，建议不要拷贝超大对象

## 🎯 最佳实践

### 1. 拷贝前检查内容
- 对于大对象，先展开查看再决定是否拷贝
- 使用 `JSON.stringify(obj, null, 2)` 获得可读格式

### 2. 组织输出便于拷贝
```javascript
// ✅ 好的做法：结构化输出
console.log(JSON.stringify(data, null, 2));

// ❌ 避免：难以解析的输出
console.log(data);
```

### 3. 使用标签区分
```javascript
console.log('[USER DATA]', userData);
console.log('[CONFIG]', config);
// 拷贝后可以快速搜索标签
```

## 📊 对比其他工具

| 功能 | JS Console | Chrome DevTools | Node.js REPL |
|------|-----------|----------------|--------------|
| 单行拷贝 | ✅ | ✅ | ❌ |
| 批量拷贝 | ✅ | ❌ | ❌ |
| 对象格式化 | ✅ | ✅ | ⚠️ |
| 深色模式 | ✅ | ✅ | ❌ |
| 变量树展开 | ✅ | ✅ | ❌ |

## 🚀 未来改进

可能的增强方向：
- [ ] 拷贝为不同格式（JSON、CSV、YAML）
- [ ] 自定义拷贝模板
- [ ] 拷贝历史记录
- [ ] 一键导出为文件
- [ ] 分享到 gist/codepen

---

现在你可以轻松复制任何控制台输出和变量值了！🎉
