# 浏览器控制台风格交互指南

## 🎯 设计理念

完全模仿浏览器开发者工具控制台的交互体验，让你感觉就像在 Chrome DevTools 中一样自然。

## ✨ 核心特性

### 1. 单行模式（默认）- 类似浏览器控制台

```
> let x = 10
  10
> x * 2
  20
> console.log("Hello")
  Hello
  undefined
```

**特点**:
- ✅ **Enter 立即执行** - 和浏览器控制台完全一致
- ✅ **紧凑布局** - 只有一行高度（60px）
- ✅ **无行号** - 更简洁的视觉效果
- ✅ **即时反馈** - 每次输入都能看到结果

### 2. 多行模式 - 编写复杂代码

```javascript
> function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
  }
  undefined
> factorial(5)
  120
```

**特点**:
- ✅ **Shift+Enter 执行** - Enter 用于换行
- ✅ **完整编辑器** - 200px 高度，显示行号
- ✅ **语法高亮** - 完整的代码编辑体验
- ✅ **自动缩进** - 智能代码格式化

## 🎮 快捷键对照

### 单行模式（推荐）

| 快捷键 | 功能 | 浏览器控制台对比 |
|--------|------|-----------------|
| **Enter** | ⚡ **执行代码** | ✅ 完全一致 |
| Shift+Enter | 插入换行（切换到多行） | ✅ 一致 |
| Ctrl+Enter | 执行代码（备用） | ✅ 一致 |
| ↑ | 上一条命令 | ✅ 完全一致 |
| ↓ | 下一条命令 | ✅ 完全一致 |
| Tab | 自动补全/缩进 | ✅ 完全一致 |

### 多行模式

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| Enter | 插入换行 | 正常编辑行为 |
| **Shift+Enter** | ⚡ **执行代码** | 主要执行方式 |
| Ctrl+Enter | ⚡ **执行代码** | 备用执行方式 |
| ↑↓ | 浏览历史 | 在空行时有效 |
| Tab | 缩进/补全 | 智能提示 |

## 💡 使用场景

### 场景 1: 快速计算（单行模式）

```javascript
> 2 + 2
  4

> Math.PI * 10
  31.41592653589793

> "hello".toUpperCase()
  "HELLO"
```

**优势**: 
- 输入即执行，无需额外按键
- 适合简单表达式和 API 测试

### 场景 2: 变量探索（单行模式）

```javascript
> let arr = [1, 2, 3, 4, 5]
  [1, 2, 3, 4, 5]

> arr.map(x => x * 2)
  [2, 4, 6, 8, 10]

> arr.filter(x => x > 2)
  [3, 4, 5]

> arr.reduce((sum, x) => sum + x, 0)
  15
```

**工作流**:
1. 定义变量 → 看到结果
2. 立即测试方法 → 看到转换结果
3. 链式调用 → 逐步构建数据处理管道

### 场景 3: 函数定义（多行模式）

点击 **📝 Multi** 按钮切换到多行模式：

```javascript
> function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  }
  undefined

> fibonacci(10)
  55
```

**优势**:
- 可以编写多行函数
- 支持复杂的逻辑
- 保持代码可读性

### 场景 4: 异步代码（多行模式）

```javascript
> async function fetchData() {
    const response = await fetch('https://api.example.com');
    const data = await response.json();
    return data;
  }
  undefined

> fetchData().then(console.log)
  Promise {<pending>}
```

## 🎨 UI 设计

### 单行模式界面

```
┌─────────────────────────────────────────┐
│ > Single-line mode (Enter to execute)   │ [📝 Multi]
├─────────────────────────────────────────┤
│ > let x = 10                            │ ← 60px 高度
└─────────────────────────────────────────┘
```

**特点**:
- 绿色 `>` 提示符（经典控制台风格）
- 模式指示器
- 切换按钮

### 多行模式界面

```
┌─────────────────────────────────────────┐
│ > Multi-line mode (Shift+Enter to exec) │ [📄 Single]
├─────────────────────────────────────────┤
│ 1 | function test() {                   │
│ 2 |   return "hello";                   │ ← 200px 高度
│ 3 | }                                   │   显示行号
└─────────────────────────────────────────┘
```

**特点**:
- 显示行号
- 更大的编辑空间
- 完整的代码编辑功能

### 底部状态栏

```
┌─────────────────────────────────────────────────────┐
│ Ready  [Single-line]  5 commands                    │
│ Enter: Execute • Shift+Enter: New line • ↑↓ History │
└─────────────────────────────────────────────────────┘
```

**信息**:
- 当前状态
- 模式指示（绿色=单行，黄色=多行）
- 命令历史数量
- 快捷键提示（根据模式动态变化）

## 🔄 模式切换

### 何时使用单行模式？

