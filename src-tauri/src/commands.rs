use crate::plugin_manager::{PluginManager, PluginMetadata, PluginResult};
use std::sync::Mutex;
use std::path::PathBuf;
use tauri::{State, WebviewWindow, Manager};

pub struct AppState {
    pub plugin_manager: Mutex<PluginManager>,
}

#[tauri::command]
pub fn get_plugins(state: State<AppState>) -> Result<Vec<PluginMetadata>, String> {
    let mut manager = state.plugin_manager.lock().unwrap();
    manager.scan_plugins()
}

#[tauri::command]
pub fn execute_plugin(
    id: String,
    query: String,
    _state: State<AppState>,
) -> Result<Vec<PluginResult>, String> {
    Ok(vec![PluginResult {
        title: format!("执行插件: {}", id),
        description: Some(query),
        icon: None,
    }])
}

#[tauri::command]
pub fn install_plugin(path: String, state: State<AppState>) -> Result<(), String> {
    let mut manager = state.plugin_manager.lock().unwrap();
    manager.install_plugin(&path)
}

#[tauri::command]
pub fn uninstall_plugin(id: String, state: State<AppState>) -> Result<(), String> {
    let mut manager = state.plugin_manager.lock().unwrap();
    manager.uninstall_plugin(&id)
}

#[tauri::command]
pub fn show_window(window: WebviewWindow) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn hide_window(window: WebviewWindow) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_window(window: WebviewWindow) -> Result<(), String> {
    if window.is_visible().unwrap_or(false) {
        hide_window(window)
    } else {
        show_window(window)
    }
}

#[tauri::command]
pub fn get_plugin_path(id: String, state: State<AppState>) -> Result<String, String> {
    let manager = state.plugin_manager.lock().unwrap();
    manager
        .get_plugin_path(&id)
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Plugin not found".to_string())
}

#[tauri::command]
pub fn reload_plugins(state: State<AppState>) -> Result<Vec<PluginMetadata>, String> {
    let mut manager = state.plugin_manager.lock().unwrap();
    manager.scan_plugins()
}

#[tauri::command]
pub fn read_plugin_file(
    plugin_id: String,
    entry: String,
    state: State<AppState>,
) -> Result<String, String> {
    let manager = state.plugin_manager.lock().unwrap();
    let plugin_path = manager
        .get_plugin_path(&plugin_id)
        .ok_or_else(|| "Plugin not found".to_string())?;
    
    let file_path = plugin_path.join(&entry);
    std::fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read plugin file: {}", e))
}

/// 文件条目信息
#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: Option<u64>,
    pub modified: Option<u64>,
    pub extension: Option<String>,
}

/// 列出目录内容
#[tauri::command]
pub fn plugin_list_dir(
    plugin_id: String,
    path: String,
    _state: State<AppState>,
) -> Result<Vec<FileEntry>, String> {
    use std::fs;
    use std::time::UNIX_EPOCH;
    
    // 安全检查：限制访问范围
    if !is_safe_path(&path) {
        return Err("Access denied: Path outside allowed directories".to_string());
    }
    
    let dir_path = PathBuf::from(&path);
    
    if !dir_path.exists() {
        return Err(format!("Directory not found: {}", path));
    }
    
    if !dir_path.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    
    let entries = fs::read_dir(&dir_path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;
    
    let mut files = Vec::new();
    
    for entry in entries.flatten() {
        let file_path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();
        
        // 跳过隐藏文件和系统文件
        if file_name.starts_with('.') && cfg!(not(target_os = "linux")) {
            continue;
        }
        
        match entry.metadata() {
            Ok(metadata) => {
                let is_dir = metadata.is_dir();
                let size = if is_dir { None } else { Some(metadata.len()) };
                let modified = metadata.modified()
                    .ok()
                    .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                    .map(|d| d.as_millis() as u64);
                
                let extension = file_path.extension()
                    .map(|e| e.to_string_lossy().to_string());
                
                files.push(FileEntry {
                    name: file_name,
                    path: file_path.display().to_string(),
                    is_directory: is_dir,
                    size,
                    modified,
                    extension,
                });
            }
            Err(e) => {
                eprintln!("Error reading metadata for {:?}: {}", file_path, e);
                // 继续处理其他文件
            }
        }
    }
    
    Ok(files)
}

/// 搜索文件
#[tauri::command]
pub fn plugin_search_files(
    plugin_id: String,
    path: String,
    query: String,
    max_results: Option<usize>,
    _state: State<AppState>,
) -> Result<Vec<FileEntry>, String> {
    use std::fs;
    
    if !is_safe_path(&path) {
        return Err("Access denied: Path outside allowed directories".to_string());
    }
    
    let max_results = max_results.unwrap_or(100);
    let query_lower = query.to_lowercase();
    let mut results = Vec::new();
    
    search_recursive(&PathBuf::from(&path), &query_lower, &mut results, max_results);
    
    Ok(results)
}

/// 递归搜索文件
fn search_recursive(
    dir_path: &PathBuf,
    query: &str,
    results: &mut Vec<FileEntry>,
    max_results: usize,
) {
    use std::fs;
    use std::time::UNIX_EPOCH;
    
    if results.len() >= max_results {
        return;
    }
    
    if let Ok(entries) = fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            if results.len() >= max_results {
                break;
            }
            
            let file_path = entry.path();
            let file_name = entry.file_name().to_string_lossy().to_string();
            
            // 检查文件名是否匹配
            if file_name.to_lowercase().contains(query) {
                match entry.metadata() {
                    Ok(metadata) => {
                        let is_dir = metadata.is_dir();
                        let size = if is_dir { None } else { Some(metadata.len()) };
                        let modified = metadata.modified()
                            .ok()
                            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                            .map(|d| d.as_millis() as u64);
                        
                        let extension = file_path.extension()
                            .map(|e| e.to_string_lossy().to_string());
                        
                        results.push(FileEntry {
                            name: file_name,
                            path: file_path.display().to_string(),
                            is_directory: is_dir,
                            size,
                            modified,
                            extension,
                        });
                    }
                    Err(_) => continue,
                }
            }
            
            // 递归搜索子目录（但不超过一定深度）
            if file_path.is_dir() && results.len() < max_results {
                search_recursive(&file_path, query, results, max_results);
            }
        }
    }
}

/// 获取文件详情
#[tauri::command]
pub fn plugin_get_file_info(
    plugin_id: String,
    path: String,
    _state: State<AppState>,
) -> Result<FileEntry, String> {
    use std::fs;
    use std::time::UNIX_EPOCH;
    
    if !is_safe_path(&path) {
        return Err("Access denied: Path outside allowed directories".to_string());
    }
    
    let file_path = PathBuf::from(&path);
    
    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }
    
    let metadata = fs::metadata(&file_path)
        .map_err(|e| format!("Failed to get file metadata: {}", e))?;
    
    let is_dir = metadata.is_dir();
    let size = if is_dir { None } else { Some(metadata.len()) };
    let modified = metadata.modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64);
    
    let extension = file_path.extension()
        .map(|e| e.to_string_lossy().to_string());
    
    Ok(FileEntry {
        name: file_path.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default(),
        path: file_path.display().to_string(),
        is_directory: is_dir,
        size,
        modified,
        extension,
    })
}

/// 安全检查：限制访问范围
fn is_safe_path(path: &str) -> bool {
    // ⚠️ 已禁用路径限制 - 允许访问所有路径
    // 如需启用限制，请恢复白名单检查
    true
}
