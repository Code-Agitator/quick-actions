# Everything 插件升级说明

## 概述

Everything 搜索插件已从基础文件搜索功能升级为完整的文件管理和预览工具，实现了类似专业文件管理器的全部功能（除了 AI 搜索）。

## 新增功能

### 1. 左侧筛选面板 📋

支持按文件类型快速筛选：
- **全部** - 显示所有文件和文件夹
- **文件夹** - 只显示文件夹
- **EXCEL** - Excel 文件 (.xlsx, .xls, .xlsm, .csv)
- **WORD** - Word 文件 (.docx, .doc, .rtf, .txt)
- **PPT** - PowerPoint 文件 (.pptx, .ppt, .ppsx)
- **PDF** - PDF 文件 (.pdf)
- **图片** - 图片文件 (.jpg, .png, .gif, .bmp, .ico, .svg, .webp, .tiff)
- **视频** - 视频文件 (.mp4, .avi, .mkv, .mov, .wmv, .flv, .webm)
- **音频** - 音频文件 (.mp3, .wav, .flac, .aac, .ogg, .wma, .m4a)
- **压缩文件** - 压缩包 (.zip, .rar, .7z, .tar, .gz, .bz2, .xz)

### 2. 文件预览面板 📄

右侧提供文件内容预览功能：
- **自动编码检测** - 使用 chardetng 库自动检测文件编码（UTF-8, GBK, ASCII 等）
- **支持多种文本格式** - .txt, .md, .json, .xml, .yaml, .js, .ts, .py, .rs, .go, .html, .css, .csv, .log 等
- **大小限制** - 默认最大预览 100KB，防止大文件导致性能问题
- **截断提示** - 大文件会显示"已截断"提示
- **行数统计** - 显示文件总行数

### 3. 搜索关键词高亮 ✨

- 搜索结果中的文件名自动高亮匹配关键词
- 使用黄色背景高亮显示
- 不区分大小写

### 4. 排序功能 📊

支持多种排序方式：
- **修改时间 ↓** - 最新修改的文件排在前面
- **修改时间 ↑** - 最早修改的文件排在前面
- **名称 A-Z** - 按文件名升序排列
- **名称 Z-A** - 按文件名降序排列
- **大小 ↓** - 大文件排在前面
- **大小 ↑** - 小文件排在前面

### 5. 底部状态栏 📌

显示丰富的搜索信息：
- **结果统计** - 显示找到的文件总数
- **当前筛选类型** - 显示当前激活的文件类型筛选
- **排序选择器** - 快速切换排序方式
- **预览开关** - 一键开启/关闭文件预览面板

### 6. 键盘导航 ⌨️

- **↑ ↓** - 上下选择搜索结果
- **Enter** - 打开选中的文件/文件夹
- **双击** - 打开文件/文件夹

## 后端新增 Commands

### everything_search_extended
高级搜索命令，支持类型筛选和排序。

```typescript
await window.__TAURI__.invoke('everything_search_extended', {
  pluginId: 'everything-search',
  query: 'keyword',
  filter: 'All', // All | Folder | Excel | Word | PPT | PDF | Image | Video | Audio | Archive
  sortBy: 'DateDesc', // DateDesc | DateAsc | NameAsc | NameDesc | SizeDesc | SizeAsc
  maxResults: 100
});
```

### preview_file_content
文件预览命令，自动检测编码并读取文件内容。

```typescript
await window.__TAURI__.invoke('preview_file_content', {
  pluginId: 'everything-search',
  filePath: 'D:\\file.txt',
  maxSize: 100_000 // 可选，默认 100KB
});
```

返回数据结构：
```typescript
{
  content: string,      // 文件内容
  encoding: string,     // 编码名称（如 "UTF-8", "GBK"）
  size: number,         // 文件大小（字节）
  lines: number,        // 行数
  truncated: boolean,   // 是否被截断
  mime_type: string     // MIME 类型
}
```

### get_file_info
获取文件详细信息。

```typescript
await window.__TAURI__.invoke('get_file_info', {
  pluginId: 'everything-search',
  filePath: 'D:\\file.txt'
});
```

