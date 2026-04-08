# 插件开发常见问题

## ❌ 错误：process is not defined

### 问题描述

加载插件时出现以下错误：

```
Failed to import plugin module: ReferenceError: process is not defined
```

### 原因分析

React 19 和一些第三方库在代码中使用了 `process.env`，但浏览器环境中没有定义 `process` 变量。

### 解决方案

**在 `vite.config.ts` 中添加 `define` 配置：**

```typescript
export default defineConfig({
  plugins: [react()],
  define: {
    // 替换 process.env 为浏览器兼容的值
    'process.env': JSON.stringify({}),
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  build: {
    // ... 其他配置
  }
});
```

这会将所有 `process.env` 引用替换为空对象，避免运行时错误。

### 效果

添加此配置后，插件 bundle 大小会显著减小：
- **之前**: ~970KB (包含完整的 process polyfill)
- **之后**: ~327KB (gzip 后约 75KB) ✅

---

## ❌ 错误：Failed to resolve module specifier "react"

### 问题描述

加载插件时出现以下错误：

```
Failed to import plugin module: TypeError: Failed to resolve module specifier "react". 
Relative references must start with either "/", "./", or "../".
```

### 原因分析

这是因为 Vite 构建时将 React 标记为外部依赖（external），导致生成的 bundle 中仍然包含 `import ... from "react"` 语句。但插件是通过 Blob URL 动态导入的，浏览器无法解析这些外部模块。

### 解决方案

**修改 `vite.config.ts`，不要将 React 标记为 external：**

```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      name: 'yourPluginName',
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      // ✅ 正确：不要将 react 和 react-dom 标记为 external
      // 让它们被打包进插件 bundle
      output: {
        inlineDynamicImports: true
      }
    }
  }
});
```

**❌ 错误的配置：**

```typescript
rollupOptions: {
  external: ['react', 'react-dom'],  // ❌ 不要这样做
  output: {
    globals: {
      react: 'React',
      'react-dom': 'ReactDOM'
    }
  }
}
```

### 为什么？

Quick Actions 的插件系统通过以下方式加载插件：

1. 从后端读取插件文件内容
2. 创建 Blob URL
3. 使用 `import()` 动态导入

```typescript
const blob = new Blob([pluginContent], { type: 'application/javascript' });
const url = URL.createObjectURL(blob);
const module = await import(/* @vite-ignore */ url);
```

由于是 Blob URL，浏览器无法解析外部的 `import` 语句，所以所有依赖必须被打包进同一个 bundle。

### 文件大小

将 React 打包进去后，插件 bundle 大小会增加约 900KB：

- React + ReactDOM: ~850KB (未压缩)
- 插件代码: ~50-100KB
- **总计**: ~950KB (gzip 后约 200-250KB)

这是可以接受的，因为：
1. 插件只在需要时加载
2. 现代网络环境下，200KB 的 gzip 压缩文件加载很快
3. 避免了复杂的依赖管理

### 验证修复

重新构建插件后，检查 `dist/index.js` 的第一行：

**✅ 正确的输出：**
```javascript
// 没有 import 语句，直接是函数定义
function yT(K) {
  return K && K.__esModule && Object.prototype.hasOwnProperty.call(K, "default") ? K.default : K;
}
```

**❌ 错误的输出：**
```javascript
// 仍有外部导入
import hS, { useState as up, useEffect as z2 } from "react";
import N2 from "react-dom";
```

### 其他插件参考

查看以下插件的正确配置：
- `plugins/everything-search/vite.config.ts`
- `plugins/command-runner-ui/vite.config.ts`

## 📝 最佳实践

### 1. 使用脚本创建插件

始终使用提供的脚本创建新插件：

```bash
node scripts/create-plugin.js my-plugin
```

脚本会自动生成正确的 `vite.config.ts` 配置。

### 2. 不要手动修改 external 配置

除非你非常清楚自己在做什么，否则不要将任何依赖标记为 external。

### 3. 定期更新依赖

```bash
cd plugins/your-plugin
pnpm update
pnpm build
```

### 4. 调试技巧

如果遇到问题，可以：

1. 检查构建产物第一行是否有 `import` 语句
2. 在浏览器控制台查看网络请求
3. 启用 Debug 面板查看详细日志

## 🔗 相关资源

- [Vite Library Mode](https://vite.dev/guide/build.html#library-mode)
- [Rollup External Dependencies](https://rollupjs.org/configuration-options/#external)
- [Quick Actions 插件开发指南](../PLUGIN_GUIDE.md)
