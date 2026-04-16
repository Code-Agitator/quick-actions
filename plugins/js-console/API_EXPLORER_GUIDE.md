# JS API 探索器使用指南

## 🎯 设计理念

这个插件的核心目标是帮助你**快速了解 JavaScript API**，探索对象的结构、属性和方法，并实时查看执行结果。

## ✨ 核心功能

### 1. 双面板设计

#### Variables 面板 - 变量列表
- 显示所有已定义的变量
- 树形结构展示嵌套对象
- **点击顶层变量** → 自动切换到 Inspector 面板进行详细检查

#### Inspector 面板 - 对象检查器 🔍
- **Name**: 变量名
- **Type**: 数据类型（带颜色标识）
- **Prototype**: 原型链信息
- **Value**: 值的预览
- **Properties**: 所有属性列表（可拷贝）
- **Methods**: 所有方法列表（可点击使用）

### 2. 智能对象内省

当你创建一个对象时，系统会自动分析：

```javascript
let user = {
  name: "Alice",
  age: 25,
  greet() { return `Hi, I'm ${this.name}`; }
};
```

**Inspector 会显示**:
- ✅ Properties: `name`, `age`
- ✅ Methods: `greet`
- ✅ Prototype: `Object`

### 3. 一键使用方法

在 Inspector 的方法列表中，**点击任意方法**会自动在编辑器中生成调用代码：

```
点击 greet() → 编辑器填入: user.greet()
```

## 🚀 快速开始

### 示例 1: 探索 Date API

```javascript
let now = new Date();
```

**Inspector 显示**:
```
Name: now
Type: date (青色)
Value: 2026-04-16T08:16:21.411Z
Methods: 
  - getFullYear()
  - getMonth()
  - getDate()
  - getHours()
  - toISOString()
  - ...
```

**点击 `getFullYear()` 方法** → 自动生成 `now.getFullYear()` → 按 `Ctrl+Enter` 执行 → 看到结果 `2026`

### 示例 2: 探索 Array API

```javascript
let arr = [1, 2, 3, 4, 5];
```

**Inspector 显示**:
```
Name: arr
Type: object
Prototype: Array
Properties: length
Methods:
  - push()
  - pop()
  - map()
  - filter()
  - reduce()
  - forEach()
  - ...
```

**快速测试方法**:
1. 点击 `map()` → 编辑器填入 `arr.map()`
2. 修改为 `arr.map(x => x * 2)`
3. 按 `Ctrl+Enter` → 看到结果 `[2, 4, 6, 8, 10]`

### 示例 3: 探索 URL API

```javascript
let url = new URL('https://example.com/path?query=1');
```

**Inspector 显示**:
```
Name: url
Type: url (靛蓝色)
Value: https://example.com/path?query=1
Properties:
  - href
  - protocol
  - host
  - pathname
  - search
  - hash
Methods:
  - toString()
  - toJSON()
```

**探索属性**:
```javascript
url.protocol    // "https:"
url.host        // "example.com"
url.pathname    // "/path"
url.search      // "?query=1"
```

### 示例 4: 探索 Map/Set

```javascript
let map = new Map([
  ['name', 'Alice'],
  ['age', 25]
]);

let set = new Set([1, 2, 3]);
```

**Map Inspector**:
```
Name: map
Type: map (紫罗兰色)
Value: Map(2)
Methods:
  - get()
  - set()
  - has()
  - delete()
  - clear()
  - forEach()
```

**Set Inspector**:
```
Name: set
Type: set (紫红色)
Value: Set(3)
Methods:
  - add()
  - has()
  - delete()
  - clear()
  - forEach()
```

## 💡 高效工作流

### 工作流 1: API 发现

```javascript
// 1. 创建对象
let str = "Hello World";

// 2. 查看 Inspector 中的 Methods 列表
// 3. 点击感兴趣的方法，如 toUpperCase
// 4. 编辑器自动填入 str.toUpperCase()
// 5. 按 Ctrl+Enter 执行
// 6. 看到结果 "HELLO WORLD"
```

### 工作流 2: 数据处理

```javascript
// 1. 准备数据
let users = [
  { name: "Alice", age: 25 },
  { name: "Bob", age: 30 },
  { name: "Charlie", age: 35 }
];

// 2. 在 Inspector 中看到 Array 的方法
// 3. 点击 filter() → 编辑器填入 users.filter()
// 4. 修改为: users.filter(u => u.age > 28)
// 5. 执行 → 看到过滤后的结果

// 6. 继续处理：点击 map()
// 7. 修改为: users.filter(u => u.age > 28).map(u => u.name)
// 8. 执行 → 看到 ["Bob", "Charlie"]
```

### 工作流 3: 调试对象

```javascript
// 1. 创建复杂对象
let config = {
  database: {
    host: "localhost",
    port: 5432
  },
  api: {
    baseUrl: "https://api.example.com",
    timeout: 5000
  }
};

