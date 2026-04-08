# 插件 Vite 配置标准模板

所有 Quick Actions React 插件都应该使用以下标准配置。

## 📋 完整配置

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    // ✅ 必需：替换 process.env 为浏览器兼容的值
    'process.env': JSON.stringify({}),
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      name: 'yourPluginName',  // 改为你的插件名称（camelCase）
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      // ✅ 必需：不要将 react 和 react-dom 标记为 external
      // 让它们被打包进插件 bundle
      output: {
        inlineDynamicImports: true
      }
    }
  }
});
```

## ⚠️ 常见错误配置

### ❌ 错误 1：将 React 标记为 external

```typescript
rollupOptions: {
  external: ['react', 'react-dom'],  // ❌ 错误！
  output: {
    globals: {
      react: 'React',
      'react-dom': 'ReactDOM'
    }
  }
}
```

**后果**: 生成 `import ... from "react"` 语句，导致加载失败。

### ❌ 错误 2：缺少 define 配置

```typescript
export default defineConfig({
  plugins: [react()],
  // 缺少 define 配置  // ❌ 错误！
  build: {
    // ...
  }
});
```

**后果**: `process is not defined` 错误，bundle 体积增大 3 倍。

## ✅ 验证清单

构建后检查以下内容：

### 1. 文件大小

```bash
ls -lh dist/index.js
```

- **正常范围**: 300-400KB (未压缩) / 70-100KB (gzip)
- **异常**: >900KB 说明可能包含了不必要的 polyfill

### 2. 检查第一行

```bash
head -n 1 dist/index.js
```

**✅ 正确**: 
```javascript
function yT(K) {
  return K && K.__esModule && Object.prototype.hasOwnProperty.call(K, "default") ? K.default : K;
}
```

**❌ 错误**:
```javascript
import hS, { useState as up } from "react";
```

### 3. 检查 process 引用

```bash
grep -c "process" dist/index.js
```

- **正常**: 0-5 个（都是 `typeof process` 安全检查）
- **异常**: >10 个说明可能有未替换的 `process.env`

### 4. 在浏览器中测试

1. 重新构建主应用
2. 加载插件
3. 打开浏览器控制台
4. 确认没有错误

## 🔧 自定义配置

### 添加别名

```typescript
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': JSON.stringify({}),
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    // ...
  }
});
```

### 添加 CSS 支持

```typescript
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': JSON.stringify({}),
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  css: {
    modules: {
      localsConvention: 'camelCase'
    }
  },
  build: {
    // ...
  }
});
```

### 优化构建速度

```typescript
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': JSON.stringify({}),
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  esbuild: {
    drop: ['console', 'debugger']  // 生产环境移除 console
  },
  build: {
    minify: 'esbuild',  // 使用 esbuild 压缩（更快）
    // ...
  }
});
```

## 📊 性能对比

| 配置 | Bundle 大小 | 加载时间 | 状态 |
|------|------------|---------|------|
| ✅ 标准配置 | 327KB / 75KB gzip | ~100ms | 推荐 |
| ❌ 缺少 define | 970KB / 215KB gzip | ~300ms | 不推荐 |
| ❌ external React | 加载失败 | - | 错误 |

## 🎯 最佳实践

1. **始终使用脚本创建插件**
   ```bash
   node scripts/create-plugin.js my-plugin
   ```

2. **不要手动修改 vite.config.ts 的关键配置**
   - `define` 配置
   - `external` 配置
   - `inlineDynamicImports`

3. **定期更新依赖**
   ```bash
   cd plugins/my-plugin
   pnpm update
   pnpm build
   ```

4. **保持插件轻量**
   - 避免引入大型第三方库
   - 使用 tree-shaking
   - 按需导入

5. **测试多个环境**
   - 开发环境 (`pnpm dev`)
   - 生产构建 (`pnpm build`)
   - 实际加载测试

## 🔗 参考示例

查看以下插件的正确配置：

- ✅ [everything-search/vite.config.ts](../everything-search/vite.config.ts)
- ✅ [command-runner-ui/vite.config.ts](../command-runner-ui/vite.config.ts)

## 📚 相关文档

- [故障排除指南](TROUBLESHOOTING.md)
- [插件开发指南](../PLUGIN_GUIDE.md)
- [Vite Library Mode](https://vite.dev/guide/build.html#library-mode)
