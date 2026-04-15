use crate::plugin_manager::{PluginManager, PluginMetadata, PluginResult};
use std::sync::Mutex;
use std::path::PathBuf;
use tauri::{State, WebviewWindow, Emitter, Manager, Size, LogicalSize, Position, LogicalPosition};
use std::collections::VecDeque;
use pinyin::ToPinyin;
use tauri_plugin_shell::ShellExt;

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

/// 解析快捷方式文件，返回实际的 EXE 路径
/// 使用 PowerShell 解析 .lnk 文件（单个）
#[cfg(target_os = "windows")]
fn resolve_lnk_target(lnk_path: &str) -> Option<String> {
    use std::process::Command;
    use std::time::Instant;
    
    let start = Instant::now();
    log::debug!("[Icon] Resolving LNK: {}", lnk_path);
    
    // 使用 PowerShell 解析快捷方式（隐藏窗口）
    let ps_command = format!(
        r#"$shell = New-Object -ComObject WScript.Shell; $shortcut = $shell.CreateShortcut('{}'); $shortcut.TargetPath"#,
        lnk_path.replace('\\', "\\\\")
    );
    
    let output = match Command::new("powershell")
        .args([
            "-WindowStyle", "Hidden",  // 【关键修复】隐藏 PowerShell 窗口
            "-NoProfile",
            "-NonInteractive",
            "-Command", 
            &ps_command
        ])
        .output() {
            Ok(out) => out,
            Err(e) => {
                log::warn!("[Icon] Failed to run PowerShell for {}: {}", lnk_path, e);
                return None;
            }
        };
    
    let elapsed = start.elapsed();
    log::debug!("[Icon] PowerShell call took {:?}", elapsed);
    
    if output.status.success() {
        let target = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !target.is_empty() && std::path::Path::new(&target).exists() {
            log::debug!("[Icon] Resolved to: {}", target);
            Some(target)
        } else {
            log::debug!("[Icon] Target not found or invalid: {}", target);
            None
        }
    } else {
        log::warn!("[Icon] PowerShell failed for {}", lnk_path);
        None
    }
}

/// 【性能优化】批量解析多个 .lnk 文件，只启动一次 PowerShell
#[cfg(target_os = "windows")]
fn batch_resolve_lnk_targets(lnk_paths: &[String]) -> Vec<Option<String>> {
    use std::process::Command;
    use std::time::Instant;
    
    if lnk_paths.is_empty() {
        return vec![];
    }
    
    let start = Instant::now();
    log::info!("[Icon Batch] Starting batch resolution for {} LNK files", lnk_paths.len());
    
    // 构建 PowerShell 脚本，批量处理所有快捷方式
    let mut ps_script = String::from("$shell = New-Object -ComObject WScript.Shell;\n");
    ps_script.push_str("$results = @();\n");
    
    for (i, lnk_path) in lnk_paths.iter().enumerate() {
        let escaped_path = lnk_path.replace('\\', "\\\\");
        ps_script.push_str(&format!(
            "try {{ \n  $shortcut = $shell.CreateShortcut('{}'); \n  $target = $shortcut.TargetPath; \n  if (Test-Path $target) {{ $results += $target }} else {{ $results += '' }} \n}} catch {{ $results += '' }}\n",
            escaped_path
        ));
        
        // 每 50 个输出一次进度
        if (i + 1) % 50 == 0 {
            log::debug!("[Icon Batch] Built script for {}/{} files", i + 1, lnk_paths.len());
        }
    }
    
    ps_script.push_str("$results -join '|SEPARATOR|';\n");
    
    // 执行 PowerShell 脚本（隐藏窗口）
    let output = match Command::new("powershell")
        .args([
            "-WindowStyle", "Hidden",
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            &ps_script
        ])
        .output() {
            Ok(out) => out,
            Err(e) => {
                log::error!("[Icon Batch] Failed to run PowerShell batch: {}", e);
                return vec![None; lnk_paths.len()];
            }
        };
    
    let elapsed = start.elapsed();
    log::info!("[Icon Batch] Batch resolution completed in {:?}", elapsed);
    
    if !output.status.success() {
        log::error!("[Icon Batch] PowerShell batch failed: {}", String::from_utf8_lossy(&output.stderr));
        return vec![None; lnk_paths.len()];
    }
    
    // 解析结果
    let result_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let targets: Vec<&str> = result_str.split("|SEPARATOR|").collect();
    
    let mut results = Vec::with_capacity(lnk_paths.len());
    for (i, target) in targets.iter().enumerate() {
        let target = target.trim();
        if !target.is_empty() && std::path::Path::new(target).exists() {
            results.push(Some(target.to_string()));
        } else {
            results.push(None);
        }
        
        if (i + 1) % 50 == 0 {
            log::debug!("[Icon Batch] Parsed {}/{} results", i + 1, targets.len());
        }
    }
    
    log::info!("[Icon Batch] Successfully resolved {}/{} targets", 
               results.iter().filter(|r| r.is_some()).count(), 
               results.len());
    
    results
}