// 2. 在 Variables 面板展开查看结构
// 3. 点击 config 切换到 Inspector
// 4. 查看所有属性和嵌套结构
// 5. 拷贝属性列表用于文档
```

## 🎨 颜色编码系统

| 类型 | 颜色 | 说明 |
|------|------|------|
| String | 🟢 绿色 | 文本数据 |
| Number | 🔵 蓝色 | 数值数据 |
| Boolean | 🟠 橙色 | true/false |
| Function | 🟡 黄色 | 可调用的函数 |
| Date | 🔷 青色 | 日期时间 |
| RegExp | 🌸 粉色 | 正则表达式 |
| Error | 🔴 红色 | 错误对象 |
| URL | 🔵 靛蓝 | URL 对象 |
| Map | 🟣 紫罗兰 | 键值对集合 |
| Set | 💜 紫红 | 唯一值集合 |

## 📋 快捷操作

### 变量面板
- **点击顶层变量** → 切换到 Inspector 检查
- **点击嵌套对象** → 展开/折叠
- **悬停 + 点击 📋** → 拷贝单个值
- **Copy All** → 拷贝所有变量

### Inspector 面板
- **点击方法** → 自动生成调用代码
- **点击 📋** → 拷贝属性/方法列表
- **滚动查看** → 浏览大量属性和方法

### 编辑器
- **Ctrl+Enter** → 执行代码
- **Tab** → 缩进
- **↑↓** → 浏览历史

## 🔧 高级技巧

### 技巧 1: 链式调用探索

```javascript
let arr = [1, 2, 3, 4, 5];

// 逐步构建链式调用
arr.filter(x => x > 2)       // 先过滤
    .map(x => x * 2)          // 再转换
    .reduce((sum, x) => sum + x, 0);  // 最后聚合
```

### 技巧 2: 原型链探索

```javascript
class Animal {
  constructor(name) {
    this.name = name;
  }
  speak() {
    return `${this.name} makes a noise`;
  }
}

class Dog extends Animal {
  bark() {
    return `${this.name} barks!`;
  }
}

let dog = new Dog("Rex");

// Inspector 会显示来自原型链的所有方法:
// - speak() (来自 Animal)
// - bark() (来自 Dog)
```

### 技巧 3: 内置对象对比

```javascript
// 对比不同集合类型
let arr = [1, 2, 3];
let set = new Set([1, 2, 3]);
let map = new Map([[1, 'a'], [2, 'b']]);

// 分别查看它们的 Inspector
// 观察各自的 methods 差异
```

### 技巧 4: 异步 API 探索

```javascript
// 探索 Promise
let promise = fetch('https://api.example.com');

// Inspector 显示 Promise 的方法:
// - then()
// - catch()
// - finally()

// 探索 async/await
async function getData() {
  let response = await fetch('https://api.example.com');
  let data = await response.json();
  return data;
}
```

## 📚 学习路径建议

### 初级：基础类型
1. String - 字符串方法
2. Number - 数值方法
3. Array - 数组操作
4. Object - 对象操作

### 中级：数据结构
1. Map - 键值对
2. Set - 唯一值集合
3. Date - 日期时间
4. RegExp - 正则表达式

### 高级：Web API
1. URL - URL 解析
2. Promise - 异步编程
3. Fetch - HTTP 请求
4. localStorage - 本地存储

## 🎯 最佳实践

### ✅ 推荐做法

1. **每次只关注一个对象**
   ```javascript
   let str = "hello";  // 专注探索 String API
   ```

2. **利用方法列表快速尝试**
   - 点击方法 → 修改参数 → 执行

3. **使用历史记录**
   - ↑↓ 箭头浏览之前的代码
   - 快速迭代和修改

4. **拷贝有用的信息**
   - 属性列表用于文档
   - 方法列表用于备忘

### ❌ 避免的做法

1. **不要一次性执行太多代码**
   ```javascript
   // ❌ 不好
   let a = 1; let b = 2; let c = 3;
   
   // ✅ 好
   let a = 1;  // 逐个执行，逐个检查
   ```

2. **不要忽略 Inspector**
   - Variables 看概览
   - Inspector 看细节

3. **不要忘记清理**
   - 定期点击 "Clear Variables"
   - 保持环境干净

## 🚀 下一步

现在你已经掌握了 JS Console 的核心功能，可以：

1. **探索你感兴趣的 API**
   - Web APIs
   - Node.js APIs
   - 第三方库

2. **建立自己的代码片段库**
   - 保存常用的操作
   - 记录学到的技巧

3. **分享给团队**
   - 拷贝属性/方法列表
   - 分享探索结果

---

享受探索 JavaScript 的乐趣！🎉
