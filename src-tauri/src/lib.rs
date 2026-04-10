mod commands;
mod plugin_manager;
mod plugin_api;

use commands::AppState;
use plugin_manager::PluginManager;
use std::sync::{Arc, Mutex};
use std::collections::VecDeque;
use tauri::{Manager, Emitter, menu::{Menu, MenuItem, PredefinedMenuItem}, tray::{TrayIconBuilder, MouseButton, MouseButtonState}};
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
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let plugin_manager = PluginManager::new().expect("Failed to initialize plugin manager");

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
                    .decorations(true)
                    .transparent(false)
                    .always_on_top(false)
                    .skip_taskbar(false)
                    .visible(false)  // 初始隐藏
                    .build()
                {
                    Ok(_) => {
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
            let mut state = app.state::<AppState>();
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

            // Windows 平台:在主窗口创建后立即移除系统菜单并设置 Acrylic 效果和圆角
            #[cfg(windows)]
            {
                use windows::Win32::UI::WindowsAndMessaging::{
                    GetWindowLongW, SetWindowLongW, GWL_STYLE, WS_SYSMENU
                };
                use windows::Win32::Foundation::HWND;
                use windows::Win32::Graphics::Dwm::{
                    DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE,
                    DWM_WINDOW_CORNER_PREFERENCE, DWMWCP_ROUND
                };
                
                if let Some(window) = app.get_webview_window("main") {
                    if let Ok(hwnd) = window.hwnd() {
                        let hwnd_value = hwnd.0 as isize;
                        unsafe {
                            // 移除系统菜单
                            let current_style = GetWindowLongW(HWND(hwnd_value), GWL_STYLE);
                            let new_style = current_style & !WS_SYSMENU.0 as i32;
                            SetWindowLongW(HWND(hwnd_value), GWL_STYLE, new_style);
                            println!("[Tauri] System menu removed from main window");
                            
                            // 设置窗口圆角 (DWMWCP_ROUND = 2)
                            let corner_preference = DWM_WINDOW_CORNER_PREFERENCE(DWMWCP_ROUND.0);
                            let result = DwmSetWindowAttribute(
                                HWND(hwnd_value),
                                DWMWA_WINDOW_CORNER_PREFERENCE,
                                &corner_preference as *const _ as *const _,
                                std::mem::size_of::<DWM_WINDOW_CORNER_PREFERENCE>() as u32
                            );
                            if result.is_ok() {
                                println!("[Tauri] Window corner radius set to rounded");
                            } else {
                                eprintln!("[Tauri] Failed to set window corner radius");
                            }
                        }
                    }
                    
                    // 使用 window-vibrancy 设置 Acrylic 毛玻璃效果（暗色调，更高透明度）
                    match window_vibrancy::apply_acrylic(&window, Some((30, 30, 30, 160))) {
                        Ok(_) => println!("[Tauri] Dark Acrylic effect applied successfully"),
                        Err(e) => eprintln!("[Tauri] Failed to apply acrylic: {}", e),
                    }
                }
            }

            // 启动时立即隐藏主窗口，等待首次呼出
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }

            let handle = app.handle().clone();
            let last_toggle = Arc::new(Mutex::new(std::time::Instant::now()));

            // 注册全局快捷键 Ctrl+Space
            if let Err(e) = app.global_shortcut().on_shortcut("Ctrl+Space", move |_app, _shortcut, event| {
                use tauri_plugin_global_shortcut::ShortcutState;
                
                // 只在按键按下时触发，忽略释放事件
                if event.state() != ShortcutState::Pressed {
                    return;
                }
                
                let mut last = last_toggle.lock().unwrap();
                let now = std::time::Instant::now();

                // 防抖：只有距离上次触发超过 300ms 才执行
                if now.duration_since(*last).as_millis() > 300 {
                    *last = now;
                    eprintln!("[Shortcut] Ctrl+Space pressed - toggling window");
                    toggle_main_window(&handle);
                } else {
                    eprintln!("[Shortcut] Ctrl+Space skipped (debounce: {}ms)", now.duration_since(*last).as_millis());
                }
            }) {
                eprintln!("Warning: Failed to register shortcut handler: {}", e);
            }

            // 不设置焦点自动隐藏，改为在 open_plugin_window 中显式隐藏主窗口
            // 这样避免了焦点事件处理的竞态问题
            eprintln!("[Tauri] Main window focus event handler: DISABLED (handled explicitly in commands)");

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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
