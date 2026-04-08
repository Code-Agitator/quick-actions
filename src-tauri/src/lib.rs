mod commands;
mod plugin_manager;
mod plugin_api;

use commands::AppState;
use plugin_manager::PluginManager;
use std::sync::{Arc, Mutex};
use tauri::{Manager, Emitter, menu::{Menu, MenuItem, PredefinedMenuItem}, tray::{TrayIconBuilder, MouseButton, MouseButtonState}};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

fn toggle_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = commands::toggle_window(window);
    }
}

fn quit_app(app: &tauri::AppHandle) {
    let _ = app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let plugin_manager = PluginManager::new().expect("Failed to initialize plugin manager");
            app.manage(AppState {
                plugin_manager: Mutex::new(plugin_manager),
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

            // Windows 平台：在主窗口创建后立即移除系统菜单
            #[cfg(windows)]
            {
                use windows::Win32::UI::WindowsAndMessaging::{
                    GetWindowLongW, SetWindowLongW, GWL_STYLE, WS_SYSMENU
                };
                use windows::Win32::Foundation::HWND;
                
                if let Some(window) = app.get_webview_window("main") {
                    if let Ok(hwnd) = window.hwnd() {
                        let hwnd_value = hwnd.0 as isize;
                        unsafe {
                            let current_style = GetWindowLongW(HWND(hwnd_value), GWL_STYLE);
                            let new_style = current_style & !WS_SYSMENU.0 as i32;
                            SetWindowLongW(HWND(hwnd_value), GWL_STYLE, new_style);
                            println!("[Tauri] System menu removed from main window");
                        }
                    }
                }
            }

            // 启动时立即隐藏主窗口，等待首次呼出
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }

            let handle = app.handle().clone();
            let last_toggle = Arc::new(Mutex::new(std::time::Instant::now()));

            if let Err(e) = app.global_shortcut().on_shortcut("Alt+Space", move |_app, _shortcut, _event| {
                let mut last = last_toggle.lock().unwrap();
                let now = std::time::Instant::now();

                // 防抖：只有距离上次触发超过 200ms 才执行
                if now.duration_since(*last).as_millis() > 200 {
                    *last = now;
                    if let Some(window) = handle.get_webview_window("main") {
                        let _ = commands::toggle_window(window);
                    }
                }
            }) {
                eprintln!("Warning: Failed to register shortcut handler: {}", e);
            }

            if let Err(e) = app.global_shortcut().register("Alt+Space") {
                eprintln!("Warning: Failed to register global shortcut Alt+Space: {}", e);
                eprintln!("You can still use the app, but the global shortcut won't work.");
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
