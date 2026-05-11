# 项目约定

> 本文档由 CodeReview-Agent 自动维护，记录经过验证的最佳实践和规范。
> 最后更新时间：2026-05-10
> 版本：v1.2

## 1. 架构规范
[由 CodeReview-Agent 自动填充]

## 2. 代码质量规范
[由 CodeReview-Agent 自动填充]

## 3. 命名约定
[由 CodeReview-Agent 自动填充]

## 4. 性能优化实践
[由 CodeReview-Agent 自动填充]

## 5. 插件开发规范

### 5.1 插件打包
- 每个插件必须支持 `pnpm run pack` 命令生成 ZIP 包
- ZIP 文件命名格式：`{plugin-id}-{version}.zip`
- ZIP 内容必须包含：dist/, plugin.json, README.md（如果存在）
- 使用 archiver 库进行打包，压缩级别为 9（最高）
- 打包前必须先执行 `pnpm build`
- 打包脚本位于 `scripts/pack-plugin.js`，所有函数必须有完整的 JSDoc 注释包括 `@throws` 标签
- ZipArchive 构造函数只接受一个 options 参数，正确用法：`new ZipArchive({ zlib: { level: 9 } })`

## 历史变更记录

### v1.2 (2026-05-10)
- 修复：ZipArchive 构造函数调用规范，移除多余参数
- 更正：插件打包命令从 `pnpm pack` 改为 `pnpm run pack`
- 新增：明确 ZipArchive 构造函数的正确用法

### v1.1 (2026-05-09)
- 新增：插件打包规范（5.1章节）
- 新增：JSDoc @throws 标签要求
- 更新：DEVELOPMENT_GUIDE.md 中的插件打包说明，从手动 zip 改为 pnpm pack

### v1.0 (2026-05-09)
- 初始版本
- 基于 Quick Actions 项目特点创建基础框架
- 等待 CodeReview-Agent 在实际代码审查中填充具体内容
