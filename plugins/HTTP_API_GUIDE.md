# ACTIONS HTTP API 使用指南

## 概述

ACTIONS HTTP API 允许插件通过 Rust 后端发起 HTTP 请求，完全避免浏览器 CORS 限制。

## API 接口

### `ACTIONS.http.get(url, options?)`

发送 GET 请求。

**参数**:
- `url` (string) - 请求 URL（必须是 http:// 或 https://）
- `options` (object, 可选) - 请求选项
  - `headers` (Record<string, string>) - 自定义请求头
  - `timeout` (number) - 超时时间（毫秒），默认 30000

**返回**: `Promise<HTTPResponse>`

**示例**:
```typescript
const response = await window.ACTIONS.http.get('http://localhost/api/data');
console.log(response.status); // 200
console.log(response.data);   // 解析后的 JSON 数据
```

### `ACTIONS.http.post(url, data?, options?)`

发送 POST 请求。

**参数**:
- `url` (string) - 请求 URL
- `data` (any, 可选) - 请求体数据（会自动 JSON.stringify）
- `options` (object, 可选) - 请求选项

**返回**: `Promise<HTTPResponse>`

**示例**:
```typescript
const response = await window.ACTIONS.http.post(
  'http://localhost/api/submit',
  { name: 'test', value: 123 }
);
```

## HTTPResponse 结构

```typescript
interface HTTPResponse {
  status: number;              // HTTP 状态码
  statusText: string;          // 状态文本
  data: any;                   // 响应数据（自动解析 JSON）
  headers: Record<string, string>; // 响应头
}
```

## 完整示例：Everything 搜索插件

```typescript
// 搜索 Everything
async function searchEverything(keyword: string) {
  try {
    // 使用 ACTIONS.http.get 发起请求
    const response = await window.ACTIONS.http.get(
      `http://localhost/?json=1&search=${encodeURIComponent(keyword)}`
    );

    if (response.status === 200 && response.data.results) {
      return response.data.results;
    }
    
    return [];
  } catch (error) {
    console.error('Search failed:', error);
    throw error;
  }
}
```

## 安全限制

1. **URL 协议限制**: 只允许 `http://` 和 `https://`
2. **跨域支持**: 通过 Rust 后端代理，无 CORS 限制
3. **超时保护**: 默认 30 秒超时，可自定义

## 优势

| 特性 | 浏览器 fetch | ACTIONS.http |
|------|-------------|--------------|
| 跨域限制 | ❌ 有 CORS 限制 | ✅ 无限制 |
| 协议支持 | http/https | http/https |
| 安全性 | 中等 | 高（后端验证） |
| 超时控制 | 需要手动实现 | 内置支持 |
| 错误处理 | 复杂 | 统一格式 |

## 注意事项

1. **检查 API 可用性**:
   ```typescript
   if (!window.ACTIONS || !window.ACTIONS.http) {
     throw new Error('ACTIONS API 不可用');
   }
   ```

2. **错误处理**:
   ```typescript
   try {
     const response = await window.ACTIONS.http.get(url);
     if (response.status !== 200) {
       throw new Error(`HTTP ${response.status}: ${response.statusText}`);
     }
   } catch (error) {
     console.error('Request failed:', error);
   }
   ```

3. **大数据处理**: 响应数据会自动解析为 JSON，如果响应不是 JSON 格式，`data` 字段会是 `null`

## 更多示例

### 带自定义 Headers

```typescript
const response = await window.ACTIONS.http.get(
  'http://api.example.com/data',
  {
    headers: {
      'Authorization': 'Bearer token123',
      'X-Custom-Header': 'value'
    },
    timeout: 5000
  }
);
```

### POST JSON 数据

```typescript
const response = await window.ACTIONS.http.post(
  'http://api.example.com/submit',
  {
    name: 'John',
    age: 30
  },
  {
    headers: {
      'Content-Type': 'application/json'
    }
  }
);
```

### 错误重试

```typescript
async function fetchWithRetry(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await window.ACTIONS.http.get(url);
      if (response.status === 200) {
        return response.data;
      }
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## 相关资源

- [ACTIONS API 完整文档](../../ACTIONS_API_GUIDE.md)
- [Everything 插件示例](../everything-search/src/App.tsx)
- [Tauri Invoke API](https://tauri.app/v1/api/js/core/#invoke)
