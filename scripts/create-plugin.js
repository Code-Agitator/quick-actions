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
    preview: 'vite preview',
    pack: 'node ./scripts/pack-plugin.js'
  },
  dependencies: {
    react: '^19.0.0',
    'react-dom': '^19.0.0'
  },
  devDependencies: {
    '@types/react': '^19.0.0',
    '@types/react-dom': '^19.0.0',
    '@vitejs/plugin-react': '^4.3.0',
    archiver: '^8.0.0',
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
  define: {
    // 替换 process.env 为浏览器兼容的值
    'process.env': JSON.stringify({}),
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      name: '${pluginName.replace(/-([a-z])/g, (g) => g[1].toUpperCase())}',
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      // 不要将 react 和 react-dom 标记为 external
      // 让它们被打包进插件 bundle
      output: {
        inlineDynamicImports: true
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

// 创建 src/types/plugin.d.ts (类型定义)
console.log('🛡️  Creating type definitions...');
const typesDir = path.join(srcDir, 'types');
fs.mkdirSync(typesDir, { recursive: true });

const pluginTypes = `/**
 * Quick Actions Plugin API Types
 * 
 * This file provides robust type inference for the plugin environment.
 */

export interface PluginAPI {
  fs: {
    /** Read file content from allowed paths */
    readFile: (path: string) => Promise<string>;
    /** Write content to a file in allowed paths */
    writeFile: (path: string, content: string) => Promise<void>;
    /** List directory contents */
    listDir: (path: string) => Promise<string[]>;
  };
  shell: {
    /** Execute a system command with arguments */
    execute: (command: string, args?: string[]) => Promise<string>;
  };
  notification: {
    /** Show a system notification */
    show: (title: string, body: string) => Promise<void>;
  };
  clipboard: {
    /** Write text to clipboard */
    writeText: (text: string) => Promise<void>;
    /** Read text from clipboard */
    readText: () => Promise<string>;
  };
}

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  icon?: string;
  keywords?: string[];
}

export interface PluginResult {
  title: string;
  description?: string;
  icon?: string;
  action?: () => void | Promise<void>;
  customUI?: any; // For React components
}

export interface PluginModule {
  metadata: PluginMetadata;
  render?: (options: { query?: string; onResult?: (result: PluginResult) => void }) => HTMLElement;
  execute?: (query: string, api: PluginAPI) => Promise<PluginResult[]>;
}
`;

fs.writeFileSync(path.join(srcDir, 'types', 'plugin.d.ts'), pluginTypes);

// 创建 src/index.tsx
console.log('📦 Creating entry point...');
const indexTsx = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import type { PluginModule, PluginResult, PluginAPI } from './types/plugin';

/**
 * Render the plugin UI
 * @param options - Plugin options including search query and result callback
 */
export function render({ query, onResult }: { query?: string; onResult?: (result: PluginResult) => void }) {
  const container = document.createElement('div');
  container.id = '${pluginName}-root';
  container.className = 'plugin-container h-full w-full';
  
  const root = ReactDOM.createRoot(container);
  root.render(<App query={query} onResult={onResult} />);
  
  return container;
}

/**
 * Optional: Handle search queries directly without UI
 * @param query - The user's search input
 * @param api - The secure plugin API instance
 */
export async function execute(query: string, api: PluginAPI): Promise<PluginResult[]> {
  // Example: Return a simple result
  return [
    {
      title: 'Hello ${pluginName}',
      description: \`You searched for: \${query}\`,
      icon: '✨',
      action: () => {
        console.log('Action triggered!');
      }
    }
  ];
}

export const metadata = {
  id: '${pluginName}',
  name: '${pluginName.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase())}',
  version: '1.0.0',
  description: 'A standalone React plugin for Quick Actions'
};

export default { render, execute, metadata };
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

// Create .gitignore
const gitignore = `node_modules/
dist/
*.zip
*.log
.DS_Store
`;

fs.writeFileSync(path.join(pluginDir, '.gitignore'), gitignore);

// Create scripts directory and copy pack script
console.log('📦 Creating standalone pack script...');
const scriptsDir = path.join(pluginDir, 'scripts');
fs.mkdirSync(scriptsDir, { recursive: true });
const templatePath = path.join(__dirname, 'templates', 'pack-plugin-standalone.js');
const destPath = path.join(scriptsDir, 'pack-plugin.js');
fs.copyFileSync(templatePath, destPath);

// 创建 README.md
console.log('📖 Creating README.md...');
const readme = `# ${pluginName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}

## 🚀 Development

1. Install dependencies: \`pnpm install\`
2. Start dev server: \`pnpm dev\`
3. Build for production: \`pnpm build\`

## 🛠️ Built-in API Capabilities

The plugin environment provides a secure \`api\` object with the following capabilities:

### File System (\`api.fs\`)
- \`readFile(path: string)\`: Read content from allowed paths.
- \`writeFile(path: string, content: string)\`: Write content to files.
- \`listDir(path: string)\`: List directory contents.

### Shell Execution (\`api.shell\`)
- \`execute(command: string, args?: string[])\`: Run system commands securely.

### Notifications (\`api.notification\`)
- \`show(title: string, body: string)\`: Display system notifications.

### Clipboard (\`api.clipboard\`)
- \`writeText(text: string)\`: Copy text to clipboard.
- \`readText()\`: Read text from clipboard.

## 📦 Packaging

To distribute your plugin, pack it into a ZIP file:

\`\`\`bash
pnpm pack
\`\`\`

This will create \`{plugin-id}-{version}.zip\` in the plugin root directory.

## 📝 Usage Example

\`\`\`typescript
export async function execute(query: string, api: PluginAPI) {
  const results = await api.fs.listDir('/some/path');
  return results.map(r => ({ title: r }));
}
\`\`\`
`;

fs.writeFileSync(path.join(pluginDir, 'README.md'), readme);

console.log('\n✅ Plugin created successfully!\n');
console.log(`📂 Location: ${pluginDir}`);
console.log('\n🚀 Next steps:');
console.log(`   1. cd plugins/${pluginName}`);
console.log('   2. pnpm install');
console.log('   3. pnpm dev          # Start development server');
console.log('   4. pnpm build        # Build for production');
console.log('   5. pnpm pack         # Pack plugin into ZIP file\n');
