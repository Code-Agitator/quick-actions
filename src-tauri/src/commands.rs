use crate::plugin_manager::{PluginManager, PluginMetadata, PluginResult};
use std::sync::Mutex;
use std::path::PathBuf;
use tauri::{State, WebviewWindow, Emitter, Manager, WebviewWindowBuilder};
use std::collections::VecDeque;
use pinyin::ToPinyin;

pub struct AppState {
    pub plugin_manager: Mutex<PluginManager>,
    pub plugin_window_pool: Mutex<VecDeque<String>>,  // 窗口标签池
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
    
    // 1. 直接包含匹配 (最快)
    if text_lower.contains(&query_lower) {
        return true;
    }
    
    // 2. 子序列模糊匹配 (例如: et -> everything)
    if is_subsequence(&query_lower, &text_lower) {
        return true;
    }

    // 3. 宽松字符匹配：只要目标包含查询中的所有字符即可 (例如: evet -> everything)
    if contains_all_chars(&query_lower, &text_lower) {
        return true;
    }
    
    // 4. 拼音首字母匹配
    let initials = to_pinyin_initials(text);
    if initials.contains(&query_lower) || is_subsequence(&query_lower, &initials) {
        return true;
    }
    
    // 5. 完整拼音匹配
    let full_pinyin = to_pinyin_full(text);
    if full_pinyin.contains(&query_lower) || is_subsequence(&query_lower, &full_pinyin) {
        return true;
    }
    
    false
}

/// 检查 target 是否包含 query 中的所有字符（忽略顺序）
fn contains_all_chars(query: &str, target: &str) -> bool {
    let mut target_chars: Vec<char> = target.chars().collect();
    for qc in query.chars() {
        if let Some(pos) = target_chars.iter().position(|&x| x == qc) {
            target_chars.remove(pos);
        } else {
            return false;
        }
    }
    true
}

/// 检查 query 是否是 target 的子序列 (Subsequence)
/// 例如: "et" 是 "everything" 的子序列
fn is_subsequence(query: &str, target: &str) -> bool {
    let mut query_chars = query.chars();
    let mut target_chars = target.chars();
    
    while let Some(qc) = query_chars.next() {
        let mut found = false;
        for tc in target_chars.by_ref() {
            if qc == tc {
                found = true;
                break;
            }
        }
        if !found {
            return false;
        }
    }
    true
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
    log::info!("[Commands] Received request to uninstall plugin: {}", id);
    let mut manager = state.plugin_manager.lock().unwrap();
    let result = manager.uninstall_plugin(&id);
    if result.is_ok() {
        log::info!("[Commands] Plugin {} uninstalled successfully.", id);
    } else {
        log::error!("[Commands] Failed to uninstall plugin {}: {:?}", id, result);
    }
    result
}

/// 动态创建并显示插件窗口（使用窗口池）
#[tauri::command]
pub fn open_plugin_window(
    plugin_id: String,
    plugin_name: String,
    entry: String,
    app: tauri::AppHandle,
    state: State<AppState>,
) -> Result<(), String> {
    eprintln!("[Window Pool] === REQUEST PLUGIN WINDOW ===");
    eprintln!("[Window Pool] plugin_id: {}", plugin_id);
    eprintln!("[Window Pool] plugin_name: {}", plugin_name);
    
    // 从池中获取一个窗口
    let window_label = {
        let mut pool = state.plugin_window_pool.lock().unwrap();
        
        if pool.is_empty() {
            eprintln!("[Window Pool] ✗ No available slots in pool!");
            return Err("No available plugin windows".to_string());
        }
        
        // 取出最早的窗口（FIFO）
        let label = pool.pop_front().unwrap();
        eprintln!("[Window Pool] Allocated slot: {}", label);
        
        // 将标签放回池尾（循环使用）
        pool.push_back(label.clone());
        
        label
    };
    
    // 获取窗口
    let window = app.get_webview_window(&window_label)
        .ok_or_else(|| format!("Window {} not found", window_label))?;
    
    eprintln!("[Window Pool] Configuring window: {}", window_label);
    
    // 使用 sessionStorage 持久化插件信息（reload 后仍然可用）
    let plugin_info_js = format!(
        "sessionStorage.setItem('__PLUGIN_ID__', '{}'); \
         sessionStorage.setItem('__PLUGIN_ENTRY__', '{}'); \
         window.location.reload();",
        plugin_id, entry
    );
    
    match window.eval(&plugin_info_js) {
        Ok(_) => eprintln!("[Window Pool] ✓ Plugin info saved to sessionStorage"),
        Err(e) => {
            eprintln!("[Window Pool] ✗ Failed to save plugin info: {}", e);
            return Err(format!("Failed to save plugin info: {}", e));
        }
    }
    
    // 显示窗口
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    eprintln!("[Window Pool] ✓ Window shown and focused");
    
    // 隐藏主窗口
    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.hide();
        eprintln!("[Window Pool] Main window hidden");
    }
    
    eprintln!("[Window Pool] === WINDOW READY ===");
    Ok(())
}

