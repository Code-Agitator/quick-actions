import { ComponentType } from 'react';
import {
  // 浏览器
  SiGooglechrome,
  SiFirefoxbrowser,
  SiBrave,
  SiSafari,
  
  // 开发工具
  SiWebstorm,
  SiSublimetext,
  SiGit,
  SiGithub,
  SiGitlab,
  SiDocker,
  SiNodedotjs,
  SiPython,
  SiJavascript,
  SiTypescript,
  SiReact,
  SiVuedotjs,
  SiAngular,
  
  // 通讯
  SiWechat,
  SiTelegram,
  SiSlack,
  SiDiscord,
  
  // 媒体
  SiVlcmediaplayer,
  SiSpotify,
  SiYoutube,
  SiBilibili,
  
  // 设计
  SiFigma,
  SiSketch,
  
  // 游戏
  SiSteam,
  SiEpicgames,
} from 'react-icons/si';

import {
  // 通用图标
  Globe,
  Terminal,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  Gamepad2,
  Settings,
  FolderOpen,
  Search,
  Calculator,
  Mail,
  MessageSquare,
  Smartphone,
  Code,
  Layout,
  Package,
  Layers,
} from 'lucide-react';

/**
 * 应用图标映射配置
 */
export interface AppIconConfig {
  keywords: string[];
  icon: ComponentType<any>;
  color?: string;
}

/**
 * 应用图标映射表
 */
export const APP_ICON_MAP: AppIconConfig[] = [
  // 浏览器
  { keywords: ['chrome', '谷歌浏览器'], icon: SiGooglechrome, color: '#4285F4' },
  { keywords: ['firefox', '火狐'], icon: SiFirefoxbrowser, color: '#FF7139' },
  { keywords: ['edge', 'microsoft edge'], icon: Globe, color: '#0078D7' },
  { keywords: ['brave'], icon: SiBrave, color: '#FB542B' },
  { keywords: ['safari'], icon: SiSafari, color: '#006CFF' },
  
  // 开发工具
  { keywords: ['code', 'vscode', 'visual studio'], icon: Code, color: '#007ACC' },
  { keywords: ['webstorm'], icon: SiWebstorm, color: '#00C6FF' },
  { keywords: ['sublime'], icon: SiSublimetext, color: '#FF9800' },
  { keywords: ['notepad'], icon: FileText, color: '#4CAF50' },
  { keywords: ['git'], icon: SiGit, color: '#F05032' },
  { keywords: ['github'], icon: SiGithub, color: '#181717' },
  { keywords: ['gitlab'], icon: SiGitlab, color: '#FC6D26' },
  { keywords: ['docker'], icon: SiDocker, color: '#2496ED' },
  { keywords: ['node'], icon: SiNodedotjs, color: '#339933' },
  { keywords: ['python'], icon: SiPython, color: '#3776AB' },
  { keywords: ['javascript', 'js'], icon: SiJavascript, color: '#F7DF1E' },
  { keywords: ['typescript', 'ts'], icon: SiTypescript, color: '#3178C6' },
  { keywords: ['react'], icon: SiReact, color: '#61DAFB' },
  { keywords: ['vue'], icon: SiVuedotjs, color: '#4FC08D' },
  { keywords: ['angular'], icon: SiAngular, color: '#DD0031' },
  
  // Office
  { keywords: ['word'], icon: FileText, color: '#2B579A' },
  { keywords: ['excel'], icon: Layout, color: '#217346' },
  { keywords: ['powerpoint', 'ppt'], icon: Layers, color: '#D24726' },
  { keywords: ['outlook', 'mail', '邮件'], icon: Mail, color: '#0078D4' },
  { keywords: ['office'], icon: Package, color: '#D83B01' },
  
  // 通讯
  { keywords: ['wechat', '微信'], icon: SiWechat, color: '#07C160' },
  { keywords: ['qq'], icon: MessageSquare, color: '#12B7F5' },
  { keywords: ['telegram'], icon: SiTelegram, color: '#26A5E4' },
  { keywords: ['slack'], icon: SiSlack, color: '#4A154B' },
  { keywords: ['discord'], icon: SiDiscord, color: '#5865F2' },
  
  // 媒体播放器
  { keywords: ['vlc'], icon: SiVlcmediaplayer, color: '#FF8800' },
  { keywords: ['spotify'], icon: SiSpotify, color: '#1DB954' },
  { keywords: ['网易云音乐', 'netease'], icon: Music, color: '#C20C0C' },
  { keywords: ['qq音乐'], icon: Music, color: '#31C27C' },
  { keywords: ['youtube'], icon: SiYoutube, color: '#FF0000' },
  { keywords: ['bilibili', 'b站'], icon: SiBilibili, color: '#FB7299' },
  { keywords: ['music', '音乐', '音频'], icon: Music, color: '#9C27B0' },
  { keywords: ['video', '视频', '电影'], icon: Video, color: '#F44336' },
  
  // 设计工具
  { keywords: ['photoshop', 'ps'], icon: ImageIcon, color: '#31A8FF' },
  { keywords: ['illustrator', 'ai'], icon: ImageIcon, color: '#FF9A00' },
  { keywords: ['figma'], icon: SiFigma, color: '#F24E1E' },
  { keywords: ['sketch'], icon: SiSketch, color: '#F7B500' },
  
  // 游戏平台
  { keywords: ['steam'], icon: SiSteam, color: '#1B2838' },
  { keywords: ['epic'], icon: SiEpicgames, color: '#313131' },
  { keywords: ['game', '游戏'], icon: Gamepad2, color: '#4CAF50' },
  
  // 系统工具
  { keywords: ['calculator', '计算器'], icon: Calculator, color: '#666666' },
  { keywords: ['terminal', 'cmd', 'powershell', '命令行', '终端'], icon: Terminal, color: '#000000' },
  { keywords: ['settings', '设置', '控制面板'], icon: Settings, color: '#666666' },
  { keywords: ['file', '文件', 'explorer', '资源管理器'], icon: FolderOpen, color: '#FFB300' },
  { keywords: ['search', '搜索'], icon: Search, color: '#4285F4' },
  { keywords: ['image', 'photo', 'picture', '图片', '照片'], icon: ImageIcon, color: '#4285F4' },
];

/**
 * 默认图标
 */
export const DEFAULT_APP_ICON = Smartphone;
export const DEFAULT_APP_ICON_COLOR = '#666666';

/**
 * 根据应用名称获取图标配置
 */
export function getAppIconConfig(appName: string): { icon: ComponentType<any>; color?: string } {
  const nameLower = appName.toLowerCase();
  
  for (const config of APP_ICON_MAP) {
    if (config.keywords.some(keyword => nameLower.includes(keyword.toLowerCase()))) {
      return { icon: config.icon, color: config.color };
    }
  }
  
  return { icon: DEFAULT_APP_ICON, color: DEFAULT_APP_ICON_COLOR };
}