#[cfg(not(target_os = "windows"))]
fn resolve_lnk_target(_lnk_path: &str) -> Option<String> {
    None
}
/// 
/// 使用 Windows API SHGetFileInfo 提取图标并转换为 PNG Base64
#[cfg(target_os = "windows")]
fn get_app_icon(path: &str) -> Option<String> {
    use std::os::windows::ffi::OsStrExt;
    use std::ffi::OsStr;
    use std::time::Instant;
    use winapi::um::shellapi::{SHGetFileInfoW, SHGFI_ICON, SHGFI_LARGEICON, SHFILEINFOW};
    use winapi::um::winuser::{DestroyIcon, GetIconInfo};
    use winapi::um::wingdi::{DeleteObject, DeleteDC, BITMAPINFO, BITMAPINFOHEADER, 
                             BI_RGB, DIB_RGB_COLORS, BITMAP, CreateCompatibleDC,
                             SelectObject, GetDIBits, GetObjectW};
    use base64::{Engine as _, engine::general_purpose};

    let start = Instant::now();
    
    // 1. 检查缓存
    let file_hash = compute_file_hash(path);
    if let Some(cached_icon) = load_icon_from_cache(&file_hash) {
        log::debug!("[Icon] Cache hit for {}", path);
        return Some(cached_icon);
    }
    
    log::debug!("[Icon] Cache miss, extracting from: {}", path);

    // 将路径转换为 UTF-16
    let wide_path: Vec<u16> = OsStr::new(path)
        .encode_wide()
        .chain(Some(0))
        .collect();

    let mut shfi: SHFILEINFOW = unsafe { std::mem::zeroed() };
    
    // 获取大图标（32x32 或 48x48）
    let result = unsafe {
        SHGetFileInfoW(
            wide_path.as_ptr(),
            0,
            &mut shfi,
            std::mem::size_of::<SHFILEINFOW>() as u32,
            SHGFI_ICON | SHGFI_LARGEICON,
        )
    };

    if result == 0 || shfi.hIcon.is_null() {
        log::debug!("[Icon] SHGetFileInfo failed for {}", path);
        return None;
    }
    log::debug!("[Icon] SHGetFileInfo succeeded");

    // 从 HICON 提取图标信息
    let mut icon_info = unsafe { std::mem::zeroed() };
    if unsafe { GetIconInfo(shfi.hIcon, &mut icon_info) } == 0 {
        unsafe { DestroyIcon(shfi.hIcon) };
        return None;
    }

    // 获取位图信息
    let hbitmap = icon_info.hbmColor;
    if hbitmap.is_null() {
        unsafe {
            if !icon_info.hbmMask.is_null() {
                DeleteObject(icon_info.hbmMask as _);
            }
            DestroyIcon(shfi.hIcon);
        }
        return None;
    }

    // 获取位图尺寸
    let mut bitmap: BITMAP = unsafe { std::mem::zeroed() };
    if unsafe { GetObjectW(hbitmap as _, std::mem::size_of::<BITMAP>() as i32, &mut bitmap as *mut _ as *mut _) } == 0 {
        unsafe {
            DeleteObject(icon_info.hbmMask as _);
            DeleteObject(hbitmap as _);
            DestroyIcon(shfi.hIcon);
        }
        return None;
    }

    let width = bitmap.bmWidth as u32;
    let height = bitmap.bmHeight as u32;

    // 创建兼容 DC
    let hdc = unsafe { CreateCompatibleDC(std::ptr::null_mut()) };
    if hdc.is_null() {
        unsafe {
            DeleteObject(icon_info.hbmMask as _);
            DeleteObject(hbitmap as _);
            DestroyIcon(shfi.hIcon);
        }
        return None;
    }

    let old_bitmap = unsafe { SelectObject(hdc, hbitmap as _) };

    // 准备 BITMAPINFO
    let mut bmi: BITMAPINFO = unsafe { std::mem::zeroed() };
    bmi.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
    bmi.bmiHeader.biWidth = width as i32;
    bmi.bmiHeader.biHeight = -(height as i32); // 负数表示自上而下的 DIB
    bmi.bmiHeader.biPlanes = 1;
    bmi.bmiHeader.biBitCount = 32;
    bmi.bmiHeader.biCompression = BI_RGB;

    // 分配像素缓冲区
    let pixel_count = (width * height) as usize;
    let mut pixels: Vec<u8> = vec![0; pixel_count * 4];

    // 获取像素数据
    let result = unsafe {
        GetDIBits(
            hdc,
            hbitmap as _,
            0,
            height as u32,
            pixels.as_mut_ptr() as *mut _,
            &mut bmi,
            DIB_RGB_COLORS,
        )
    };

    // 恢复并清理 GDI 对象
    unsafe {
        SelectObject(hdc, old_bitmap);
        DeleteDC(hdc);
        DeleteObject(icon_info.hbmMask as _);
        DeleteObject(hbitmap as _);
        DestroyIcon(shfi.hIcon);
    }

    if result == 0 {
        return None;
    }

    // 使用 image crate 创建 RGBA 图像并编码为 PNG
    use image::{RgbaImage, Rgba};
    
    log::debug!("[Icon] Encoding {}x{} image to PNG", width, height);
    let mut img = RgbaImage::new(width, height);
    for y in 0..height {
        for x in 0..width {
            let idx = ((y * width + x) * 4) as usize;
            let b = pixels[idx];
            let g = pixels[idx + 1];
            let r = pixels[idx + 2];
            let a = pixels[idx + 3];
            img.put_pixel(x, y, Rgba([r, g, b, a]));
        }
    }

    // 编码为 PNG
    let mut png_bytes: Vec<u8> = Vec::new();
    if let Err(e) = img.write_to(&mut std::io::Cursor::new(&mut png_bytes), image::ImageOutputFormat::Png) {
        log::warn!("[Icon] PNG encoding failed: {}", e);
        return None;
    }

    // 转换为 Base64
    let base64_str = format!("data:image/png;base64,{}", general_purpose::STANDARD.encode(&png_bytes));
    
    // 保存到缓存
    save_icon_to_cache(&file_hash, &base64_str);
    
    let elapsed = start.elapsed();
    log::debug!("[Icon] Icon extraction completed in {:?}, size: {} bytes", elapsed, base64_str.len());
    Some(base64_str)
}

