# Ctrl+Enter 快捷键修复说明

## 🐛 问题描述

在集成 Monaco Editor 后，发现 `Ctrl+Enter` 快捷键无法执行 JavaScript 代码。

## 🔍 问题原因

这是一个经典的 **React 闭包陷阱**问题：

### 问题分析

1. **Monaco Editor 的 onMount 只执行一次**
   ```typescript
   onMount={(editor, monaco) => {
     // 这个回调只在编辑器挂载时执行一次
     editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
       executeCode(); // ❌ 这里捕获的是初始的 executeCode 引用
     });
   }}
   ```

2. **executeCode 使用 useCallback**
   ```typescript
   const executeCode = useCallback(() => {
     // 依赖 code, context, parseVariables
     // 当这些依赖变化时，会创建新的函数引用
   }, [code, context, parseVariables]);
   ```

3. **闭包捕获旧引用**
   - `onMount` 中的回调捕获了**第一次渲染时**的 `executeCode`
   - 当 `code`、`context` 等状态更新后，`executeCode` 会创建新引用
   - 但 Monaco 的快捷键仍然调用旧的引用（闭包中的 stale closure）
   - 旧引用访问的是旧的状态值，导致功能异常

## ✅ 解决方案

使用 **ref** 来存储最新的函数引用：

### 实现步骤

#### 1. 创建 ref 存储函数
```typescript
const executeCodeRef = useRef<() => void>(() => {});
```

#### 2. 同步更新 ref
```typescript
const executeCode = useCallback(() => {
  // ... 函数逻辑
}, [code, context, parseVariables]);

// 每次 executeCode 变化时，更新 ref
useEffect(() => {
  executeCodeRef.current = executeCode;
}, [executeCode]);
```

#### 3. 在快捷键中使用 ref
```typescript
onMount={(editor, monaco) => {
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    executeCodeRef.current(); // ✅ 总是调用最新的函数
  });
}}
```

## 📊 对比分析

### ❌ 修复前（有问题）
```typescript
// onMount 中直接调用 executeCode
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
  executeCode(); // 捕获的是旧引用
});
```

**问题流程**：
```
1. 组件首次渲染
   └─ executeCode v1 创建
   └─ onMount 执行，注册快捷键
      └─ 快捷键闭包捕获 executeCode v1

2. 用户输入代码，code 状态更新
   └─ executeCode v2 创建（新引用）
   
3. 用户按 Ctrl+Enter
   └─ 快捷键调用 executeCode v1（旧引用）❌
      └─ 访问的是旧的 code 状态
```

### ✅ 修复后（正常工作）
```typescript
// 使用 ref 间接调用
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
  executeCodeRef.current(); // 通过 ref 调用最新函数
});
```

**正确流程**：
```
1. 组件首次渲染
   └─ executeCode v1 创建
   └─ useEffect 执行，executeCodeRef.current = executeCode v1
   └─ onMount 执行，注册快捷键
      └─ 快捷键闭包捕获 executeCodeRef（ref 对象本身不变）

2. 用户输入代码，code 状态更新
   └─ executeCode v2 创建（新引用）
   └─ useEffect 执行，executeCodeRef.current = executeCode v2
   
3. 用户按 Ctrl+Enter
   └─ 快捷键调用 executeCodeRef.current ✅
      └─ 访问的是 executeCode v2（最新引用）
         └─ 访问的是最新的 code 状态 ✅
```

## 🎯 核心原理

### Ref 的特性
- **ref 对象本身是稳定的** - 整个组件生命周期中引用不变
- **ref.current 可变** - 可以随时更新 `.current` 属性
- **不触发重渲染** - 更新 ref 不会导致组件重新渲染

### 为什么这样有效？
```typescript
// Monaco 的快捷键回调捕获的是 ref 对象本身
executeCodeRef.current()
//        ^^^^^^ 
//        ref 对象（稳定不变）

// 而 ref.current 指向最新的函数
//        ^^^^^^^^
//        可以动态更新
```

## 📝 其他常见场景

这种模式也适用于其他需要在外层作用域（如事件监听器、定时器、第三方库回调）中访问最新状态的场景：

### 示例 1: setInterval
```typescript
const countRef = useRef(0);

useEffect(() => {
  countRef.current = count;
}, [count]);

useEffect(() => {
  const timer = setInterval(() => {
    console.log(countRef.current); // ✅ 最新值
  }, 1000);
  return () => clearInterval(timer);
}, []);
```

### 示例 2: WebSocket 消息处理
```typescript
const handlerRef = useRef<(msg: string) => void>(() => {});

useEffect(() => {
  handlerRef.current = handleMessage;
}, [handleMessage]);

useEffect(() => {
  ws.onmessage = (event) => {
    handlerRef.current(event.data); // ✅ 最新处理器
  };
}, []);
```

## 🔗 相关资源

- [React Hooks FAQ - Stale Closures](https://react.dev/learn/synchronizing-with-effects#how-to-handle-stale-closures)
- [useRef Documentation](https://react.dev/reference/react/useRef)
- [Monaco Editor Keybindings](https://microsoft.github.io/monaco-editor/api/interfaces/monaco.editor.IStandaloneCodeEditor.html#addCommand)

## ✨ 总结

| 方面 | 说明 |
|------|------|
| **问题** | Monaco 快捷键捕获了过时的函数引用 |
| **原因** | React 闭包陷阱 + useCallback 创建新引用 |
| **解决** | 使用 ref 存储并同步最新函数引用 |
| **关键** | ref 对象稳定，ref.current 可变 |
| **适用** | 所有需要在外部回调中访问最新状态的场景 |

---

现在 `Ctrl+Enter` 快捷键可以正常执行 JavaScript 代码了！🎉
