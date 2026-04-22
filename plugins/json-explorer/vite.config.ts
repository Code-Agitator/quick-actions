import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    // 替换 process.env 为浏览器兼容的值
    'process.env': JSON.stringify({}),
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      name: 'jsonExplorer',
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      // 不要将 react 和 react-dom 标记为 external
      // 让它们被打包进插件 bundle
      output: {
        inlineDynamicImports: true
      }
    },
    // Watch 模式配置
    watch: {
      exclude: 'node_modules/**'
    }
  }
});