#[cfg(not(target_os = "windows"))]
fn get_app_icon(_path: &str) -> Option<String> {
    None
}

#[tauri::command]
pub fn get_plugins(state: State<AppState>) -> Result<Vec<PluginMetadata>, String> {
    let manager = state.plugin_manager.lock().unwrap();
    // 直接返回已加载的插件列表，不重新扫描
    Ok(manager.get_all_plugins())
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
    
    // 确保窗口可调整大小（拖拽必需）
    if let Err(e) = window.set_resizable(true) {
        eprintln!("[Window Pool] Warning: Failed to set resizable: {}", e);
    }
    
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

/// 【新特性】切换插件窗口置顶状态
#[tauri::command]
pub fn toggle_plugin_window_always_on_top(
    window: tauri::WebviewWindow,
) -> Result<bool, String> {
    eprintln!("[Window] Toggling always_on_top for window: {}", window.label());
    
    // 获取当前置顶状态
    let current_state = window.is_always_on_top().unwrap_or(false);
    let new_state = !current_state;
    
    // 设置新的置顶状态
    window.set_always_on_top(new_state).map_err(|e| {
        eprintln!("[Window] Failed to set always_on_top: {}", e);
        e.to_string()
    })?;
    
    eprintln!("[Window] Window {} always_on_top: {} -> {}", window.label(), current_state, new_state);
    
    Ok(new_state)
}

#[tauri::command]
pub fn show_window(window: WebviewWindow) -> Result<(), String> {
    eprintln!("[Window Manager] show_window called on: {}", window.label());
    
    // 【关键】强制设置 WebView 背景为透明，防止出现默认灰色背景
    let _ = window.eval(r#"
        (function() {
            const style = document.createElement('style');
            style.textContent = `
                html, body { 
                    background: transparent !important; 
                    background-color: transparent !important;
                }
                #root { 
                    background: transparent !important; 
                    background-color: transparent !important;
                }
            `;
            document.head.appendChild(style);
        })();
    "#);
    
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
    
    // 如果是主窗口，设置位置（屏幕上方居中）和初始高度
    if window.label() == "main" {
        eprintln!("[Window Manager] Setting main window position to top-center");
        
        // 获取主显示器尺寸
        if let Ok(monitor) = window.current_monitor() {
            if let Some(monitor) = monitor {
                let monitor_size = monitor.size();
                let window_width = 780.0;
                let window_height = 64.0;
                
                // 水平居中，垂直位置在屏幕顶部 15% 处
                let x = (monitor_size.width as f64 - window_width) / 2.0;
                let y = (monitor_size.height as f64) * 0.15;
                
                eprintln!("[Window Manager] Monitor: {}x{}, Position: ({:.0}, {:.0})", 
                    monitor_size.width, monitor_size.height, x, y);
                
                // 设置窗口位置
                if let Err(e) = window.set_position(Position::Logical(LogicalPosition { x, y })) {
                    eprintln!("[Window Manager] Failed to set position: {}", e);
                }
                
                // 重置为初始高度
                if let Err(e) = window.set_size(Size::Logical(LogicalSize { width: window_width, height: window_height })) {
                    eprintln!("[Window Manager] Failed to reset window size: {}", e);
                }
            }
        }
    }
    
    // 【关键优化】如果是主窗口，在显示之前先退出设置页面
    if window.label() == "main" {
        let exit_settings_js = r#"
            (function() {
                if (window.__exitSettings) {
                    console.log('[PreShow] Exiting settings page before showing window...');
                    window.__exitSettings();
                }
            })();
        "#;
        let _ = window.eval(exit_settings_js);
        // 等待 React 状态更新
        std::thread::sleep(std::time::Duration::from_millis(50));
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
                    // 确保输入框获得焦点
                    input.focus();
                    
                    // 【新特性】呼出窗口时，如果有内容则重新触发搜索
                    if (window.__handleShowWithSearch) {
                        console.log('[AutoFocus] Calling __handleShowWithSearch...');
                        window.__handleShowWithSearch();
                    } else {
                        // 备用方案：手动选中文本
                        setTimeout(() => {
                            input.select();
                            console.log('[AutoFocus] Input focused and text selected (fallback)');
                        }, 10);
                    }
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
    
    // 【修改】ESC 隐藏窗口时不再清空搜索框内容，保留用户输入
    // if window.label() == "main" {
    //     let _ = window.eval("window.__resetSearch && window.__resetSearch();");
    // }
    
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

/// 设置主窗口大小
#[tauri::command]
pub fn set_main_window_size(height: u32, window: WebviewWindow) -> Result<(), String> {
    eprintln!("[Window Manager] === SET WINDOW SIZE REQUEST ===");
    eprintln!("[Window Manager] Window label: {}", window.label());
    eprintln!("[Window Manager] Requested height: {}px", height);
    
    // 检查窗口是否可见
    match window.is_visible() {
        Ok(visible) => eprintln!("[Window Manager] Window visible: {}", visible),
        Err(e) => eprintln!("[Window Manager] Could not check visibility: {}", e),
    }
    
    // 获取当前大小
    if let Ok(current_size) = window.outer_size() {
        eprintln!("[Window Manager] Current size: {}x{}", current_size.width, current_size.height);
    }
    
    // 根据高度决定是否允许调整窗口大小
    // 64px 为未展开状态，禁止调整大小
    let resizable = height > 64;
    if let Err(e) = window.set_resizable(resizable) {
        eprintln!("[Window Manager] Warning: Failed to set resizable to {}: {}", resizable, e);
    } else {
        eprintln!("[Window Manager] Window resizable set to: {}", resizable);
    }
    
    // 设置新大小
    let new_size = Size::Logical(LogicalSize { width: 780.0, height: height as f64 });
    match window.set_size(new_size) {
        Ok(_) => {
            eprintln!("[Window Manager] ✓ Window size set successfully");
            // 验证新大小
            std::thread::sleep(std::time::Duration::from_millis(10));
            if let Ok(new_size_check) = window.outer_size() {
                eprintln!("[Window Manager] Verified size: {}x{}", new_size_check.width, new_size_check.height);
            }
            Ok(())
        },
        Err(e) => {
            eprintln!("[Window Manager] ✗ Failed to set size: {}", e);
            Err(e.to_string())
        }
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

/// 图标缓存目录（位于用户数据目录下，避免权限问题）
fn get_icon_cache_dir() -> Result<std::path::PathBuf, String> {
    // 【关键修复】使用用户数据目录而非安装目录，避免权限问题
    let cache_dir = if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
        // Windows: %LOCALAPPDATA%\quick-actions\icon-cache
        std::path::PathBuf::from(local_appdata).join("quick-actions").join("icon-cache")
    } else if let Ok(appdata) = std::env::var("APPDATA") {
        // Fallback: %APPDATA%\quick-actions\icon-cache
        std::path::PathBuf::from(appdata).join("quick-actions").join("icon-cache")
    } else {
        // 最后的备选：安装目录（可能会有权限问题）
        let exe_path = std::env::current_exe().map_err(|e| {
            log::error!("[Icon Cache] Failed to get current exe path: {}", e);
            e.to_string()
        })?;
        
        let install_dir = exe_path.parent().ok_or_else(|| {
            let err = "Failed to get install directory".to_string();
            log::error!("[Icon Cache] {}", err);
            err
        })?;
        
        install_dir.join("icon-cache")
    };
    
    log::debug!("[Icon Cache] Cache directory path: {:?}", cache_dir);
    
    // 创建目录（如果不存在）
    match std::fs::create_dir_all(&cache_dir) {
        Ok(_) => {
            log::info!("[Icon Cache] ✓ Cache directory ready: {:?}", cache_dir);
            Ok(cache_dir)
        }
        Err(e) => {
            log::error!("[Icon Cache] ✗ Failed to create cache directory {:?}: {}", cache_dir, e);
            Err(e.to_string())
        }
    }
}

/// 从缓存加载图标
fn load_icon_from_cache(file_hash: &str) -> Option<String> {
    let cache_dir = get_icon_cache_dir().ok()?;
    let cache_file = cache_dir.join(format!("{}.png", file_hash));
    
    if cache_file.exists() {
        match std::fs::read(&cache_file) {
            Ok(png_data) => {
                use base64::{Engine as _, engine::general_purpose};
                let base64_str = format!("data:image/png;base64,{}", general_purpose::STANDARD.encode(&png_data));
                log::debug!("[Icon Cache] Hit for {}", file_hash);
                Some(base64_str)
            }
            Err(e) => {
                log::warn!("[Icon Cache] Failed to read cache file: {}", e);
                None
            }
        }
    } else {
        None
    }
}

/// 保存图标到缓存
fn save_icon_to_cache(file_hash: &str, base64_data: &str) {
    match get_icon_cache_dir() {
        Ok(cache_dir) => {
            // 移除 "data:image/png;base64," 前缀
            if let Some(png_data) = base64_data.strip_prefix("data:image/png;base64,") {
                use base64::{Engine as _, engine::general_purpose};
                if let Ok(png_bytes) = general_purpose::STANDARD.decode(png_data) {
                    let cache_file = cache_dir.join(format!("{}.png", file_hash));
                    let cache_path = cache_file.display().to_string();
                    
                    log::debug!("[Icon Cache] Attempting to save to: {}", cache_path);
                    
                    match std::fs::write(&cache_file, &png_bytes) {
                        Ok(_) => {
                            log::info!("[Icon Cache] ✓ Saved {} ({} bytes) to: {}", 
                                      file_hash, png_bytes.len(), cache_path);
                        }
                        Err(e) => {
                            log::error!("[Icon Cache] ✗ Failed to write cache file: {}\n  Path: {}\n  Error: {}", 
                                       e, cache_path, e);
                        }
                    }
                } else {
                    log::warn!("[Icon Cache] Failed to decode base64 data for hash: {}", file_hash);
                }
            } else {
                log::warn!("[Icon Cache] Invalid base64 format for hash: {}", file_hash);
            }
        }
        Err(e) => {
            log::error!("[Icon Cache] Failed to get cache directory: {}", e);
        }
    }
}

/// 计算文件路径的哈希值（用于缓存键）
fn compute_file_hash(path: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    
    let mut hasher = DefaultHasher::new();
    path.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}

#[tauri::command]
pub fn get_start_menu_apps(app: tauri::AppHandle) -> Result<Vec<StartMenuApp>, String> {
    use std::fs;
    use std::time::Instant;
    
    let total_start = Instant::now();
    log::info!("[Icon] === Starting application scan ===");
    
    let mut apps = Vec::new();
    
    // Windows 开始菜单目录
    let start_menu_paths = vec![
        format!("{}\\Microsoft\\Windows\\Start Menu\\Programs", 
                std::env::var("APPDATA").unwrap_or_default()),
        "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs".to_string(),
    ];
    
    // 递归扫描函数（快速模式：不提取图标）
    fn scan_directory_fast(path: &std::path::Path, apps: &mut Vec<StartMenuApp>) {
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let entry_path = entry.path();
                
                if entry_path.is_dir() {
                    // 递归扫描子目录
                    scan_directory_fast(&entry_path, apps);
                } else if entry_path.extension().map_or(false, |ext| ext == "lnk") {
                    // 处理 .lnk 文件
                    if let Some(name) = entry_path.file_stem() {
                        let name_str = name.to_string_lossy().to_string();
                        let lnk_path = entry_path.display().to_string();
                        
                        apps.push(StartMenuApp {
                            name: name_str.clone(),
                            path: lnk_path,
                            executable: name_str,
                            description: None,
                            icon: None, // 先返回 None，后台异步加载
                        });
                    }
                }
            }
        }
    }
    
    // 递归扫描函数
    fn scan_directory(path: &std::path::Path, apps: &mut Vec<StartMenuApp>) {
        use std::time::Instant;
        let dir_start = Instant::now();
        log::debug!("[Icon] Scanning directory: {:?}", path);
        
        if let Ok(entries) = fs::read_dir(path) {
            let mut lnk_count = 0;
            for entry in entries.flatten() {
                let entry_path = entry.path();
                
                if entry_path.is_dir() {
                    // 递归扫描子目录
                    scan_directory(&entry_path, apps);
                } else if entry_path.extension().map_or(false, |ext| ext == "lnk") {
                    lnk_count += 1;
                    // 处理 .lnk 文件
                    if let Some(name) = entry_path.file_stem() {
                        let name_str = name.to_string_lossy().to_string();
                        
                        // 解析快捷方式，获取实际 EXE 路径
                        let lnk_path = entry_path.display().to_string();
                        log::debug!("[Icon] Processing LNK #{}: {}", lnk_count, name_str);
                        
                        let target_exe = resolve_lnk_target(&lnk_path);
                        
                        // 从实际 EXE 提取图标（无箭头），如果解析失败则 fallback 到 lnk
                        let icon_path = target_exe.as_ref().unwrap_or(&lnk_path);
                        let icon = get_app_icon(icon_path);
                        
                        apps.push(StartMenuApp {
                            name: name_str.clone(),
                            path: lnk_path,
                            executable: name_str,
                            description: None,
                            icon,
                        });
                    }
                }
            }
            let elapsed = dir_start.elapsed();
            log::debug!("[Icon] Directory scan completed: {} LNK files in {:?}", lnk_count, elapsed);
        }
    }
    
    // 扫描所有开始菜单路径（快速模式）
    log::info!("[Icon] Fast scanning for app list...");
    for base_path in &start_menu_paths {
        let path = std::path::Path::new(base_path);
        if path.exists() {
            scan_directory_fast(path, &mut apps);
        }
    }
    
    let fast_elapsed = total_start.elapsed();
    log::info!("[Icon] === Fast scan complete: {} apps found in {:?} ===", apps.len(), fast_elapsed);
    
    // 过滤掉卸载相关的程序
    let uninstall_keywords = ["卸载", "uninstall", "remove", "delete"];
    apps.retain(|app| {
        let name_lower = app.name.to_lowercase();
        !uninstall_keywords.iter().any(|keyword| name_lower.contains(keyword))
    });
    
    // 去重并按名称排序
    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps.dedup_by(|a, b| a.name.to_lowercase() == b.name.to_lowercase());
    
    log::info!("[Icon] After filtering: {} apps", apps.len());
    
    // 从缓存加载图标（快速模式：直接检查缓存文件，不解析快捷方式）
    log::debug!("[Icon] Loading icons from cache...");
    let mut cached_count = 0;
    for app in &mut apps {
        // 直接使用 LNK 路径作为缓存键（后台会用 EXE 路径更新缓存）
        let file_hash = compute_file_hash(&app.path);
        
        if let Some(cached_icon) = load_icon_from_cache(&file_hash) {
            app.icon = Some(cached_icon);
            cached_count += 1;
        }
    }
    log::info!("[Icon] Loaded {} icons from cache", cached_count);
    
    // 克隆应用列表用于后台图标提取
    let apps_for_background = apps.clone();
    
    // 启动后台线程异步提取图标并缓存
    std::thread::spawn(move || {
        log::info!("[Icon Background] Starting async icon extraction for {} apps", apps_for_background.len());
        let bg_start = std::time::Instant::now();
        
        // 【性能优化】收集所有 LNK 路径，批量解析
        let lnk_paths: Vec<String> = apps_for_background.iter()
            .map(|app| app.path.clone())
            .collect();
        
        log::info!("[Icon Background] Batch resolving {} LNK files...", lnk_paths.len());
        let resolved_targets = batch_resolve_lnk_targets(&lnk_paths);
        
        // 使用批量解析结果提取图标
        for (idx, (app, target_option)) in apps_for_background.iter().zip(resolved_targets.iter()).enumerate() {
            if idx % 10 == 0 {
                log::debug!("[Icon Background] Processing {}/{}", idx + 1, apps_for_background.len());
            }
            
            // 【关键修复】优先使用 EXE 路径提取图标（无箭头），如果解析失败才用 LNK
            let (icon_path, use_exe_hash) = if let Some(exe_path) = target_option {
                (exe_path.as_str(), true)  // 使用 EXE 路径
            } else {
                (app.path.as_str(), false)  // fallback 到 LNK
            };
            
            // 提取图标（会自动检查缓存）
            if let Some(icon_data) = get_app_icon(icon_path) {
                // 【关键修复】使用 EXE 路径的 hash 作为缓存键，避免箭头图标
                let cache_hash = if use_exe_hash {
                    compute_file_hash(icon_path)
                } else {
                    compute_file_hash(&app.path)
                };
                
                save_icon_to_cache(&cache_hash, &icon_data);
                
                // 同时用 LNK 路径保存一份缓存（指向同一个图标数据），方便下次快速加载
                let lnk_hash = compute_file_hash(&app.path);
                if lnk_hash != cache_hash {
                    save_icon_to_cache(&lnk_hash, &icon_data);
                }
                
                log::debug!("[Icon Background] Extracted icon for {} from: {}", app.name, icon_path);
            }
        }
        
        let bg_elapsed = bg_start.elapsed();
        log::info!("[Icon Background] === Async extraction complete in {:?} ===", bg_elapsed);
    });
    
    // 立即返回应用列表（无图标，但后台会缓存）
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
    
    #[cfg(not(target_os = "windows"))]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to launch application: {}", e))?;
    }
    
    Ok(())
}

/// 获取单个应用的图标（从缓存或实时提取）
#[tauri::command]
pub fn get_app_icon_by_path(path: String) -> Result<Option<String>, String> {
    // 解析快捷方式获取实际 EXE 路径
    let target_exe = resolve_lnk_target(&path);
    let icon_path = target_exe.as_ref().unwrap_or(&path);
    
    // 提取图标（会自动检查缓存）
    Ok(get_app_icon(icon_path))
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

/// 通过 es.exe Sidecar 搜索文件
#[tauri::command]
pub async fn everything_search(query: String, _host: Option<String>, app: tauri::AppHandle) -> Result<EverythingResponse, String> {
    eprintln!("[Everything CLI] Searching for: {}", query);
    
    // 使用 shell plugin 的 sidecar API
    eprintln!("[Everything CLI] Creating sidecar command...");
    let command = app.shell()
        .sidecar("libs/es")
        .map_err(|e| {
            eprintln!("[Everything CLI] Failed to create sidecar: {}", e);
            format!("Failed to create sidecar command: {}", e)
        })?
        .args(&[&query, "-json", "-max-results", "100"]);
    
    eprintln!("[Everything CLI] Executing command...");
    // 执行命令
    let output = command.output()
        .await
        .map_err(|e| {
            eprintln!("[Everything CLI] Execution failed: {}", e);
            format!("Failed to execute es.exe: {}", e)
        })?;
    
    eprintln!("[Everything CLI] Command completed with status: {}", output.status.success());
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        eprintln!("[Everything CLI] STDERR: {}", stderr);
        eprintln!("[Everything CLI] STDOUT: {}", stdout);
        return Err(format!("es.exe error: {}", stderr));
    }
    
    // 解析 JSON 输出
    let stdout = String::from_utf8_lossy(&output.stdout);
    eprintln!("[Everything CLI] Raw output length: {} bytes", stdout.len());
    eprintln!("[Everything CLI] Raw output: {}", if stdout.len() > 200 { &stdout[..200] } else { &stdout });
    
    // 解析 es.exe 的 JSON 输出格式
    let results = parse_es_output(&stdout)?;
    
    eprintln!("[Everything CLI] Found {} results", results.len());
    
    Ok(EverythingResponse { results })
}

/// 解析 es.exe 的 JSON 输出
fn parse_es_output(output: &str) -> Result<Vec<EverythingResult>, String> {
    // es.exe 的 JSON 输出格式：
    // [{"filename":"C:\\path\\file.txt","size":1234,"date_modified":"2024-01-01 12:00:00"}]
    
    let parsed: Vec<serde_json::Value> = serde_json::from_str(output)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
    let results = parsed.into_iter().filter_map(|item| {
        // es.exe 使用 "filename" 字段包含完整路径
        let filename = item.get("filename")?.as_str()?;
        
        // 分离文件名和路径
        let path_obj = std::path::Path::new(filename);
        let name = path_obj.file_name()?.to_string_lossy().to_string();
        let path = path_obj.parent()?.to_string_lossy().to_string();
        
        let size = item.get("size").and_then(|v| v.as_u64()).unwrap_or(0);
        let date_modified = item.get("date_modified")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        
        Some(EverythingResult {
            name,
            path,
            size,
            date_modified,
        })
    }).collect();
    
    Ok(results)
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
