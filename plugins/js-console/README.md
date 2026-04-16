# JS Interactive Console ⚡

一个交互式的 JavaScript 控制台插件，类似于浏览器开发者工具，带有实时变量检查器。

## ✨ 功能特性

### 🖥️ 智能代码编辑器
- **Monaco Editor** - VS Code 同款编辑器内核
- **语法高亮** - JavaScript 语法自动着色
- **代码提示** - 智能补全和参数提示
- **代码格式化** - Shift+Alt+F 或点击 "Format Code" 按钮
- **行号显示** - 清晰的代码行号
- **自动缩进** - Tab 键智能缩进（2空格）
- **快捷键支持**:
  - `Ctrl/Cmd + Enter` - 执行代码
  - `Shift + Alt + F` - 格式化代码
  - `↑/↓` - 浏览命令历史
  - `Ctrl/Cmd + /` - 注释/取消注释

### 📦 变量检查器（右侧面板）
- **实时变量预览** - 自动捕获和显示所有定义的变量
- **可展开的对象** - 点击展开查看对象和数组的内容
- **类型标识** - 不同数据类型用不同颜色显示：
  - 🟢 绿色 - 字符串
  - 🔵 蓝色 - 数字
  - 🟠 橙色 - 布尔值
  - 🟡 黄色 - 函数
  - ⚪ 灰色 - 其他类型
- **深度限制** - 最多展开3层，避免性能问题
- **数据拷贝** - 悬停点击 📋 拷贝单个变量，或点击 "Copy All" 拷贝全部

### 💻 控制台输出
- **多种输出类型**:
  - `console.log()` - 标准日志
  - `console.error()` - 错误信息（红色背景）
  - `console.warn()` - 警告信息（黄色背景）
  - `console.info()` - 信息提示（蓝色背景）
  - 返回值 - 执行结果（绿色背景）
- **时间戳** - 每条消息都显示执行时间
- **自动滚动** - 新消息自动滚动到底部
- **数据拷贝** - 悬停点击 📋 拷贝单行，或点击 "Copy All" 拷贝全部

### 🎨 主题支持
- **自动跟随系统** - 深色/浅色主题自动切换
- **VS Code 风格** - 与 VS Code 一致的编辑体验

### 🎯 使用示例

#### 基础用法
```javascript
// 定义变量
const name = "Quick Actions";
const version = 1.0;
const isAwesome = true;

// 使用 console
console.log("Hello, " + name);
console.info("Version:", version);

// 返回结果
name + " v" + version
```

#### 对象和数组
```javascript
// 创建复杂对象
const user = {
  name: "Alice",
  age: 25,
  skills: ["JavaScript", "React", "TypeScript"],
  address: {
    city: "Beijing",
    country: "China"
  }
};

// 在右侧变量面板中可以展开查看完整结构
```

#### 函数定义
```javascript
// 定义函数
function add(a, b) {
  return a + b;
}

const result = add(5, 3);
console.log("Result:", result); // Result: 8
```

#### 数组操作
```javascript
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log(doubled); // [2, 4, 6, 8, 10]
```

## 🚀 快速开始

1. **安装依赖**（如果还没安装）:
   ```bash
   pnpm install
   ```

2. **开发模式**:
   ```bash
   pnpm dev
   ```

3. **构建生产版本**:
   ```bash
   pnpm build
   ```

4. **在 Quick Actions 中使用**:
   - 打开 Quick Actions
   - 搜索 "js-console" 或 "JS Interactive Console"
   - 按 Enter 打开插件

## 🎨 界面布局

```
┌─────────────────────────────────────────────────────┐
│  ⚡ JS Interactive Console    [Clear Console] [...] │
├──────────────────────────┬──────────────────────────┤
│  Code Editor             │  Variables               │
│  ┌────────────────────┐  │  ┌────────────────────┐  │
│  │ const x = 10;      │  │  │ ▶ x : 10           │  │
│  │ console.log(x);    │  │  │ ▶ y : "hello"      │  │
│  └────────────────────┘  │  │ ▼ obj : {3 keys}   │  │
│                          │  │   ├─ name : "test" │  │
│  [▶ Run Code]            │  │   ├─ value : 42    │  │
│                          │  │   └─ active : true │  │
│  Console Output          │  └────────────────────┘  │
│  ┌────────────────────┐  │                          │
│  │ 10:30:15  10       │  │                          │
│  │ 10:30:15  Hello    │  │                          │
│  └────────────────────┘  │                          │
├──────────────────────────┴──────────────────────────┤
│  Ready  [2 commands]    ↑↓ History • Tab • Ctrl+Ent │
└─────────────────────────────────────────────────────┘
```

## 💡 提示

1. **变量持久化** - 定义的变量会在会话中保持，可以在后续代码中使用
2. **历史记录** - 使用上下箭头键可以快速访问之前执行的命令
3. **清除状态** - 使用顶部的 "Clear Console" 和 "Clear Variables" 按钮重置状态
4. **错误处理** - 代码错误会显示为红色，不会中断会话

## 🔧 技术实现

- **沙箱环境** - 使用 `Function` 构造器创建隔离的执行环境
- **上下文管理** - 自动捕获和跟踪变量定义
- **React 19** - 最新的 React 特性
- **Tailwind CSS** - 现代化的样式系统
- **Vite** - 快速的构建工具

## 📝 注意事项

⚠️ **安全提醒**: 
- 此插件在本地环境中运行代码
- 不要执行不受信任的代码
- 没有网络访问权限
- 文件系统访问需要通过 Quick Actions API

## 🎯 适用场景

- 🧪 快速测试 JavaScript 代码片段
- 📊 调试数据结构
- 🎓 学习 JavaScript
- 🔍 探索 API 响应
- 💼 数据处理和转换

---

Made with ❤️ for Quick Actions
