import { open } from '@tauri-apps/plugin-opener';

export default {
  id: 'search',
  name: '网页搜索',
  keywords: ['search', '搜索'],
  async execute(query) {
    return [{
      title: `搜索: ${query}`,
      description: '使用 Google 搜索',
      action: () => open(`https://www.google.com/search?q=${encodeURIComponent(query)}`)
    }];
  }
};
