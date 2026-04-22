mod commands;
mod plugin_manager;
mod plugin_api;
mod everything_ext;
mod process_manager;

use commands::AppState;
use plugin_manager::PluginManager;
use std::sync::{Arc, Mutex};
use std::collections::VecDeque;
use tauri::{Manager, menu::{Menu, MenuItem, PredefinedMenuItem}, tray::{TrayIconBuilder, MouseButton, MouseButtonState}};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

fn toggle_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = commands::toggle_window(window, app.clone());
    }
}

fn quit_app(app: &tauri::AppHandle) {
    let _ = app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_log::Builder::new()
            .level(log::LevelFilter::Debug)
            .target(tauri_plugin_log::Target::new(
                tauri_plugin_log::TargetKind::Folder {
                    path: dirs::data_dir().unwrap().join("com.develop.quick-actions"),
                    file_name: Some("logs".to_string()),
                },
            ))
            .build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let mut plugin_manager = PluginManager::new().expect("Failed to initialize plugin manager");
            
            // 【关键修复】在注册前立即扫描插件，确保启动时插件已加载
            log::info!("[Setup] Scanning plugins during initialization...");
            match plugin_manager.scan_plugins() {
                Ok(plugins) => {
                    log::info!("[Setup] ✓ Loaded {} plugins during startup", plugins.len());
                    for plugin in &plugins {
                        log::info!("[Setup]   - {} ({})", plugin.id, plugin.name);
                    }
                }
                Err(e) => {
                    log::error!("[Setup] ✗ Failed to scan plugins: {}", e);
                }
            }

            // 【关键修复】先注册 AppState，再创建窗口，防止前端在窗口初始化时调用命令报错
            log::info!("[Setup] Registering AppState...");
            app.manage(AppState {
                plugin_manager: Mutex::new(plugin_manager),
                plugin_window_pool: Mutex::new(VecDeque::new()),
            });
            log::info!("[Setup] AppState registered.");
            
            // 预创建插件窗口池
            eprintln!("[Window Pool] Creating plugin window pool...");
            let mut window_pool = VecDeque::new();
            let app_handle = app.handle().clone();
            
            for i in 0..5 {
                let window_label = format!("plugin-slot-{}", i);
                eprintln!("[Window Pool] Creating slot {}...", i);
                
                match tauri::WebviewWindowBuilder::new(
                    &app_handle,
                    &window_label,
                    tauri::WebviewUrl::App(format!("index.html?window=plugin&slot={}", i).into())
                )
                    .title("Plugin Window")
                    .inner_size(1200.0, 800.0)
                    .center()
                    .decorations(false)  // 去掉系统窗口装饰
                    .transparent(true)   // 启用透明背景
                    .resizable(true)     // 必须为 true 才能使用 data-tauri-drag-region
                    .always_on_top(false)
                    .skip_taskbar(false)
                    .visible(false)  // 初始隐藏
                    .build()
                {
                    Ok(window) => {
                        // 为插件窗口应用 Windows Acrylic 模糊效果
                        #[cfg(target_os = "windows")]
                        {
                            use window_vibrancy::*;
                            let _ = apply_acrylic(&window, Some((28, 28, 28, 180))); // 深色半透明背景
                            eprintln!("[Window Pool] Applied Acrylic effect to slot {}", i);
                            
                            // 使用 Windows 11 DWM API 设置窗口圆角
                            use winapi::um::dwmapi::DwmSetWindowAttribute;
                            use winapi::shared::windef::HWND;
                            use winapi::shared::minwindef::DWORD;
                            
                            if let Ok(hwnd) = window.hwnd() {
                                unsafe {
                                    let corner_preference: DWORD = 2; // DWMWCP_ROUND
                                    let hr = DwmSetWindowAttribute(
                                        hwnd.0 as HWND,
                                        33, // DWMWA_WINDOW_CORNER_PREFERENCE
                                        &corner_preference as *const DWORD as *const _,
                                        std::mem::size_of::<DWORD>() as u32,
                                    );
                                    
                                    if hr == 0 {
                                        eprintln!("[Window Pool] Applied Windows 11 rounded corners to slot {}", i);
                                    }
                                }
                            }
                        }
                        
                        window_pool.push_back(window_label);
                        eprintln!("[Window Pool] ✓ Slot {} created", i);
                    }
                    Err(e) => {
                        eprintln!("[Window Pool] ✗ Failed to create slot {}: {}", i, e);
                    }
                }
            }
            
            eprintln!("[Window Pool] Created {} slots", window_pool.len());
            
            // 更新窗口池引用（因为之前 manage 的是空的）
            let state = app.state::<AppState>();
            let mut pool_guard = state.plugin_window_pool.lock().unwrap();
            *pool_guard = window_pool;
            drop(pool_guard);
            log::info!("[Setup] Window pool updated with {} slots.", state.plugin_window_pool.lock().unwrap().len());
            
            // 启动剪贴板后台监听线程
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                use arboard::Clipboard;
                use std::time::Duration;
                
                let mut last_content = String::new();
                loop {
                    std::thread::sleep(Duration::from_millis(1000));
                    if let Ok(mut clipboard) = Clipboard::new() {
                        if let Ok(text) = clipboard.get_text() {
                            if !text.is_empty() && text != last_content {
                                log::info!("[Clipboard Monitor] Detected new content: {}", text.chars().take(20).collect::<String>());
                                last_content = text.clone();
                                // 存入通用存储 (使用专门的 key)
                                let _ = commands::storage_set(
                                    "clipboard_history".to_string(), 
                                    text, 
                                    app_handle.clone()
                                );
                            }
                        }
                    }
                }
            });

            // 创建托盘图标
            let _ = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Quick Actions")
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event {
                        toggle_main_window(tray.app_handle());
                    }
                })
                .menu(&Menu::with_items(app.handle(), &[
                    &MenuItem::with_id::<_, _, _, _>(app.handle(), "toggle", "呼出/隐藏", true, None::<&str>)?,
                    &PredefinedMenuItem::separator(app.handle())?,
                    &PredefinedMenuItem::quit(app.handle(), None)?,
                ])?)
                .build(app.handle())?;

            // 启动时立即隐藏主窗口，等待首次呼出
            if let Some(window) = app.get_webview_window("main") {
                // 应用 Windows Acrylic 模糊效果
                #[cfg(target_os = "windows")]
                {
                    use window_vibrancy::*;
                    let _ = apply_acrylic(&window, Some((28, 28, 28, 180))); // 深色半透明背景
                    eprintln!("[Window] Applied Acrylic effect to main window");
                    
                    // 使用 Windows 11 DWM API 设置窗口圆角
                    use winapi::um::dwmapi::DwmSetWindowAttribute;
                    use winapi::shared::windef::HWND;
                    use winapi::shared::minwindef::DWORD;
                    
                    if let Ok(hwnd) = window.hwnd() {
                        unsafe {
                            // DWMWA_WINDOW_CORNER_PREFERENCE = 33
                            // DWMWCP_ROUND = 2 (圆角)
                            let corner_preference: DWORD = 2; // DWMWCP_ROUND
                            let hr = DwmSetWindowAttribute(
                                hwnd.0 as HWND,
                                33, // DWMWA_WINDOW_CORNER_PREFERENCE
                                &corner_preference as *const DWORD as *const _,
                                std::mem::size_of::<DWORD>() as u32,
                            );
                            
                            if hr == 0 {
                                eprintln!("[Window] Applied Windows 11 rounded corners via DWM");
                            } else {
                                eprintln!("[Window] Failed to set DWM corner preference: {}", hr);
                            }
                        }
                    }
                }
                
                let _ = window.hide();
            }

            // 【新特性】全局快捷键将在前端初始化时动态注册
            // 这里不再硬编码注册，允许用户自定义快捷键
            eprintln!("[Shortcut] Global shortcut will be registered dynamically from frontend settings");

            // 不设置焦点自动隐藏，改为在 open_plugin_window 中显式隐藏主窗口
            // 这样避免了焦点事件处理的竞态问题
            eprintln!("[Tauri] Main window focus event handler: DISABLED (handled explicitly in commands)");
            
            // 【新特性】主窗体失焦时隐藏
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(focused) = event {
                        if !focused {
                            eprintln!("[Window] Main window lost focus, hiding...");
                            let _ = window_clone.hide();
                        }
                    }
                });
                eprintln!("[Window] Focus loss handler registered for main window");
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_plugins,
            commands::execute_plugin,
            commands::install_plugin,
            commands::uninstall_plugin,
            commands::show_window,
            commands::hide_window,
            commands::toggle_window,
            commands::open_plugin_window,
            commands::close_plugin_window,
            commands::close_all_plugin_windows,
            commands::toggle_plugin_window_always_on_top,  // 【新特性】切换插件窗口置顶
            commands::set_main_window_size,
            commands::get_plugin_path,
            commands::reload_plugins,
            commands::read_plugin_file,
            commands::plugin_list_dir,
            commands::plugin_search_files,
            commands::plugin_get_file_info,
            commands::emit_event,
            commands::get_start_menu_apps,
            commands::launch_application,
            commands::everything_search,
            // Everything 扩展命令
            everything_ext::everything_search_extended,
            everything_ext::preview_file_content,
            everything_ext::get_file_info,
            everything_ext::plugin_everything_open,
            plugin_api::plugin_read_file,
            plugin_api::plugin_write_file,
            plugin_api::plugin_execute_command,
            plugin_api::plugin_show_notification,
            plugin_api::plugin_everything_search,
            plugin_api::plugin_http_request,
            commands::clipboard_read,
            commands::clipboard_write,
            commands::storage_set,
            commands::storage_get,
            commands::get_clipboard_history,
            commands::log_frontend_message,
            commands::open_path,
            commands::reveal_in_folder,
            commands::update_global_shortcut,  // 【新特性】更新全局快捷键
            commands::check_shortcut_available,  // 【新特性】检查快捷键是否可用
            // 进程管理命令
            process_manager::process_list,
            process_manager::process_get,
            process_manager::process_search_by_name,
            process_manager::process_find_by_port,
            process_manager::process_find_by_file,
            process_manager::process_kill,
            process_manager::process_graceful_kill,
            process_manager::process_get_stats,
            process_manager::process_get_open_files,
            process_manager::process_get_listening_ports,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
