mod commands;
mod plugin_manager;
mod plugin_api;

use commands::AppState;
use plugin_manager::PluginManager;
use std::sync::{Arc, Mutex};
use tauri::Manager;
use tauri_plugin_global_shortcut::GlobalShortcutExt;

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

            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(false) = event {
                        let _ = window_clone.hide();
                    }
                });
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
            commands::get_plugin_path,
            commands::reload_plugins,
            commands::read_plugin_file,
            commands::plugin_list_dir,
            commands::plugin_search_files,
            commands::plugin_get_file_info,
            plugin_api::plugin_read_file,
            plugin_api::plugin_write_file,
            plugin_api::plugin_execute_command,
            plugin_api::plugin_show_notification,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
