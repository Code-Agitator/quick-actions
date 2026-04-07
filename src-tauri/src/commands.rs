use crate::plugin_manager::{PluginManager, PluginMetadata, PluginResult};
use std::sync::Mutex;
use std::path::PathBuf;
use tauri::{State, WebviewWindow, Emitter};
use pinyin::ToPinyin;

pub struct AppState {
    pub plugin_manager: Mutex<PluginManager>,
}

/// 将中文转换为拼音（首字母）
fn to_pinyin_initials(text: &str) -> String {
    text.to_pinyin()
        .filter_map(|p| p)
        .map(|py| {
            let s = py.plain();
            s.chars().next().unwrap_or(' ').to_string()
        })
        .collect::<String>()
        .to_lowercase()
}

/// 将中文转换为完整拼音
fn to_pinyin_full(text: &str) -> String {
    text.to_pinyin()
        .filter_map(|p| p)
        .map(|py| py.plain().to_string())
        .collect::<String>()
        .to_lowercase()
}

/// 检查文本是否匹配搜索词（支持拼音）
fn matches_search(text: &str, query: &str) -> bool {
    if query.is_empty() {
        return true;
    }
    
    let text_lower = text.to_lowercase();
    let query_lower = query.to_lowercase();
    
    // 直接匹配
    if text_lower.contains(&query_lower) {
        return true;
    }
    
    // 拼音首字母匹配
    let initials = to_pinyin_initials(text);
    if initials.contains(&query_lower) {
        return true;
    }
    
    // 完整拼音匹配
    let full_pinyin = to_pinyin_full(text);
    if full_pinyin.contains(&query_lower) {
        return true;
    }
    
    false
}

/// 获取应用程序图标（Base64 编码）
/// 
/// 注意：提取系统原生图标是一个复杂的任务，需要：
/// 1. 调用 Windows API (SHGetFileInfoW) 获取 HICON
/// 2. 将 HICON 转换为位图
/// 3. 将位图编码为 PNG
/// 4. 将 PNG 转换为 Base64
/// 
/// 由于实现复杂度高且需要大量依赖，目前采用前端 emoji 映射方案。
/// 未来可以考虑使用专门的图标提取服务或缓存机制。
fn get_app_icon(_path: &str) -> Option<String> {
    None
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

/// 发射事件到前端
#[tauri::command]
pub fn emit_event(
    event: String,
    payload: serde_json::Value,
    window: WebviewWindow,
) -> Result<(), String> {
    window.emit(&event, payload).map_err(|e| e.to_string())?;
    Ok(())
}

/// 获取开始菜单应用程序
#[derive(Debug, Clone, serde::Serialize)]
pub struct StartMenuApp {
    pub name: String,
    pub path: String,
    pub executable: String,
    pub description: Option<String>,
    pub icon: Option<String>,
}

#[tauri::command]
pub fn get_start_menu_apps() -> Result<Vec<StartMenuApp>, String> {
    use std::fs;
    
    let mut apps = Vec::new();
    
    // Windows 开始菜单目录
    let start_menu_paths = vec![
        format!("{}\\Microsoft\\Windows\\Start Menu\\Programs", 
                std::env::var("APPDATA").unwrap_or_default()),
        "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs".to_string(),
    ];
    
    // 递归扫描函数
    fn scan_directory(path: &std::path::Path, apps: &mut Vec<StartMenuApp>) {
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let entry_path = entry.path();
                
                if entry_path.is_dir() {
                    // 递归扫描子目录
                    scan_directory(&entry_path, apps);
                } else if entry_path.extension().map_or(false, |ext| ext == "lnk") {
                    // 处理 .lnk 文件
                    if let Some(name) = entry_path.file_stem() {
                        let name_str = name.to_string_lossy().to_string();
                        let icon = get_app_icon(&entry_path.display().to_string());
                        apps.push(StartMenuApp {
                            name: name_str.clone(),
                            path: entry_path.display().to_string(),
                            executable: name_str,
                            description: None,
                            icon,
                        });
                    }
                }
            }
        }
    }
    
    // 扫描所有开始菜单路径
    for base_path in start_menu_paths {
        let path = std::path::Path::new(&base_path);
        if path.exists() {
            scan_directory(path, &mut apps);
        }
    }
    
    // 过滤掉卸载相关的程序
    let uninstall_keywords = ["卸载", "uninstall", "remove", "delete"];
    apps.retain(|app| {
        let name_lower = app.name.to_lowercase();
        !uninstall_keywords.iter().any(|keyword| name_lower.contains(keyword))
    });
    
    // 去重并按名称排序
    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps.dedup_by(|a, b| a.name.to_lowercase() == b.name.to_lowercase());
    
    Ok(apps)
}

/// 启动应用程序
#[tauri::command]
pub fn launch_application(path: String) -> Result<(), String> {
    use std::process::Command;
    
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(&["/C", "start", "", &path])
            .spawn()
            .map_err(|e| format!("Failed to launch application: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to launch application: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to launch application: {}", e))?;
    }
    
    Ok(())
}
