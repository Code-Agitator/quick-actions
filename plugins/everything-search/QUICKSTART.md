# Everything 插件快速启动指南

## 🚀 5 分钟快速上手

### 步骤 1: 安装 Everything（如果尚未安装）

访问 [https://www.voidtools.com/zh-cn/](https://www.voidtools.com/zh-cn/) 下载并安装。

### 步骤 2: 启用 HTTP 服务器

1. 打开 Everything
2. 菜单 → **工具** → **选项**
3. 左侧选择 **HTTP 服务器**
4. ✅ 勾选 **启用 HTTP 服务器**
5. 点击 **确定**

### 步骤 3: 测试连接

在浏览器中访问：`http://localhost/?json=1&search=test`

如果看到 JSON 格式的搜索结果，说明配置成功！

**注意**：URL 是 `http://localhost/` 而不是 `http://localhost/Everything`

### 步骤 4: 在 Quick Actions 中使用

1. 按 `Alt + Space` 呼出主窗口
2. 输入 "everything" 或 "搜索"
3. 选择 **🔍 Everything 搜索** 插件
4. 开始搜索文件！

## ✨ 使用技巧

### 键盘快捷键

- `↑` / `↓` - 上下选择结果
- `Enter` - 打开选中的文件/文件夹
- `Esc` - 返回主窗口

### 搜索语法

Everything 支持强大的搜索语法：

```
*.pdf                    # 搜索所有 PDF 文件
document recent:1week    # 最近一周的 document 文件
size:>100mb              # 大于 100MB 的文件
C:\Users\ *.jpg          # C:\Users 下的所有 JPG 图片
regex:^test.*\.txt$      # 正则表达式搜索
```

更多语法参考：[Everything 搜索语法](https://www.voidtools.com/support/everything/searching/)

## 🔧 故障排除

### 问题 1: 无法连接到 Everything

**症状**: 显示 "搜索失败" 或 "HTTP error"

**解决方案**:
1. 确认 Everything 正在运行（任务栏右下角有图标）
2. 检查 HTTP 服务器是否启用
3. 尝试重启 Everything
4. 检查防火墙设置

### 问题 2: 搜索结果为空

**症状**: 输入关键词后没有结果

**解决方案**:
1. 确认 Everything 已完成索引（首次安装需要时间）
2. 尝试简单的关键词测试
3. 检查 Everything 是否能正常搜索

### 问题 3: 无法打开文件

**症状**: 点击文件没有反应

**解决方案**:
1. 检查文件路径是否正确
2. 确认文件仍然存在
3. 尝试手动在资源管理器中打开

## 📝 自定义配置

### 修改端口

如果默认端口 80 被占用，可以在 Everything 中更改：

1. 工具 → 选项 → HTTP 服务器
2. 修改端口号（例如 8080）
3. 更新插件代码中的 URL：

```typescript
// 在 App.tsx 中修改
const response = await fetch(
  `http://localhost:8080/Everything?...`  // 改为新端口
);
```

### 调整结果数量

修改 `count` 参数：

```typescript
// 默认 100 条，可以调整为 50 或 200
`count=50&search=${encodeURIComponent(keyword)}`
```

## 🎉 完成！

现在您可以享受极速的文件搜索体验了！

如有问题，请查看 [完整文档](README.md)。
