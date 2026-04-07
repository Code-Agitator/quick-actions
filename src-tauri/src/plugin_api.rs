use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, State};

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
    plugin_id: String,
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
    plugin_id: String,
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
    plugin_id: String,
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
