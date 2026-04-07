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
      name: 'commandRunnerUi',
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      // 不要将 react 标记为 external，直接打包进去
      // external: ['react', 'react-dom'],
      // output: {
      //   globals: {
      //     react: 'React',
      //     'react-dom': 'ReactDOM'
      //   }
      // }
    }
  }
});