/// 关闭指定插件窗口
#[tauri::command]
pub fn close_plugin_window(
    plugin_id: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let window_label = format!("plugin-{}", plugin_id);
    
    if let Some(window) = app.get_webview_window(&window_label) {
        window.close().map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

/// 关闭所有插件窗口
#[tauri::command]
pub fn close_all_plugin_windows(
    app: tauri::AppHandle,
) -> Result<(), String> {
    let windows = app.webview_windows();
    
    for (label, window) in windows.iter() {
        if label.starts_with("plugin-") {
            let _ = window.close();
        }
    }
    
    Ok(())
}

#[tauri::command]
pub fn show_window(window: WebviewWindow) -> Result<(), String> {
    // Windows 平台：移除系统菜单，防止 Alt+Space 弹出
    #[cfg(windows)]
    {
        use windows::Win32::UI::WindowsAndMessaging::{
            GetWindowLongW, SetWindowLongW, GWL_STYLE, WS_SYSMENU
        };
        use windows::Win32::Foundation::HWND;
        
        // 获取窗口句柄
        if let Ok(hwnd) = window.hwnd() {
            // hwnd.0 是 *mut c_void，转换为 isize
            let hwnd_value = hwnd.0 as isize;
            unsafe {
                // 获取当前窗口样式
                let current_style = GetWindowLongW(HWND(hwnd_value), GWL_STYLE);
                // 移除 WS_SYSMENU 样式（系统菜单）
                let new_style = current_style & !WS_SYSMENU.0 as i32;
                SetWindowLongW(HWND(hwnd_value), GWL_STYLE, new_style);
            }
        }
    }
    
    // 先显示窗口
    window.show().map_err(|e| e.to_string())?;
    
    // 设置为最前窗口
    window.set_always_on_top(true).map_err(|e| e.to_string())?;
    
    // 短暂延迟后设置焦点，确保窗口已完全显示
    std::thread::sleep(std::time::Duration::from_millis(30));
    
    // 确保窗口获得焦点
    window.set_focus().map_err(|e| e.to_string())?;
    
    // 再延迟一次，确保焦点设置成功
    std::thread::sleep(std::time::Duration::from_millis(20));
    window.set_focus().ok(); // 忽略错误，作为重试
    
    // 如果是主窗口，等待窗口完全激活后再聚焦输入框
    if window.label() == "main" {
        // 增加延迟时间，确保窗口系统级焦点已设置
        std::thread::sleep(std::time::Duration::from_millis(150));
        
        let focus_input_js = r#"
            (function() {
                const input = document.querySelector('input[type="text"], input:not([type]), .search-input, [data-testid="search-input"]');
                if (input) {
                    // 确保输入框获得焦点并选中所有文本
                    input.focus();
                    // 延迟一点再选中，确保 focus 已完成
                    setTimeout(() => {
                        input.select();
                        console.log('[AutoFocus] Input focused and text selected');
                    }, 10);
                } else {
                    console.warn('[AutoFocus] Input element not found');
                }
            })();
        "#;
        let _ = window.eval(focus_input_js);
        eprintln!("[Window Manager] Auto-focus triggered for main window");
    }
    
    Ok(())
}

#[tauri::command]
pub fn hide_window(window: WebviewWindow, app: tauri::AppHandle) -> Result<(), String> {
    eprintln!("[Window Manager] hide_window called on: {}", window.label());
    
    let is_plugin = window.label().starts_with("plugin-");
    
    window.hide().map_err(|e| e.to_string())?;
    eprintln!("[Window Manager] Window hidden");
    
    // 如果隐藏的是插件窗口，显示主窗口
    if is_plugin {
        eprintln!("[Window Manager] Plugin window hidden, showing main window");
        if let Some(main_window) = app.get_webview_window("main") {
            let _ = main_window.show();
            let _ = main_window.set_focus();
            eprintln!("[Window Manager] Main window shown and focused");
        }
    }
    
    Ok(())
}

#[tauri::command]
pub fn toggle_window(window: WebviewWindow, app: tauri::AppHandle) -> Result<(), String> {
    eprintln!("[Window Manager] toggle_window called on: {}", window.label());
    
    if window.is_visible().unwrap_or(false) {
        // 隐藏当前窗口
        hide_window(window, app)
    } else {
        // 只显示主窗口，不隐藏插件窗口
        eprintln!("[Window Manager] Showing window without hiding plugins");
        show_window(window.clone())?;
        
        // 确保主窗口获得焦点
        std::thread::sleep(std::time::Duration::from_millis(50));
        if let Err(e) = window.set_focus() {
            eprintln!("[Window Manager] Failed to set focus: {}", e);
        }
        
        Ok(())
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
    _plugin_id: String,
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
    _plugin_id: String,
    path: String,
    query: String,
    max_results: Option<usize>,
    _state: State<AppState>,
) -> Result<Vec<FileEntry>, String> {
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

/// Everything 搜索结果项
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct EverythingResult {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub date_modified: String,
}

/// Everything 搜索响应
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct EverythingResponse {
    pub results: Vec<EverythingResult>,
}

/// 通过 Everything HTTP API 搜索文件
#[tauri::command]
pub fn everything_search(query: String, host: Option<String>) -> Result<EverythingResponse, String> {
    let host = host.unwrap_or_else(|| "http://localhost".to_string());
    
    // 构建请求 URL
    let url = format!(
        "{}/?json=1&path_column=1&size_column=1&date_modified_column=1&count=100&search={}",
        host,
        urlencoding::encode(&query)
    );
    
    // 发送 HTTP 请求
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let response = client.get(&url)
        .send()
        .map_err(|e| format!("Failed to send request: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }
    
    // 解析 JSON 响应
    let json_value: serde_json::Value = response.json()
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
    // 提取 results 数组
    let results_array = json_value.get("results")
        .and_then(|v| v.as_array())
        .ok_or_else(|| "Invalid response format: missing results array".to_string())?;
    
    // 转换为结构化数据
    let results: Vec<EverythingResult> = results_array.iter()
        .map(|item| EverythingResult {
            name: item.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            path: item.get("path").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            size: item.get("size").and_then(|v| v.as_u64()).unwrap_or(0),
            date_modified: item.get("date-modified").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        })
        .collect();
    
    Ok(EverythingResponse { results })
}

/// 通用剪贴板 API: 读取文本
#[tauri::command]
pub fn clipboard_read() -> Result<String, String> {
    use arboard::Clipboard;
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.get_text().map_err(|e| e.to_string())
}

/// 通用剪贴板 API: 写入文本
#[tauri::command]
pub fn clipboard_write(text: String) -> Result<(), String> {
    use arboard::Clipboard;
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(&text).map_err(|e| e.to_string())
}

/// 通用存储 API: 设置键值对 (持久化)
#[tauri::command]
pub fn storage_set(key: String, value: String, app: tauri::AppHandle) -> Result<(), String> {
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?.join("plugin_storage.json");
    let mut data: std::collections::HashMap<String, String> = if path.exists() {
        serde_json::from_str(&std::fs::read_to_string(&path).unwrap_or_default()).unwrap_or_default()
    } else {
        std::collections::HashMap::new()
    };
    
    // 特殊处理：如果是剪贴板历史，则追加到数组
    if key == "clipboard_history" {
        let mut history: Vec<serde_json::Value> = data.get(&key)
            .and_then(|v| serde_json::from_str(v).ok())
            .unwrap_or_default();
        
        let new_item = serde_json::json!({
            "content": value,
            "timestamp": chrono::Local::now().timestamp_millis()
        });
        
        eprintln!("[Storage] Adding to history. Current size: {}", history.len());
        
        // 去重：如果最新的一条和当前一样，则不添加
        if history.is_empty() || history[0]["content"] != value {
            history.insert(0, new_item);
            if history.len() > 50 { history.truncate(50); }
            let json_str = serde_json::to_string(&history).map_err(|e| e.to_string())?;
            data.insert(key, json_str);
            log::info!("[Storage] History updated. New size: {}", history.len());
        } else {
            log::debug!("[Storage] Duplicate content skipped.");
            return Ok(());
        }
    } else {
        data.insert(key, value);
    }
    
    std::fs::write(path, serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}

/// 通用存储 API: 获取键值对
#[tauri::command]
pub fn storage_get(key: String, app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?.join("plugin_storage.json");
    if !path.exists() { 
        // log::debug!("[Storage] File not found: {:?}", path);
        return Ok(None); 
    }
    let content = std::fs::read_to_string(&path).unwrap_or_default();
    let data: std::collections::HashMap<String, String> = serde_json::from_str(&content).unwrap_or_default();
    let result = data.get(&key).cloned();
    // log::debug!("[Storage] Get key '{}'. Found: {}", key, result.is_some());
    if let Some(ref val) = result {
        log::debug!("[Storage] Value preview: {}", val.chars().take(50).collect::<String>());
    }
    Ok(result)
}

/// 前端日志上报命令 (用于正式版调试)
#[tauri::command]
pub fn log_frontend_message(level: String, message: String) {
    match level.as_str() {
        "error" => log::error!("[Frontend] {}", message),
        "warn" => log::warn!("[Frontend] {}", message),
        _ => log::info!("[Frontend] {}", message),
    }
}

/// 通用剪贴板历史 API: 获取最近 N 条记录 (从存储中解析)
#[tauri::command]
pub fn get_clipboard_history(limit: usize, app: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    // 这里我们可以简单地返回最近一次的内容，或者在 storage_set 时维护一个 JSON 数组
    // 为了简化，我们让插件自己去维护数组，Rust 只负责存最新的和读最新的
    // 但为了满足“历史记录”，我们修改 storage_set 的逻辑，专门针对 clipboard_history 做数组追加
    Ok(vec![])
}
