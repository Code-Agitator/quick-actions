# Process Manager New

## 🚀 Development

1. Install dependencies: `pnpm install`
2. Start dev server: `pnpm dev`
3. Build for production: `pnpm build`

## 🛠️ Built-in API Capabilities

The plugin environment provides a secure `api` object with the following capabilities:

### File System (`api.fs`)
- `readFile(path: string)`: Read content from allowed paths.
- `writeFile(path: string, content: string)`: Write content to files.
- `listDir(path: string)`: List directory contents.

### Shell Execution (`api.shell`)
- `execute(command: string, args?: string[])`: Run system commands securely.

### Notifications (`api.notification`)
- `show(title: string, body: string)`: Display system notifications.

### Clipboard (`api.clipboard`)
- `writeText(text: string)`: Copy text to clipboard.
- `readText()`: Read text from clipboard.

## 📝 Usage Example

```typescript
export async function execute(query: string, api: PluginAPI) {
  const results = await api.fs.listDir('/some/path');
  return results.map(r => ({ title: r }));
}
```
