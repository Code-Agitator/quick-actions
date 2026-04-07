use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use walkdir::WalkDir;
use notify::{Watcher, RecursiveMode, Event};
use std::sync::mpsc::channel;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginMetadata {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub icon: Option<String>,
    pub keywords: Vec<String>,
    pub entry: String,
    #[serde(default)]
    pub entry_type: PluginEntryType,
    #[serde(default)]
    pub permissions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum PluginEntryType {
    #[default]
    Js,
    Html,
    Esm,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginResult {
    pub title: String,
    pub description: Option<String>,
    pub icon: Option<String>,
}

pub struct PluginManager {
    plugins: HashMap<String, PluginMetadata>,
    plugin_paths: HashMap<String, PathBuf>,  // 记录每个插件的实际路径
    plugin_dir: PathBuf,
    watcher: Option<notify::RecommendedWatcher>,
}

impl PluginManager {
    pub fn new() -> Result<Self, String> {
        let plugin_dir = dirs::data_dir()
            .ok_or("Failed to get data directory")?
            .join("quick-actions")
            .join("plugins");

        fs::create_dir_all(&plugin_dir).map_err(|e| e.to_string())?;

        Ok(Self {
            plugins: HashMap::new(),
            plugin_paths: HashMap::new(),
            plugin_dir,
            watcher: None,
        })
    }

    pub fn start_watching(&mut self, callback: impl Fn() + Send + 'static) -> Result<(), String> {
        let (tx, rx) = channel();
        let mut watcher = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
            if let Ok(_event) = res {
                let _ = tx.send(());
            }
        }).map_err(|e| e.to_string())?;

        watcher.watch(&self.plugin_dir, RecursiveMode::Recursive)
            .map_err(|e| e.to_string())?;

        std::thread::spawn(move || {
            while rx.recv().is_ok() {
                callback();
            }
        });

        self.watcher = Some(watcher);
        Ok(())
    }

    pub fn get_plugin_path(&self, id: &str) -> Option<PathBuf> {
        self.plugin_paths.get(id).cloned()
    }

    pub fn scan_plugins(&mut self) -> Result<Vec<PluginMetadata>, String> {
        self.plugins.clear();
        self.plugin_paths.clear();

        // 获取要扫描的目录
        let user_plugin_dir = self.plugin_dir.clone();
        self.scan_directory_internal(&user_plugin_dir)?;

        // 扫描内置插件目录
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                let builtin_plugins = exe_dir.join("plugins");
                self.scan_directory_internal(&builtin_plugins)?;
            }
        }

        // 开发模式：扫描项目源码中的 plugins 目录
        if let Ok(current_dir) = std::env::current_dir() {
            // current_dir 可能是 src-tauri，需要向上一级查找
            let source_plugins = if current_dir.ends_with("src-tauri") {
                // 如果在 src-tauri 目录，向上一级
                current_dir.parent().unwrap_or(&current_dir).join("plugins")
            } else {
                // 否则直接使用当前目录的 plugins
                current_dir.join("plugins")
            };
            
            if source_plugins.exists() {
                println!("[PluginManager] Scanning source plugins directory: {:?}", source_plugins);
                self.scan_directory_internal(&source_plugins)?;
            } else {
                println!("[PluginManager] Source plugins directory does not exist: {:?}", source_plugins);
            }
        }

        println!("[PluginManager] Total plugins loaded: {}", self.plugins.len());
        Ok(self.plugins.values().cloned().collect())
    }

    fn scan_directory(&mut self, dir: &PathBuf) -> Result<(), String> {
        self.scan_directory_internal(dir)
    }

    fn scan_directory_internal(&mut self, dir: &PathBuf) -> Result<(), String> {
        if !dir.exists() {
            println!("[PluginManager] Directory does not exist: {:?}", dir);
            return Ok(());
        }

        println!("[PluginManager] Scanning directory: {:?}", dir);

        let entries: Vec<_> = WalkDir::new(dir)
            .max_depth(2)
            .into_iter()
            .filter_map(|e| e.ok())
            .collect();

        for entry in entries {
            if entry.file_name() == "plugin.json" {
                println!("[PluginManager] Found plugin.json at: {:?}", entry.path());
                
                if let Ok(content) = fs::read_to_string(entry.path()) {
                    match serde_json::from_str::<PluginMetadata>(&content) {
                        Ok(metadata) => {
                            println!("[PluginManager] ✓ Loaded plugin: {} ({})", metadata.id, metadata.name);
                            
                            // 记录插件的实际目录路径（plugin.json 的父目录）
                            if let Some(plugin_dir) = entry.path().parent() {
                                self.plugin_paths.insert(metadata.id.clone(), plugin_dir.to_path_buf());
                            }
                            self.plugins.insert(metadata.id.clone(), metadata);
                        },
                        Err(e) => {
                            eprintln!("[PluginManager] ✗ Failed to parse plugin.json at {:?}", entry.path());
                            eprintln!("[PluginManager]   Error: {}", e);
                            eprintln!("[PluginManager]   Content preview: {}...", &content[..100.min(content.len())]);
                        }
                    }
                }
            }
        }

        Ok(())
    }

    pub fn get_plugin(&self, id: &str) -> Option<&PluginMetadata> {
        self.plugins.get(id)
    }

    pub fn install_plugin(&mut self, source_path: &str) -> Result<(), String> {
        let source = PathBuf::from(source_path);
        if !source.exists() {
            return Err("Source path does not exist".to_string());
        }

        let manifest_path = source.join("plugin.json");
        let content = fs::read_to_string(&manifest_path).map_err(|e| e.to_string())?;
        let metadata: PluginMetadata = serde_json::from_str(&content).map_err(|e| e.to_string())?;

        let target_dir = self.plugin_dir.join(&metadata.id);
        if target_dir.exists() {
            fs::remove_dir_all(&target_dir).map_err(|e| e.to_string())?;
        }

        fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;

        for entry in WalkDir::new(&source).into_iter().filter_map(|e| e.ok()) {
            if entry.file_type().is_file() {
                let relative = entry.path().strip_prefix(&source).unwrap();
                let target = target_dir.join(relative);
                if let Some(parent) = target.parent() {
                    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                }
                fs::copy(entry.path(), target).map_err(|e| e.to_string())?;
            }
        }

        self.plugins.insert(metadata.id.clone(), metadata);
        Ok(())
    }

    pub fn uninstall_plugin(&mut self, id: &str) -> Result<(), String> {
        let plugin_dir = self.plugin_dir.join(id);
        if plugin_dir.exists() {
            fs::remove_dir_all(plugin_dir).map_err(|e| e.to_string())?;
        }
        self.plugins.remove(id);
        Ok(())
    }
}
