# UUID 生成器

快速生成和复制 UUID v4 的 Quick Actions 插件。

## ✨ 功能特性

- 🔑 **快速生成**: 一键生成 UUID v4
- 📋 **一键复制**: 点击即可复制到剪贴板
- 🎲 **批量生成**: 支持一次生成 5 个或 10 个 UUID
- 📝 **历史记录**: 保留最近生成的 50 个 UUID
- 🌓 **深色模式**: 自动适配系统主题
- ⚡ **即时搜索**: 支持通过搜索快速查找 UUID
- 🎨 **多种格式**: 支持标准、大写、无横杠、大写无横杠等格式

## 🚀 使用方法

### 方式一：使用 UI 界面

1. 在 Quick Actions 中输入 `uuid` 或 `UUID 生成器`
2. 选择 "打开 UUID 生成器"
3. 点击按钮生成 UUID
4. 点击任意 UUID 即可复制到剪贴板

### 方式二：直接生成（支持格式选项）

1. 在 Quick Actions 中输入关键词：
   - `uuid` - 生成标准格式 UUID
   - `uuid upper` 或 `uuid 大写` - 生成大写格式
   - `uuid no-dash` 或 `uuid 无横杠` - 生成无横杠格式
   - `uuid upper no-dash` - 生成大写无横杠格式
2. 选择对应的结果
3. 按回车键自动生成并复制到剪贴板

### 支持的格式

| 格式 | 示例 | 说明 |
|------|------|------|
| 标准 | `550e8400-e29b-41d4-a716-446655440000` | 默认小写带横杠 |
| 大写 | `550E8400-E29B-41D4-A716-446655440000` | 全大写字母 |
| 无横杠 | `550e8400e29b41d4a716446655440000` | 去掉所有横杠 |
| 大写无横杠 | `550E8400E29B41D4A716446655440000` | 大写且无横杠 |

## 🛠️ 开发

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

### 构建生产版本

```bash
pnpm build
```

## 📦 API 使用

该插件使用了 Quick Actions 提供的安全 API：

### Clipboard API (`api.clipboard`)
- `writeText(text: string)`: 将文本复制到剪贴板

示例代码：
```typescript
export async function execute(query: string, api: PluginAPI) {
  const uuid = generateUUID();
  await api.clipboard.writeText(uuid);
  return [{ title: `已复制: ${uuid}` }];
}
```

## 💡 提示

- UUID v4 是随机生成的唯一标识符
- 格式为：`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
- 适合用于数据库主键、会话 ID、文件命名等场景
- 点击列表中的 UUID 会自动复制，无需额外操作

## 📄 许可证

MIT
