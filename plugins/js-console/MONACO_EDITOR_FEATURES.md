# Monaco Editor 集成说明

## 🎯 新增功能

JS Console 现已集成 **Monaco Editor**（VS Code 同款编辑器），提供专业级的代码编辑体验。

## ✨ 核心特性

### 1. 语法高亮 (Syntax Highlighting)
- ✅ JavaScript 语法自动着色
- ✅ 关键字、字符串、数字、注释等不同颜色
- ✅ 深色/浅色主题自动切换
- ✅ 与 VS Code 一致的配色方案

### 2. 智能代码提示 (IntelliSense)
- ✅ 自动补全 - 输入时显示建议
- ✅ 参数提示 - 函数参数实时显示
- ✅ 类型推断 - 基于上下文的智能提示
- ✅ 成员列表 - 对象属性和方法提示

### 3. 代码格式化 (Code Formatting)
- ✅ **快捷键**: `Shift + Alt + F`
- ✅ **按钮**: 点击顶部 "Format Code" 按钮
- ✅ 自动缩进和对齐
- ✅ 统一的代码风格

### 4. 其他编辑器功能
- ✅ 行号显示
- ✅ 最小化地图（已禁用，保持简洁）
- ✅ 自动换行
- ✅ 多光标支持
- ✅ 查找/替换 (`Ctrl/Cmd + F`)
- ✅ 注释/取消注释 (`Ctrl/Cmd + /`)
- ✅ 撤销/重做 (`Ctrl/Cmd + Z/Y`)

## 🎨 主题适配

编辑器会自动跟随系统主题：
- **浅色模式**: 使用 `vs-light` 主题
- **深色模式**: 使用 `vs-dark` 主题

主题切换是实时的，无需刷新页面。

## ⌨️ 完整快捷键列表

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + Enter` | 执行代码 |
| `Shift + Alt + F` | 格式化代码 |
| `Ctrl/Cmd + /` | 注释/取消注释 |
| `Ctrl/Cmd + F` | 查找 |
| `Ctrl/Cmd + H` | 查找并替换 |
| `Ctrl/Cmd + Z` | 撤销 |
| `Ctrl/Cmd + Y` | 重做 |
| `Tab` | 缩进 |
| `Shift + Tab` | 取消缩进 |
| `↑` | 上一条历史命令 |
| `↓` | 下一条历史命令 |
| `Ctrl/Cmd + D` | 选择下一个匹配项 |
| `Alt + ↑/↓` | 移动行 |

## 💡 使用示例

### 示例 1: 体验代码提示
```javascript
// 输入 "cons" 会提示 "console"
// 输入 "console." 会显示所有可用方法
console.log("Hello");
console.error("Error");
console.warn("Warning");
```

### 示例 2: 体验格式化
```javascript
// 输入未格式化的代码
const obj={name:"Alice",age:25,skills:["JS","React"]};

// 按 Shift+Alt+F 或点击 "Format Code"
// 自动格式化为：
const obj = {
  name: "Alice",
  age: 25,
  skills: ["JS", "React"]
};
```

### 示例 3: 体验注释
```javascript
// 选中代码并按 Ctrl+/
const x = 10;
const y = 20;
// 变成：
// const x = 10;
// const y = 20;
```

### 示例 4: 多光标编辑
- 按住 `Alt` 并点击多个位置
- 同时编辑多处代码
- 按 `Esc` 退出多光标模式

## 🔧 技术实现

### Monaco Editor 配置
```typescript
<Editor
  height="200px"
  language="javascript"
  theme={isDarkMode ? 'vs-dark' : 'vs-light'}
  value={code}
  onChange={(value) => setCode(value || '')}
  options={{
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
    lineNumbers: 'on',
    tabSize: 2,
    wordWrap: 'on',
    formatOnPaste: true,
    formatOnType: true,
    suggestOnTriggerCharacters: true,
    quickSuggestions: true,
    parameterHints: { enabled: true },
    hover: { enabled: true },
  }}
/>
```

### 自定义快捷键
```typescript
// 执行代码
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
  executeCode();
});

// 历史记录导航
editor.addCommand(monaco.KeyCode.UpArrow, () => {
  // 加载上一条命令
});

editor.addCommand(monaco.KeyCode.DownArrow, () => {
  // 加载下一条命令
});
```

## 📊 性能优化

- ✅ **懒加载** - Monaco Editor 按需加载
- ✅ **代码分割** - 不影响首屏加载速度
- ✅ **缓存策略** - 编辑器资源浏览器缓存
- ✅ **最小化配置** - 禁用不必要的功能（如 minimap）

## 🎓 学习资源

- [Monaco Editor 官方文档](https://microsoft.github.io/monaco-editor/)
- [VS Code 快捷键参考](https://code.visualstudio.com/docs/getstarted/keybindings)
- [JavaScript 语言服务](https://github.com/microsoft/TypeScript/wiki/JavaScript-Language-Service-in-Visual-Studio)

## 🚀 下一步

未来可能添加的功能：
- [ ] 自定义代码片段 (Snippets)
- [ ] ESLint 集成
- [ ] 更多语言支持 (TypeScript, Python 等)
- [ ] 自定义主题
- [ ] 协作编辑

---

享受专业级的代码编辑体验！🎉