✅ **适合场景**:
- 快速测试表达式
- 探索 API
- 简单计算
- 查看变量值
- 链式方法调用

**示例**:
```javascript
> Date.now()
> new URL('https://example.com').hostname
> [1,2,3].map(x => x * 2).filter(x => x > 2)
```

### 何时使用多行模式？

✅ **适合场景**:
- 定义函数
- 编写类
- 异步代码
- 复杂逻辑
- 需要注释的代码

**示例**:
```javascript
> class User {
    constructor(name) {
      this.name = name;
    }
    greet() {
      return `Hello, ${this.name}!`;
    }
  }
```

## 🚀 高效工作流

### 工作流 1: API 发现

```javascript
// 1. 单行模式，快速探索
> let str = "Hello World"
  "Hello World"

// 2. 查看 Inspector 中的方法列表
// 3. 点击 toUpperCase → 自动生成代码
> str.toUpperCase()
  "HELLO WORLD"

// 4. 继续尝试其他方法
> str.split(" ")
  ["Hello", "World"]

> str.replace("World", "JS")
  "Hello JS"
```

### 工作流 2: 数据转换管道

```javascript
// 1. 准备数据
> let users = [{name: "Alice", age: 25}, {name: "Bob", age: 30}]

// 2. 逐步构建转换
> users.map(u => u.name)
  ["Alice", "Bob"]

> users.filter(u => u.age > 25)
  [{name: "Bob", age: 30}]

// 3. 链式调用
> users.filter(u => u.age > 25).map(u => u.name.toUpperCase())
  ["BOB"]
```

### 工作流 3: 调试对象

```javascript
// 1. 创建对象
> let config = {db: {host: "localhost", port: 5432}}

// 2. 在 Inspector 中展开查看
// 3. 测试访问
> config.db.host
  "localhost"

> config.db.port
  5432

// 4. 修改并测试
> config.db.port = 3306
  3306
```

## 📊 与浏览器控制台对比

| 特性 | 浏览器控制台 | JS Console | 一致性 |
|------|-------------|------------|--------|
| Enter 执行 | ✅ | ✅ | ✅ 100% |
| Shift+Enter 换行 | ✅ | ✅ | ✅ 100% |
| ↑↓ 历史 | ✅ | ✅ | ✅ 100% |
| Tab 补全 | ✅ | ✅ | ✅ 100% |
| 类型推断 | ✅ | ✅ | ✅ 100% |
| 语法高亮 | ✅ | ✅ | ✅ 100% |
| 自动补全 | ✅ | ✅ | ✅ 100% |
| 参数提示 | ✅ | ✅ | ✅ 100% |
| 变量检查器 | ❌ | ✅ | ⭐ 更强 |
| 对象内省 | ❌ | ✅ | ⭐ 更强 |
| 一键调用方法 | ❌ | ✅ | ⭐ 更强 |

## 💪 优势总结

### 相比浏览器控制台

1. **✅ 保留所有原生功能**
   - 完全一致的快捷键
   - 相同的交互逻辑
   - Monaco Editor 提供顶级智能提示

2. **⭐ 增强的开发体验**
   - Inspector 面板详细展示对象结构
   - 属性和方法列表可拷贝
   - 点击方法自动生成调用代码
   - 深色/浅色主题支持

3. **🎯 专注学习**
   - 右侧实时显示变量
   - 自动选中最新结果
   - 颜色编码区分类型
   - 历史记录管理

## 🎓 最佳实践

### 1. 默认使用单行模式

```javascript
// ✅ 推荐：快速迭代
> let x = 10
> x * 2
> x + 5

// ❌ 避免：不必要的多行
> let x = 10;
  x * 2;
  x + 5;
```

### 2. 需要定义函数时切换多行

```
1. 点击 📝 Multi
2. 编写函数
3. Shift+Enter 执行
4. 切回 📄 Single 继续测试
```

### 3. 利用 Inspector 探索

```javascript
> let arr = [1, 2, 3]
// 自动切换到 Inspector
// 查看所有 Array 方法
// 点击感兴趣的方法测试
```

### 4. 使用历史记录

```javascript
> let x = 10
> x * 2
> x + 5
// 按 ↑ 回到 x = 10
// 修改为 x = 20
// 按 ↓ 回到 x * 2
// 执行得到 40（而不是 20）
```

## 🔧 自定义建议

### 如果你喜欢 REPL 风格
- 保持单行模式
- 频繁使用 ↑↓ 浏览历史
- 利用 Inspector 查看结果

### 如果你需要编写复杂代码
- 切换到多行模式
- 充分利用智能提示
- 写好后再执行

### 如果你在探索 API
- 单行模式测试简单调用
- Inspector 查看可用方法
- 点击方法快速尝试

---

现在你拥有了**完全一致的浏览器控制台体验**，同时还有更强大的对象检查功能！🎉
