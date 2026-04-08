use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::AppHandle;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileReadRequest {
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileWriteRequest {
    pub path: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandRequest {
    pub command: String,
    pub args: Vec<String>,
}

#[tauri::command]
pub async fn plugin_read_file(
    _plugin_id: String,
    path: String,
    _app: AppHandle,
) -> Result<String, String> {
    // 验证路径安全性
    let path_buf = PathBuf::from(&path);
    if !path_buf.is_absolute() {
        return Err("Only absolute paths are allowed".to_string());
    }

    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn plugin_write_file(
    _plugin_id: String,
    path: String,
    content: String,
    _app: AppHandle,
) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);
    if !path_buf.is_absolute() {
        return Err("Only absolute paths are allowed".to_string());
    }

    std::fs::write(&path, content).map_err(|e| e.to_string())
}

// 注意：plugin_list_dir 已在 commands.rs 中实现
// 这个文件保留了其他插件 API 函数

#[tauri::command]
pub async fn plugin_execute_command(
    _plugin_id: String,
    command: String,
    args: Vec<String>,
    _app: AppHandle,
) -> Result<String, String> {
    let output = std::process::Command::new(&command)
        .args(&args)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn plugin_show_notification(
    plugin_id: String,
    title: String,
    body: String,
    _app: AppHandle,
) -> Result<(), String> {
    // 这里可以集成系统通知
    println!("[Plugin {}] Notification: {} - {}", plugin_id, title, body);
    Ok(())
}

/// Everything 搜索结果（供插件使用）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginEverythingResult {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub date_modified: String,
}

/// 通过 ACTIONS API 调用 Everything 搜索
#[tauri::command]
pub async fn plugin_everything_search(
    _plugin_id: String,
    query: String,
    host: Option<String>,
    app: AppHandle,
) -> Result<Vec<PluginEverythingResult>, String> {
    // 调用 commands 中的 everything_search
    let response = crate::commands::everything_search(query, host)?;
    
    // 转换为插件友好的格式
    let results = response.results.into_iter().map(|r| PluginEverythingResult {
        name: r.name,
        path: r.path,
        size: r.size,
        date_modified: r.date_modified,
    }).collect();
    
    Ok(results)
}

/// HTTP 请求参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HTTPRequest {
    pub method: String,
    pub url: String,
    pub headers: Option<std::collections::HashMap<String, String>>,
    pub body: Option<String>,
    pub timeout: Option<u64>,
}

/// HTTP 响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HTTPResponse {
    pub status: u16,
    pub status_text: String,
    pub data: serde_json::Value,
    pub headers: std::collections::HashMap<String, String>,
}

/// 通用 HTTP 请求（供插件使用）
#[tauri::command]
pub async fn plugin_http_request(
    _plugin_id: String,
    method: String,
    url: String,
    headers: Option<std::collections::HashMap<String, String>>,
    body: Option<String>,
    timeout: Option<u64>,
) -> Result<HTTPResponse, String> {
    // 验证 URL 协议（只允许 http 和 https）
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Only http and https URLs are allowed".to_string());
    }
    
    // 创建 HTTP 客户端
    let timeout_secs = timeout.unwrap_or(30);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(timeout_secs))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    // 构建请求
    let mut request = match method.to_uppercase().as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        "PATCH" => client.patch(&url),
        _ => return Err(format!("Unsupported HTTP method: {}", method)),
    };
    
    // 添加默认 headers（模拟浏览器）
    request = request
        .header("Accept", "application/json, text/plain, */*")
        .header("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
        .header("Connection", "keep-alive");
    
    // 添加自定义 headers
    if let Some(headers_map) = headers {
        for (key, value) in headers_map {
            request = request.header(&key, &value);
        }
    }
    
    // 添加 body
    if let Some(body_str) = body {
        request = request.body(body_str);
    }
    
    // 发送请求
    let response = request.send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;
    
    // 获取状态码和文本
    let status = response.status();
    let status_text = status.canonical_reason().unwrap_or("Unknown").to_string();
    
    // 获取 headers
    let response_headers: std::collections::HashMap<String, String> = response.headers()
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
        .collect();
    
    // 读取响应文本
    let response_text = response.text().await.unwrap_or_default();
    
    // 尝试解析为 JSON
    let data: serde_json::Value = serde_json::from_str(&response_text)
        .unwrap_or(serde_json::Value::Null);
    
    Ok(HTTPResponse {
        status: status.as_u16(),
        status_text,
        data,
        headers: response_headers,
    })
}
