# JS Console 快速开始指南

## 🎯 5分钟上手

### 1️⃣ 打开插件
在 Quick Actions 中搜索 "js" 或 "console"，选择 "JS Interactive Console"

### 2️⃣ 试试这些示例代码

#### 示例 1: 基础变量
```javascript
const greeting = "Hello, World!";
const number = 42;
const isActive = true;

console.log(greeting);
console.log("Number:", number);
console.log("Active:", isActive);
```
👉 按 `Ctrl+Enter` 执行，在右侧可以看到所有变量！

#### 示例 2: 对象和数组
```javascript
const user = {
  name: "Alice",
  age: 25,
  hobbies: ["coding", "gaming", "reading"],
  address: {
    city: "Beijing",
    zip: "100000"
  }
};

console.log("User created:", user.name);
```
👉 点击右侧变量面板中的 `▶ user` 展开查看完整结构！

#### 示例 3: 函数
```javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log("Fibonacci(10) =", result);
```

#### 示例 4: 数组操作
```javascript
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// 过滤偶数
const evens = numbers.filter(n => n % 2 === 0);
console.log("Even numbers:", evens);

// 求和
const sum = numbers.reduce((a, b) => a + b, 0);
console.log("Sum:", sum);

// 映射
const doubled = numbers.map(n => n * 2);
console.log("Doubled:", doubled);
```

#### 示例 5: 错误处理
```javascript
try {
  const obj = null;
  console.log(obj.property); // 这会出错
} catch (error) {
  console.error("Error caught:", error.message);
}
```

### 3️⃣ 快捷键速查

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + Enter` | 执行代码 |
| `Shift + Alt + F` | 格式化代码 |
| `Tab` | 缩进（2空格） |
| `↑` | 上一条命令 |
| `↓` | 下一条命令 |
| `Ctrl/Cmd + /` | 注释/取消注释 |

### 4️⃣ 界面说明

```
┌──────────────────────────────────────────┐
│ ⚡ JS Interactive Console                │
│                    [Clear Console] [...] │
├────────────────┬─────────────────────────┤
│ 代码编辑器      │ 变量检查器               │
│                │                         │
│ 输入代码...     │ ▶ variable : value     │
│                │ ▼ object : {3 keys}     │
│ [▶ Run Code]   │   ├─ key1 : value1     │
│                │   ├─ key2 : value2     │
│ 控制台输出      │   └─ key3 : value3     │
│ 10:30:15  42   │                         │
│ 10:30:15  OK   │                         │
└────────────────┴─────────────────────────┘
```

### 5️⃣ 实用技巧

💡 **技巧 1**: 变量会保持状态
```javascript
// 第一次执行
let counter = 0;

// 第二次执行
counter++;
console.log(counter); // 1

// 第三次执行
counter++;
console.log(counter); // 2
```

💡 **技巧 2**: 使用历史记录
- 按 `↑` 可以快速重新执行之前的命令
- 修改后再次执行很方便

💡 **技巧 3**: 清除状态
- 点击 "Clear Variables" 重置所有变量
- 点击 "Clear Console" 清空输出

💡 **技巧 4**: 调试复杂对象
```javascript
const data = {
  users: [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" }
  ],
  meta: {
    total: 2,
    page: 1
  }
};
// 在右侧面板展开 data → users → [0] 查看详细信息
```

### 6️⃣ 常见用途

✅ **测试 API 响应格式**
```javascript
const apiResponse = {
  status: 200,
  data: { items: [1, 2, 3] }
};
JSON.stringify(apiResponse, null, 2);
```

✅ **数据处理**
```javascript
const csv = "name,age\nAlice,25\nBob,30";
const lines = csv.split('\n');
const headers = lines[0].split(',');
const rows = lines.slice(1).map(line => {
  const values = line.split(',');
  return Object.fromEntries(
    headers.map((h, i) => [h, values[i]])
  );
});
console.log(rows);
```

✅ **算法练习**
```javascript
function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  return [...quickSort(left), ...middle, ...quickSort(right)];
}

quickSort([3, 6, 8, 10, 1, 2, 1]);
```

---

🎉 现在你已经掌握了 JS Console 的基础用法，开始探索吧！
