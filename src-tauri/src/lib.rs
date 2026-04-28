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
    // 【性能监控】记录应用启动开始时间
    let startup_start = std::time::Instant::now();
    eprintln!("\n[Startup] ========================================");
    eprintln!("[Startup] Quick Actions starting...");
    eprintln!("[Startup] ========================================\n");
    
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
            let setup_start = std::time::Instant::now();
            eprintln!("[Startup] [1/6] Setup phase started");
            let setup_phase_start = std::time::Instant::now();
            
            let mut plugin_manager = PluginManager::new().expect("Failed to initialize plugin manager");
            let plugin_init_elapsed = setup_phase_start.elapsed();
            eprintln!("[Startup]   - PluginManager initialized in {:?}", plugin_init_elapsed);
            
            // 【关键修复】在注册前立即扫描插件，确保启动时插件已加载
            log::info!("[Setup] Scanning plugins during initialization...");
            let scan_start = std::time::Instant::now();
            match plugin_manager.scan_plugins() {
                Ok(plugins) => {
                    let scan_elapsed = scan_start.elapsed();
                    log::info!("[Setup] ✓ Loaded {} plugins during startup in {:?}", plugins.len(), scan_elapsed);
                    eprintln!("[Startup]   - Plugin scan completed: {} plugins in {:?}", plugins.len(), scan_elapsed);
                    for plugin in &plugins {
                        log::info!("[Setup]   - {} ({})", plugin.id, plugin.name);
                    }
                }
                Err(e) => {
                    let scan_elapsed = scan_start.elapsed();
                    log::error!("[Setup] ✗ Failed to scan plugins in {:?}: {}", scan_elapsed, e);
                    eprintln!("[Startup]   - Plugin scan failed in {:?}: {}", scan_elapsed, e);
                }
            }

            // 【关键修复】先注册 AppState，再创建窗口，防止前端在窗口初始化时调用命令报错
            log::info!("[Setup] Registering AppState...");
            let state_register_start = std::time::Instant::now();
            app.manage(AppState {
                plugin_manager: Mutex::new(plugin_manager),
                plugin_window_pool: Mutex::new(VecDeque::new()),
            });
            let state_register_elapsed = state_register_start.elapsed();
            log::info!("[Setup] AppState registered in {:?}.", state_register_elapsed);
            eprintln!("[Startup]   - AppState registered in {:?}", state_register_elapsed);
            
            // 预创建插件窗口池
            eprintln!("[Startup] [2/6] Creating plugin window pool...");
            let window_pool_start = std::time::Instant::now();
            let mut window_pool = VecDeque::new();
            let app_handle = app.handle().clone();
            
            for i in 0..5 {
                let window_label = format!("plugin-slot-{}", i);
                let slot_start = std::time::Instant::now();
                eprintln!("[Startup]   - Creating slot {}...", i);
                
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
                                        eprintln!("[Startup]     - Applied Acrylic + rounded corners");
                                    }
                                }
                            }
                        }
                        
                        window_pool.push_back(window_label);
                        let slot_elapsed = slot_start.elapsed();
                        eprintln!("[Startup]   ✓ Slot {} created in {:?}", i, slot_elapsed);
                    }
                    Err(e) => {
                        let slot_elapsed = slot_start.elapsed();
                        eprintln!("[Startup]   ✗ Failed to create slot {} in {:?}: {}", i, slot_elapsed, e);
                    }
                }
            }
            
            let window_pool_elapsed = window_pool_start.elapsed();
            eprintln!("[Startup]   - Window pool created: {} slots in {:?}", window_pool.len(), window_pool_elapsed);
            
            // 更新窗口池引用（因为之前 manage 的是空的）
            let pool_update_start = std::time::Instant::now();
            let state = app.state::<AppState>();
            let mut pool_guard = state.plugin_window_pool.lock().unwrap();
            *pool_guard = window_pool;
            drop(pool_guard);
            let pool_update_elapsed = pool_update_start.elapsed();
            log::info!("[Setup] Window pool updated with {} slots in {:?}.", state.plugin_window_pool.lock().unwrap().len(), pool_update_elapsed);
            eprintln!("[Startup]   - Window pool updated in {:?}", pool_update_elapsed);
            
            // 启动剪贴板后台监听线程
            eprintln!("[Startup] [3/6] Starting clipboard monitor...");
            let clipboard_start = std::time::Instant::now();
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
            let clipboard_elapsed = clipboard_start.elapsed();
            eprintln!("[Startup]   - Clipboard monitor started in {:?}", clipboard_elapsed);

            // 创建托盘图标
            eprintln!("[Startup] [4/6] Creating tray icon...");
            let tray_start = std::time::Instant::now();
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
            let tray_elapsed = tray_start.elapsed();
            eprintln!("[Startup]   - Tray icon created in {:?}", tray_elapsed);

            // 启动时立即隐藏主窗口，等待首次呼出
            eprintln!("[Startup] [5/6] Configuring main window...");
            let main_window_start = std::time::Instant::now();
            if let Some(window) = app.get_webview_window("main") {
                // 应用 Windows Acrylic 模糊效果
                #[cfg(target_os = "windows")]
                {
                    use window_vibrancy::*;
                    let _ = apply_acrylic(&window, Some((28, 28, 28, 180))); // 深色半透明背景
                    eprintln!("[Startup]   - Applied Acrylic effect");
                    
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
                                eprintln!("[Startup]   - Applied Windows 11 rounded corners");
                            } else {
                                eprintln!("[Startup]   - Failed to set DWM corner preference: {}", hr);
                            }
                        }
                    }
                }
                
                let _ = window.hide();
                let main_window_elapsed = main_window_start.elapsed();
                eprintln!("[Startup]   - Main window configured in {:?}", main_window_elapsed);
            }

            // 【调试】临时硬编码快捷键，确保能呼出窗口
            eprintln!("[Startup] [6/6] Registering shortcuts and event handlers...");
            let shortcut_start = std::time::Instant::now();
            #[cfg(target_os = "windows")]
            {
                use tauri_plugin_global_shortcut::GlobalShortcutExt;
                let _ = app.handle().plugin(tauri_plugin_global_shortcut::Builder::new().build());
                
                let main_window = app.get_webview_window("main").unwrap();
                let _ = app.global_shortcut().on_shortcut("Ctrl+Space", move |_app, _shortcut, _event| {
                    eprintln!("[Shortcut] Ctrl+Space pressed!");
                    if let Ok(visible) = main_window.is_visible() {
                        if visible {
                            let _ = main_window.hide();
                        } else {
                            let _ = main_window.show();
                            let _ = main_window.set_focus();
                        }
                    }
                });
                eprintln!("[Startup]   - Hardcoded Ctrl+Space registered");
            }
            
            // 【新特性】全局快捷键将在前端初始化时动态注册
            // 这里不再硬编码注册，允许用户自定义快捷键
            eprintln!("[Startup]   - Global shortcut will be registered dynamically from frontend");

            // 不设置焦点自动隐藏，改为在 open_plugin_window 中显式隐藏主窗口
            // 这样避免了焦点事件处理的竞态问题
            eprintln!("[Startup]   - Main window focus event handler: DISABLED");
            
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
                eprintln!("[Startup]   - Focus loss handler registered");
            }
            
            let shortcut_elapsed = shortcut_start.elapsed();
            eprintln!("[Startup]   - Shortcuts and handlers registered in {:?}", shortcut_elapsed);

            let setup_elapsed = setup_start.elapsed();
            eprintln!("\n[Startup] Setup phase completed in {:?}\n", setup_elapsed);

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
            commands::set_main_window_size_animated,  // 【新特性】带动画的窗口大小调整
            commands::get_plugin_path,
            commands::reload_plugins,
            commands::read_plugin_file,
            commands::plugin_list_dir,
            commands::plugin_search_files,
            commands::plugin_get_file_info,
            commands::emit_event,
            commands::get_start_menu_apps,
            commands::get_app_icon_by_path,  // 【性能优化】按需加载单个应用图标
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
    
    // 【性能监控】记录应用启动结束时间（这里实际上不会执行到，因为 run() 是阻塞的）
    let startup_elapsed = startup_start.elapsed();
    eprintln!("\n[Startup] ========================================");
    eprintln!("[Startup] Quick Actions startup completed in {:?}", startup_elapsed);
    eprintln!("[Startup] ========================================\n");
}
