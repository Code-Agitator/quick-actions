/**
 * 文件浏览器插件 - 增强版
 * 支持文件浏览、搜索、预览等功能
 */
export default {
  id: 'file-browser',
  name: '文件浏览器',
  version: '2.0.0',
  description: '功能完整的文件浏览器，支持浏览、搜索和文件操作',
  icon: '📁',
  keywords: ['file', '文件', 'browse', '浏览', 'dir', '目录', 'folder', '文件夹'],
  
  /**
   * 渲染文件浏览器 UI
   */
  render({ query, onResult }) {
    console.log('=== File Browser Render Start ===');
    console.log('window.ACTIONS available:', !!window.ACTIONS);
    console.log('window.ACTIONS.fs available:', !!window.ACTIONS?.fs);
    
    const container = document.createElement('div');
    container.className = 'min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-6';
    
    // 内容包装器
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'max-w-6xl mx-auto space-y-4';
    
    // 标题栏
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between mb-6';
    header.innerHTML = `
      <h1 class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        📁 文件浏览器
      </h1>
      <div class="flex gap-2">
        <button id="refresh-btn" class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
          🔄 刷新
        </button>
        <button id="home-btn" class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors">
          🏠 主页
        </button>
      </div>
    `;
    contentWrapper.appendChild(header);
    
    // 路径导航栏
    const navBar = document.createElement('div');
    navBar.className = 'bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-3';
    
    // 当前路径显示
    const pathDisplay = document.createElement('div');
    pathDisplay.id = 'current-path';
    pathDisplay.className = 'flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600';
    pathDisplay.innerHTML = `
      <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">📍 当前位置:</span>
      <input 
        type="text" 
        id="path-input" 
        class="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white font-mono text-sm"
        placeholder="输入路径..."
      />
    `;
    navBar.appendChild(pathDisplay);
    
    // 面包屑导航
    const breadcrumbs = document.createElement('div');
    breadcrumbs.id = 'breadcrumbs';
    breadcrumbs.className = 'flex items-center gap-2 flex-wrap text-sm';
    navBar.appendChild(breadcrumbs);
    
    contentWrapper.appendChild(navBar);
    
    // 搜索栏
    const searchBar = document.createElement('div');
    searchBar.className = 'bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4';
    searchBar.innerHTML = `
      <div class="flex gap-2">
        <input
          type="text"
          id="search-input"
          class="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          placeholder="搜索文件..."
        />
        <button id="search-btn" class="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
          🔍 搜索
        </button>
      </div>
    `;
    contentWrapper.appendChild(searchBar);
    
    // 统计信息
    const statsBar = document.createElement('div');
    statsBar.id = 'stats-bar';
    statsBar.className = 'flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 px-2';
    statsBar.innerHTML = `
      <span id="file-count">共 0 个文件</span>
      <span id="folder-count">共 0 个文件夹</span>
    `;
    contentWrapper.appendChild(statsBar);
    
    // 文件列表
    const fileListContainer = document.createElement('div');
    fileListContainer.className = 'bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden';
    
    const fileList = document.createElement('div');
    fileList.id = 'file-list';
    fileList.className = 'divide-y divide-gray-200 dark:divide-gray-700';
    fileListContainer.appendChild(fileList);
    
    contentWrapper.appendChild(fileListContainer);
    
    // 错误提示
    const errorDiv = document.createElement('div');
    errorDiv.id = 'error-message';
    errorDiv.className = 'hidden bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg';
    contentWrapper.insertBefore(errorDiv, fileListContainer);
    
    // 加载状态
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading';
    loadingDiv.className = 'hidden text-center py-8';
    loadingDiv.innerHTML = '<div class="text-2xl">⏳ 加载中...</div>';
    contentWrapper.insertBefore(loadingDiv, fileListContainer);
    
    container.appendChild(contentWrapper);
    
    // 状态管理
    let currentPath = '';
    let allFiles = [];
    let pathHistory = [];
    
    // DOM 元素引用
    const getEl = (id) => document.getElementById(id);
    
    // 显示错误
    function showError(message) {
      const errorEl = getEl('error-message');
      errorEl.textContent = `❌ ${message}`;
      errorEl.classList.remove('hidden');
      setTimeout(() => errorEl.classList.add('hidden'), 5000);
    }
    
    // 隐藏错误
    function hideError() {
      getEl('error-message').classList.add('hidden');
    }
    
    // 显示/隐藏加载
    function setLoading(loading) {
      getEl('loading').classList.toggle('hidden', !loading);
      getEl('file-list').classList.toggle('hidden', loading);
    }
    
    // 格式化路径
    function formatPath(path) {
      return path.replace(/\\/g, '\\\\');
    }
    
    // 更新面包屑
    function updateBreadcrumbs(path) {
      const breadcrumbsEl = getEl('breadcrumbs');
      const parts = path.split(/[\\/]/).filter(p => p);
      
      let html = '<button onclick="window.__fileBrowser.loadDirectory(\'/\')" class="text-blue-600 hover:underline">根目录</button>';
      
      let currentPath = '';
      parts.forEach((part, index) => {
        currentPath += part + '/';
        if (index === parts.length - 1) {
          html += `<span class="text-gray-400">/</span><span class="text-gray-900 dark:text-white font-medium">${part}</span>`;
        } else {
          html += `<span class="text-gray-400">/</span><button onclick="window.__fileBrowser.loadDirectory('${currentPath}')" class="text-blue-600 hover:underline">${part}</button>`;
        }
      });
      
      breadcrumbsEl.innerHTML = html;
    }
    
    // 更新统计
    function updateStats(files) {
      const fileCount = files.filter(f => !f.isDirectory).length;
      const folderCount = files.filter(f => f.isDirectory).length;
      
      getEl('file-count').textContent = `共 ${fileCount} 个文件`;
      getEl('folder-count').textContent = `共 ${folderCount} 个文件夹`;
    }
    
    // 获取文件图标
    function getFileIcon(filename, isDir) {
      if (isDir) return '📁';
      const ext = filename.split('.').pop().toLowerCase();
      const icons = {
        'js': '📜', 'ts': '📘', 'tsx': '⚛️', 'jsx': '⚛️',
        'py': '🐍', 'java': '☕', 'cpp': '⚙️', 'c': '⚙️', 'h': '⚙️',
        'html': '🌐', 'css': '🎨', 'json': '📋', 'xml': '📄',
        'md': '📝', 'txt': '📃', 'pdf': '📕', 'doc': '📘', 'docx': '📘',
        'xls': '📊', 'xlsx': '📊', 'ppt': '📽️', 'pptx': '📽️',
        'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'svg': '🎨',
        'mp3': '🎵', 'wav': '🎵', 'mp4': '🎬', 'avi': '🎬', 'mov': '🎬',
        'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦', 'gz': '📦',
        'exe': '💿', 'msi': '💿', 'bat': '⚡', 'sh': '⚡'
      };
      return icons[ext] || '📄';
    }
    
    // 获取文件大小描述
    function formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    // 渲染文件列表
    function renderFileList(files, path) {
      const fileListEl = getEl('file-list');
      
      if (!files || files.length === 0) {
        fileListEl.innerHTML = '<div class="p-8 text-center text-gray-500">📭 此目录为空</div>';
        return;
      }
      
      // 排序：文件夹在前，然后按名称排序
      files.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      
      let html = files.map(file => {
        const icon = getFileIcon(file.name, file.isDirectory);
        const size = file.isDirectory ? '-' : formatFileSize(file.size || 0);
        const modified = file.modified ? new Date(file.modified).toLocaleDateString('zh-CN') : '';
        
        return `
          <div class="file-item group flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors" data-path="${file.path}" data-is-dir="${file.isDirectory}">
            <span class="text-2xl">${icon}</span>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-gray-900 dark:text-white truncate">${file.name}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 flex gap-4">
                <span>${size}</span>
                <span>${modified}</span>
              </div>
            </div>
            <button class="opacity-0 group-hover:opacity-100 px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-opacity" onclick="event.stopPropagation(); window.__fileBrowser.copyPath('${file.path}')">
              📋 复制路径
            </button>
          </div>
        `;
      }).join('');
      
      fileListEl.innerHTML = html;
      
      // 绑定点击事件
      fileListEl.querySelectorAll('.file-item').forEach(item => {
        item.addEventListener('click', () => {
          const path = item.dataset.path;
          const isDir = item.dataset.isDir === 'true';
          
          if (isDir) {
            loadDirectory(path);
          } else {
            // 如果是文件，可以打开或复制路径
            copyPath(path);
            showNotification(`已复制文件路径：${path}`);
          }
        });
      });
    }
    
    // 显示通知
    function showNotification(message) {
      const notification = document.createElement('div');
      notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce';
      notification.textContent = message;
      container.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    }
    
    // 复制路径到剪贴板
    function copyPath(path) {
      navigator.clipboard.writeText(path).then(() => {
        showNotification('路径已复制到剪贴板');
      });
    }
    
    // 加载目录
    async function loadDirectory(path) {
      try {
        hideError();
        setLoading(true);
        currentPath = path;
        
        const pathInput = getEl('path-input');
        if (pathInput) pathInput.value = path;
        
        updateBreadcrumbs(path);
        
        // 检查 ACTIONS API 是否可用
        if (!window.ACTIONS || !window.ACTIONS.fs) {
          throw new Error('ACTIONS API 不可用。请确保应用正在正常运行。');
        }
        
        // 调用 ACTIONS API 获取文件列表
        const files = await window.ACTIONS.fs.listDir(path);
        
        allFiles = files;
        renderFileList(files, path);
        updateStats(files);
        
        setLoading(false);
      } catch (error) {
        console.error('Load directory error:', error);
        showError(`加载目录失败：${error.message || error}`);
        setLoading(false);
      }
    }
    
    // 搜索文件
    async function searchFiles(query, path) {
      try {
        hideError();
        setLoading(true);
        
        // 检查 ACTIONS API 是否可用
        if (!window.ACTIONS || !window.ACTIONS.fs) {
          throw new Error('ACTIONS API 不可用。请确保应用正在正常运行。');
        }
        
        // 调用 ACTIONS API 搜索文件
        const results = await window.ACTIONS.fs.searchFiles(path, query, 100);
        
        renderFileList(results, `搜索结果：${query}`);
        updateStats(results);
        
        setLoading(false);
      } catch (error) {
        showError(`搜索失败：${error.message || error}`);
        setLoading(false);
      }
    }
    
    // 全局暴露
    window.__fileBrowser = {
      loadDirectory,
      copyPath
    };
    
    // 绑定事件
    
    // 等待 DOM 渲染完成
    setTimeout(() => {
      // 路径输入回车
      const pathInput = getEl('path-input');
      if (pathInput) {
        pathInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            loadDirectory(e.target.value);
          }
        });
      }
      
      // 刷新按钮
      const refreshBtn = getEl('refresh-btn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          loadDirectory(currentPath);
        });
      }
      
      // 主页按钮
      const homeBtn = getEl('home-btn');
      if (homeBtn) {
        homeBtn.addEventListener('click', () => {
          const homePath = 'C:\\Users';
          loadDirectory(homePath);
        });
      }
      
      // 搜索按钮
      const searchBtn = getEl('search-btn');
      if (searchBtn) {
        searchBtn.addEventListener('click', () => {
          const query = getEl('search-input').value.trim();
          if (query) {
            searchFiles(query, currentPath);
          }
        });
      }
      
      // 搜索框回车
      const searchInput = getEl('search-input');
      if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            const query = e.target.value.trim();
            if (query) {
              searchFiles(query, currentPath);
            }
          }
        });
      }
      
      console.log('Event listeners bound successfully');
    }, 100);
    
    // 初始加载
    const defaultPath = 'C:\\Users';
    loadDirectory(defaultPath);
    
    console.log('=== File Browser Render End ===');
    
    return container;
  },
  
  /**
   * 执行搜索
   */
  async execute(query) {
    if (!query) return [];
    
    // 快速路径访问
    if (query.startsWith('C:') || query.startsWith('/') || query.includes('\\')) {
      return [{
        title: `📁 打开目录：${query}`,
        description: '在文件浏览器中打开此路径',
        action: () => console.log('Open path:', query)
      }];
    }
    
    return [];
  }
};