### plugin_everything_open
打开文件或文件夹（使用系统默认程序）。

```typescript
await window.__TAURI__.invoke('plugin_everything_open', {
  pluginId: 'everything-search',
  filePath: 'D:\\file.txt'
});
```

## 新增 Rust 模块

### everything_ext.rs
全新的 Everything 扩展模块（398 行），提供：

1. **FileFilter 枚举** - 文件类型过滤器，自动生成 Everything 查询后缀
2. **SortBy 枚举** - 排序选项
3. **SearchResultExtended 结构体** - 扩展的搜索结果（包含文件类型信息）
4. **FilePreview 结构体** - 文件预览结果
5. **FileInfo 结构体** - 文件详细信息
6. **编码检测** - 使用 chardetng 库自动检测文件编码
7. **MIME 类型猜测** - 根据扩展名判断文件 MIME 类型
8. **文件大小格式化** - 自动转换为 B/KB/MB/GB

## 依赖更新

### Cargo.toml
新增依赖：
```toml
chardetng = "0.1"    # 编码检测库
thiserror = "1.0"    # 错误处理
```

## UI 设计

采用类似 Visual Studio Code 的深色主题：
- **主背景色**: #1e1e1e
- **面板背景色**: #252526
- **边框色**: #3e3e42
- **选中高亮**: #094771
- **状态栏**: #007acc（蓝色）

## 性能优化

1. **防抖搜索** - 300ms 防抖，避免频繁搜索
2. **预览限制** - 文件预览最大 100KB，防止大文件卡顿
3. **UTF-8 优化** - 使用严格的 UTF-8 解码，失败时降级为 lossy 转换
4. **异步操作** - 所有文件操作均为异步，不阻塞 UI

## 文件结构

```
src-tauri/src/
├── everything_cli.rs      # Everything CLI 封装（177 行）
├── everything_ext.rs      # Everything 扩展功能（436 行）
├── commands.rs            # 主命令文件（新增 UTF-8 解码修复）
└── lib.rs                 # 注册新 Commands

plugins/everything-search/
├── src/
│   ├── App.tsx            # 主组件（446 行，完全重写）
│   └── global.d.ts        # TypeScript 类型声明
└── ...
```

## 使用方法

1. 启动 Quick Actions 应用
2. 打开 Everything 搜索插件
3. 在搜索框输入关键词
4. 点击左侧筛选按钮快速过滤文件类型
5. 点击搜索结果查看文件预览
6. 使用底部状态栏切换排序方式和预览开关
7. 按 Enter 或双击打开文件

## 技术亮点

1. **类型安全的 Rust 封装** - 所有参数和返回值都有明确的类型定义
2. **自动编码检测** - 使用业界领先的 chardetng 库
3. **响应式设计** - 左侧筛选 + 中间结果 + 右侧预览的三栏布局
4. **实时搜索** - 300ms 防抖，输入即搜索
5. **跨平台兼容** - 支持 Windows/Mac/Linux 的文件打开方式

## 注意事项

1. 需要安装 Everything 软件并运行后台服务
2. es.exe 需要正确配置为 Sidecar
3. 文件预览仅支持文本文件，二进制文件不会预览
4. 大文件（>100KB）会被截断预览

## 未来计划

- [ ] AI 搜索功能（已排除在本次升级外）
- [ ] 图片缩略图预览
- [ ] 文件批量操作
- [ ] 搜索结果导出
- [ ] 自定义文件类型筛选
- [ ] 搜索历史保存

## 版本历史

### v2.0.0 (当前版本)
- ✅ 左侧文件类型筛选面板
- ✅ 文件内容预览（自动编码检测）
- ✅ 搜索关键词高亮
- ✅ 多字段排序（时间/名称/大小）
- ✅ 底部状态栏（结果统计/排序/预览开关）
- ✅ 键盘导航优化
- ✅ 全新的深色主题 UI

### v1.2.0
- ✅ 基础文件搜索
- ✅ es.exe CLI 集成
- ✅ UTF-8 中文支持
