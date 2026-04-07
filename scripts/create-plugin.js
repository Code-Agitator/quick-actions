#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pluginName = process.argv[2];
if (!pluginName) {
  console.error('❌ Usage: node scripts/create-plugin.js <plugin-name>');
  console.error('   Example: node scripts/create-plugin.js hello-world');
  process.exit(1);
}

const pluginDir = path.join(__dirname, '..', 'plugins', pluginName);
const srcDir = path.join(pluginDir, 'src');

console.log(`🚀 Creating plugin: ${pluginName}`);
console.log(`📁 Location: ${pluginDir}\n`);

// 检查是否已存在
if (fs.existsSync(pluginDir)) {
  console.error(`❌ Plugin "${pluginName}" already exists!`);
  process.exit(1);
}

// 创建目录结构
console.log('📂 Creating directory structure...');
fs.mkdirSync(srcDir, { recursive: true });

// 创建 package.json
console.log('📄 Creating package.json...');
const packageJson = {
  name: `@quick-actions/plugin-${pluginName}`,
  version: '1.0.0',
  type: 'module',
  description: `A Quick Actions plugin - ${pluginName}`,
  scripts: {
    dev: 'vite',
    build: 'vite build',
    preview: 'vite preview'
  },
  dependencies: {
    react: '^19.0.0',
    'react-dom': '^19.0.0'
  },
  devDependencies: {
    '@types/react': '^19.0.0',
    '@types/react-dom': '^19.0.0',
    '@vitejs/plugin-react': '^4.3.0',
    typescript: '^5.7.0',
    vite: '^6.0.0'
  }
};

fs.writeFileSync(
  path.join(pluginDir, 'package.json'),
  JSON.stringify(packageJson, null, 2) + '\n'
);

// 创建 vite.config.ts
console.log('⚙️  Creating vite.config.ts...');
const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      name: '${pluginName.replace(/-([a-z])/g, (g) => g[1].toUpperCase())}',
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
});
`;

fs.writeFileSync(path.join(pluginDir, 'vite.config.ts'), viteConfig);

// 创建 tsconfig.json
console.log('📝 Creating tsconfig.json...');
const tsconfig = `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
`;

fs.writeFileSync(path.join(pluginDir, 'tsconfig.json'), tsconfig);

// 创建 tsconfig.node.json
const tsconfigNode = `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
`;

fs.writeFileSync(path.join(pluginDir, 'tsconfig.node.json'), tsconfigNode);

// 创建 src/App.tsx
console.log('⚛️  Creating React component...');
const appTsx = `import React from 'react';

interface AppProps {
  query?: string;
  onResult?: (result: any) => void;
}

const App: React.FC<AppProps> = ({ query, onResult }) => {
  const [count, setCount] = React.useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Hello from ${pluginName}! 👋
        </h1>
        
        <p className="text-lg text-gray-600 mb-6">
          This is a standalone React plugin for Quick Actions.
        </p>
        
        {query && (
          <div className="mb-4 p-4 bg-white rounded-lg shadow">
            <p className="text-gray-700">
              <strong>Search Query:</strong> {query}
            </p>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Interactive Demo</h2>
          <p className="text-gray-600 mb-4">
            Count: <span className="font-mono text-2xl text-blue-600">{count}</span>
          </p>
          
          <button
            onClick={() => setCount(count + 1)}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            Click Me! 🎉
          </button>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
          <p className="text-sm text-yellow-800">
            💡 <strong>Tip:</strong> You can use any React features here, 
            including hooks, context, and third-party libraries!
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
`;

fs.writeFileSync(path.join(srcDir, 'App.tsx'), appTsx);

// 创建 src/index.tsx
console.log('📦 Creating entry point...');
const indexTsx = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * Render the plugin UI
 * @param options - Plugin options
 * @returns DOM element containing the plugin UI
 */
export function render({ query, onResult }: { query?: string; onResult?: (result: any) => void }) {
  // Create container
  const container = document.createElement('div');
  container.id = '${pluginName}-root';
  container.className = 'plugin-container';
  
  // Render React component
  const root = ReactDOM.createRoot(container);
  root.render(<App query={query} onResult={onResult} />);
  
  return container;
}

/**
 * Plugin metadata
 */
export const metadata = {
  id: '${pluginName}',
  name: '${pluginName.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase())}',
  version: '1.0.0',
  description: 'A standalone React plugin for Quick Actions'
};

// Default export for compatibility
export default { render, metadata };
`;

fs.writeFileSync(path.join(srcDir, 'index.tsx'), indexTsx);

// 创建 plugin.json
console.log('📋 Creating plugin.json...');
const pluginJson = {
  id: pluginName,
  name: pluginName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
  version: '1.0.0',
  description: `A standalone React plugin - ${pluginName}`,
  author: 'Your Name',
  entry: 'dist/index.js',
  icon: '🔌',
  keywords: [pluginName, 'react', 'plugin']
};

fs.writeFileSync(
  path.join(pluginDir, 'plugin.json'),
  JSON.stringify(pluginJson, null, 2) + '\n'
);

// 创建 .gitignore
const gitignore = `node_modules/
dist/
*.log
.DS_Store
`;

fs.writeFileSync(path.join(pluginDir, '.gitignore'), gitignore);

console.log('\n✅ Plugin created successfully!\n');
console.log(`📂 Location: ${pluginDir}`);
console.log('\n🚀 Next steps:');
console.log(`   1. cd plugins/${pluginName}`);
console.log('   2. pnpm install');
console.log('   3. pnpm dev          # Start development server');
console.log('   4. pnpm build        # Build for production\n');
