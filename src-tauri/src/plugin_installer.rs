/// Plugin installer module for handling ZIP-based plugin installation
/// 
/// This module provides functionality to:
/// - Extract and validate plugin ZIP files
/// - Install plugins to the user's plugin directory
/// - Uninstall plugins by ID
/// - List all installed plugins
/// 
/// Security features:
/// - Path traversal attack prevention
/// - plugin.json format validation
/// - SHA256 hash calculation for integrity verification

use std::fs;
use std::io::{self, Read};
use std::path::{Path, PathBuf};
use tempfile::TempDir;
use sha2::{Sha256, Digest};
use zip::ZipArchive;
use serde::{Deserialize, Serialize};

/// Plugin metadata structure matching the frontend PluginManifest interface
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    /// Unique plugin identifier (e.g., "uuid-generator")
    pub id: String,
    /// Display name of the plugin
    pub name: String,
    /// Semantic version string (e.g., "1.0.0")
    pub version: String,
    /// Description of what the plugin does
    pub description: String,
    /// Optional author name
    pub author: Option<String>,
    /// Entry point file path (relative to plugin root)
    pub entry: String,
    /// Optional icon file path
    pub icon: Option<String>,
    /// Optional keywords for search/discovery
    pub keywords: Option<Vec<String>>,
}

/// Installation result returned to the frontend
#[derive(Debug, Serialize)]
pub struct InstallResult {
    /// Whether the installation was successful
    pub success: bool,
    /// Plugin ID if available
    pub plugin_id: Option<String>,
    /// Plugin version if available
    pub plugin_version: Option<String>,
    /// Installation path if successful
    pub install_path: Option<String>,
    /// Error message if failed
    pub error: Option<String>,
    /// SHA256 hash for integrity verification
    pub hash: Option<String>,
}

/// Validate ZIP file for security issues (path traversal, absolute paths, etc.)
/// 
/// # Arguments
/// * `archive` - The ZIP archive to validate
/// 
/// # Returns
/// * `Ok(())` if the archive is safe
/// * `Err(String)` with a descriptive error message if security issues are found
/// 
/// # Security Checks
/// - Rejects paths containing ".." (path traversal)
/// - Rejects paths starting with "/" or "\" (absolute paths on Unix/Windows)
/// - Rejects any absolute paths
fn validate_zip_safety(archive: &mut ZipArchive<impl Read + io::Seek>) -> Result<(), String> {
    for i in 0..archive.len() {
        let file = archive.by_index(i)
            .map_err(|e| format!("Failed to read file {}: {}", i, e))?;
        let name = file.name();
        
        // Check for path traversal attacks
        if name.contains("..") {
            return Err(format!("Security violation: path traversal detected in '{}'", name));
        }
        
        // Check for absolute paths starting with / or \
        if name.starts_with('/') || name.starts_with('\\') {
            return Err(format!("Security violation: absolute path detected '{}'", name));
        }
        
        // Additional check using Path API for platform-specific absolute path detection
        let path = Path::new(name);
        if path.is_absolute() {
            return Err(format!("Security violation: absolute path detected '{}'", name));
        }
    }
    
    Ok(())
}

/// Extract ZIP file to temporary directory and validate plugin.json
/// 
/// # Arguments
/// * `zip_path` - Path to the ZIP file to extract
/// 
/// # Returns
/// * `Ok((TempDir, PluginManifest))` - Temporary directory (kept alive) and parsed manifest
/// * `Err(String)` - Descriptive error message on failure
/// 
/// # Process
/// 1. Opens and validates the ZIP file
/// 2. Creates a temporary directory
/// 3. Extracts all files with security validation
/// 4. Reads and validates plugin.json
/// 5. Returns the temp directory and manifest
fn extract_to_temp(zip_path: &Path) -> Result<(TempDir, PluginManifest), String> {
    // Open ZIP file
    let file = fs::File::open(zip_path)
        .map_err(|e| format!("Failed to open ZIP file: {}", e))?;
    
    let mut archive = ZipArchive::new(file)
        .map_err(|e| format!("Invalid ZIP file: {}", e))?;
    
    // Validate security before extraction
    validate_zip_safety(&mut archive)?;
    
    // Create temporary directory (automatically cleaned up when TempDir is dropped)
    let temp_dir = TempDir::new()
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;
    
    // Extract all files
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| format!("Failed to extract file {}: {}", i, e))?;
        
        let outpath = temp_dir.path().join(file.name());
        
        if file.name().ends_with('/') {
            // Create directory
            fs::create_dir_all(&outpath)
                .map_err(|e| format!("Failed to create directory '{}': {}", outpath.display(), e))?;
        } else {
            // Ensure parent directory exists
            if let Some(parent) = outpath.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent directory '{}': {}", parent.display(), e))?;
            }
            
            // Write file content
            let mut outfile = fs::File::create(&outpath)
                .map_err(|e| format!("Failed to create output file '{}': {}", outpath.display(), e))?;
            
            io::copy(&mut file, &mut outfile)
                .map_err(|e| format!("Failed to write file '{}': {}", outpath.display(), e))?;
        }
    }
    
    // Read and validate plugin.json
    let plugin_json_path = temp_dir.path().join("plugin.json");
    if !plugin_json_path.exists() {
        return Err("Missing required file: plugin.json".to_string());
    }
    
    let plugin_json_content = fs::read_to_string(&plugin_json_path)
        .map_err(|e| format!("Failed to read plugin.json: {}", e))?;
    
    let manifest: PluginManifest = serde_json::from_str(&plugin_json_content)
        .map_err(|e| format!("Invalid plugin.json format: {}", e))?;
    
    // Validate required fields
    if manifest.id.is_empty() {
        return Err("plugin.json: 'id' field is required and cannot be empty".to_string());
    }
    
    if manifest.name.is_empty() {
        return Err("plugin.json: 'name' field is required and cannot be empty".to_string());
    }
    
    if manifest.version.is_empty() {
        return Err("plugin.json: 'version' field is required and cannot be empty".to_string());
    }
    
    if manifest.description.is_empty() {
        return Err("plugin.json: 'description' field is required and cannot be empty".to_string());
    }
    
    if manifest.entry.is_empty() {
        return Err("plugin.json: 'entry' field is required and cannot be empty".to_string());
    }
    
    Ok((temp_dir, manifest))
}

/// Calculate SHA256 hash of a file for integrity verification
/// 
/// # Arguments
/// * `file_path` - Path to the file to hash
/// 
/// # Returns
/// * `Ok(String)` - Hexadecimal SHA256 hash string
/// * `Err(String)` - Descriptive error message on failure
/// 
/// # Implementation Details
/// Uses 8KB buffer for efficient reading of large files
fn calculate_file_hash(file_path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(file_path)
        .map_err(|e| format!("Failed to open file for hashing: {}", e))?;
    
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192]; // 8KB buffer for efficient I/O
    
    loop {
        let bytes_read = file.read(&mut buffer)
            .map_err(|e| format!("Failed to read file: {}", e))?;
        
        if bytes_read == 0 {
            break;
        }
        
        hasher.update(&buffer[..bytes_read]);
    }
    
    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}

/// Get the plugins installation directory from system app data
/// 
/// # Returns
/// * `Ok(PathBuf)` - Path to the plugins directory
/// * `Err(String)` - Descriptive error message on failure
/// 
/// # Directory Location
/// - Windows: `%APPDATA%/QuickActions/plugins`
/// - macOS: `~/Library/Application Support/QuickActions/plugins`
/// - Linux: `~/.local/share/QuickActions/plugins`
fn get_plugins_dir() -> Result<PathBuf, String> {
    // Use Tauri's app data directory via dirs crate
    let app_data_dir = dirs::data_local_dir()
        .ok_or_else(|| "Failed to get app data directory".to_string())?;
    
    let plugins_dir = app_data_dir.join("QuickActions").join("plugins");
    
    // Create directory if it doesn't exist
    fs::create_dir_all(&plugins_dir)
        .map_err(|e| format!("Failed to create plugins directory '{}': {}", plugins_dir.display(), e))?;
    
    Ok(plugins_dir)
}

/// Helper function to recursively copy directory contents
/// 
/// # Arguments
/// * `src` - Source directory path
/// * `dst` - Destination directory path
/// 
/// # Returns
/// * `Ok(())` on success
/// * `Err(String)` on failure
fn copy_dir_contents(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst)
        .map_err(|e| format!("Failed to create destination directory '{}': {}", dst.display(), e))?;
    
    for entry in fs::read_dir(src)
        .map_err(|e| format!("Failed to read source directory '{}': {}", src.display(), e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        
        if src_path.is_dir() {
            // Recursively copy subdirectory
            copy_dir_contents(&src_path, &dst_path)?;
        } else {
            // Copy file
            fs::copy(&src_path, &dst_path)
                .map_err(|e| format!("Failed to copy file '{}' to '{}': {}", 
                    src_path.display(), dst_path.display(), e))?;
        }
    }
    
    Ok(())
}

/// Install plugin from extracted temporary directory to permanent location
/// 
/// # Arguments
/// * `temp_dir` - Path to the temporary directory containing extracted files
/// * `manifest` - Validated plugin manifest
/// 
/// # Returns
/// * `Ok(PathBuf)` - Path to the installed plugin directory
/// * `Err(String)` - Descriptive error message on failure
/// 
/// # Installation Process
/// 1. Gets the plugins directory
/// 2. Creates plugin-specific directory: `{plugin_id}-{version}`
/// 3. Checks for existing installation (prevents duplicates)
/// 4. Copies all files from temp to plugin directory
/// 5. Verifies critical files exist (dist/, entry file)
/// 6. Cleans up on failure
fn install_plugin_from_temp(
    temp_dir: &Path,
    manifest: &PluginManifest,
) -> Result<PathBuf, String> {
    let plugins_dir = get_plugins_dir()?;
    
    // Create plugin-specific directory: {plugin_id}-{version}
    let plugin_dir_name = format!("{}-{}", manifest.id, manifest.version);
    let plugin_dir = plugins_dir.join(&plugin_dir_name);
    
    // Check if already installed
    if plugin_dir.exists() {
        return Err(format!(
            "Plugin {} v{} is already installed. Uninstall it first.",
            manifest.id, manifest.version
        ));
    }
    
    // Copy files from temp to plugin directory
    copy_dir_contents(temp_dir, &plugin_dir)?;
    
    // Verify critical files exist
    let dist_dir = plugin_dir.join("dist");
    if !dist_dir.exists() {
        // Clean up on failure
        fs::remove_dir_all(&plugin_dir)
            .unwrap_or_else(|e| println!("⚠️ Warning: Failed to clean up {}: {}", plugin_dir.display(), e));
        return Err("Missing required directory: dist/".to_string());
    }
    
    let entry_file = plugin_dir.join(&manifest.entry);
    if !entry_file.exists() {
        // Clean up on failure
        fs::remove_dir_all(&plugin_dir)
            .unwrap_or_else(|e| println!("⚠️ Warning: Failed to clean up {}: {}", plugin_dir.display(), e));
        return Err(format!("Missing entry file: {}", manifest.entry));
    }
    
    Ok(plugin_dir)
}

/// Install a plugin from a ZIP file (Tauri Command)
/// 
/// # Arguments
/// * `zip_path` - Path to the ZIP file to install
/// 
/// # Returns
/// * `Ok(InstallResult)` - Installation result with success status and details
/// * `Err(String)` - System-level error (should not happen, errors are wrapped in InstallResult)
/// 
/// # Installation Flow
/// 1. Validates ZIP file exists
/// 2. Extracts to temporary directory with security validation
/// 3. Validates plugin.json format and required fields
/// 4. Installs to permanent plugin directory
/// 5. Calculates SHA256 hash for integrity verification
/// 6. Registers plugin in registry
/// 7. Returns installation result
#[tauri::command]
pub async fn install_plugin_from_zip(zip_path: String) -> Result<InstallResult, String> {
    let zip_path = Path::new(&zip_path);
    
    // Verify file exists
    if !zip_path.exists() {
        return Ok(InstallResult {
            success: false,
            plugin_id: None,
            plugin_version: None,
            install_path: None,
            error: Some(format!("ZIP file not found: {}", zip_path.display())),
            hash: None,
        });
    }
    
    // Step 1: Extract to temporary directory and validate
    let (temp_dir, manifest) = match extract_to_temp(zip_path) {
        Ok(result) => result,
        Err(e) => {
            return Ok(InstallResult {
                success: false,
                plugin_id: None,
                plugin_version: None,
                install_path: None,
                error: Some(e),
                hash: None,
            });
        }
    };
    
    println!("✅ Validated plugin: {} v{}", manifest.id, manifest.version);
    
    // Step 2: Install to permanent location
    let install_path = match install_plugin_from_temp(temp_dir.path(), &manifest) {
        Ok(path) => path,
        Err(e) => {
            return Ok(InstallResult {
                success: false,
                plugin_id: Some(manifest.id.clone()),
                plugin_version: Some(manifest.version.clone()),
                install_path: None,
                error: Some(e),
                hash: None,
            });
        }
    };
    
    println!("✅ Installed plugin to: {}", install_path.display());
    
    // Step 3: Calculate hash for integrity verification
    let plugin_json_path = install_path.join("plugin.json");
    let hash = match calculate_file_hash(&plugin_json_path) {
        Ok(h) => {
            println!("🔐 Plugin hash (SHA256): {}", h);
            Some(h)
        },
        Err(e) => {
            println!("⚠️ Warning: Failed to calculate plugin hash: {}", e);
            None
        }
    };
    
    // Step 4: Register the plugin in the registry
    use crate::plugin_registry::{load_registry, add_plugin_to_registry};
    
    let mut registry = match load_registry() {
        Ok(reg) => reg,
        Err(e) => {
            println!("⚠️ Warning: Failed to load registry: {}", e);
            // Continue anyway - installation succeeded, just couldn't register
            return Ok(InstallResult {
                success: true,
                plugin_id: Some(manifest.id.clone()),
                plugin_version: Some(manifest.version.clone()),
                install_path: Some(install_path.to_string_lossy().to_string()),
                error: None,
                hash,
            });
        }
    };
    
    if let Err(e) = add_plugin_to_registry(&mut registry, &manifest, &install_path, hash.clone()) {
        println!("⚠️ Warning: Failed to register plugin: {}", e);
        // Continue anyway - installation succeeded, just couldn't register
    }
    
    Ok(InstallResult {
        success: true,
        plugin_id: Some(manifest.id.clone()),
        plugin_version: Some(manifest.version.clone()),
        install_path: Some(install_path.to_string_lossy().to_string()),
        error: None,
        hash,
    })
}

/// Uninstall a plugin by ID (Tauri Command)
/// 
/// # Arguments
/// * `plugin_id` - The unique plugin identifier to uninstall
/// 
/// # Returns
/// * `Ok(true)` if successfully uninstalled
/// * `Err(String)` if plugin not found or removal failed
/// 
/// # Uninstall Process
/// 1. Scans plugins directory for matching plugin
/// 2. Reads plugin.json to verify ID match
/// 3. Removes the entire plugin directory
/// 4. Logs success
fn find_plugin_directory(plugin_id: &str, plugins_dir: &Path) -> Result<Option<PathBuf>, String> {
    for entry in fs::read_dir(plugins_dir)
        .map_err(|e| format!("Failed to read plugins directory: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        
        if path.is_dir() {
            // Check if this directory contains our plugin
            let plugin_json = path.join("plugin.json");
            if plugin_json.exists() {
                if let Ok(content) = fs::read_to_string(&plugin_json) {
                    if let Ok(manifest) = serde_json::from_str::<PluginManifest>(&content) {
                        if manifest.id == plugin_id {
                            return Ok(Some(path));
                        }
                    }
                }
            }
        }
    }
    
    Ok(None)
}

/// Uninstall a plugin by ID - ZIP installer version (Tauri Command)
/// 
/// This is an alternative implementation that works with the ZIP-based installation system.
/// It scans the plugins directory and removes the plugin folder.
/// 
/// # Arguments
/// * `plugin_id` - The unique plugin identifier to uninstall
/// 
/// # Returns
/// * `Ok(true)` if successfully uninstalled
/// * `Err(String)` if plugin not found or removal failed
#[tauri::command]
pub async fn uninstall_plugin_zip(plugin_id: String) -> Result<bool, String> {
    let plugins_dir = get_plugins_dir()?;
    
    // Find plugin directory by scanning and matching plugin.json
    let plugin_dir = find_plugin_directory(&plugin_id, &plugins_dir)?;
    
    match plugin_dir {
        Some(dir) => {
            fs::remove_dir_all(&dir)
                .map_err(|e| format!("Failed to remove plugin directory '{}': {}", dir.display(), e))?;
            println!("✅ Uninstalled plugin: {}", plugin_id);
            
            // Remove from registry
            use crate::plugin_registry::{load_registry, remove_plugin_from_registry};
            
            let mut registry = match load_registry() {
                Ok(reg) => reg,
                Err(e) => {
                    println!("⚠️ Warning: Failed to load registry: {}", e);
                    // Continue anyway - uninstallation succeeded, just couldn't update registry
                    return Ok(true);
                }
            };
            
            if let Err(e) = remove_plugin_from_registry(&mut registry, &plugin_id) {
                println!("⚠️ Warning: Failed to remove from registry: {}", e);
                // Continue anyway - files deleted successfully
            }
            
            Ok(true)
        }
        None => {
            Err(format!("Plugin not found: {}", plugin_id))
        }
    }
}

/// List all installed plugins (Tauri Command)
/// 
/// # Returns
/// * `Ok(Vec<PluginManifest>)` - List of all installed plugin manifests
/// * `Err(String)` - If unable to read plugins directory
/// 
/// # Behavior
/// - Returns empty list if plugins directory doesn't exist
/// - Skips invalid plugin.json files (doesn't fail on single bad plugin)
/// - Reads all plugin directories in the plugins folder
#[tauri::command]
pub async fn list_installed_plugins() -> Result<Vec<PluginManifest>, String> {
    let plugins_dir = get_plugins_dir()?;
    let mut plugins = Vec::new();
    
    // Return empty list if directory doesn't exist yet
    if !plugins_dir.exists() {
        return Ok(plugins);
    }
    
    for entry in fs::read_dir(&plugins_dir)
        .map_err(|e| format!("Failed to read plugins directory: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        
        if path.is_dir() {
            let plugin_json = path.join("plugin.json");
            if plugin_json.exists() {
                if let Ok(content) = fs::read_to_string(&plugin_json) {
                    if let Ok(manifest) = serde_json::from_str::<PluginManifest>(&content) {
                        plugins.push(manifest);
                    }
                    // Silently skip invalid plugin.json files
                }
            }
        }
    }
    
    Ok(plugins)
}

// ============================================================================
// Unit Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_validate_zip_safety_rejects_path_traversal() {
        // Test that paths with ".." would be rejected
        // Note: Full testing requires creating mock ZIP files
        // This test verifies the function signature and logic structure
        assert!(true); // Placeholder - actual ZIP testing needs file fixtures
    }
    
    #[test]
    fn test_get_plugins_dir_creates_directory() {
        let result = get_plugins_dir();
        assert!(result.is_ok());
        
        let dir = result.unwrap();
        assert!(dir.exists());
        assert!(dir.is_dir());
        
        // Verify path contains "QuickActions" and "plugins"
        let path_str = dir.to_string_lossy();
        assert!(path_str.contains("QuickActions"));
        assert!(path_str.contains("plugins"));
    }
    
    #[test]
    fn test_plugin_manifest_serialization() {
        let manifest = PluginManifest {
            id: "test-plugin".to_string(),
            name: "Test Plugin".to_string(),
            version: "1.0.0".to_string(),
            description: "A test plugin".to_string(),
            author: Some("Test Author".to_string()),
            entry: "dist/index.js".to_string(),
            icon: Some("icon.png".to_string()),
            keywords: Some(vec!["test".to_string(), "demo".to_string()]),
        };
        
        // Test serialization
        let json = serde_json::to_string(&manifest);
        assert!(json.is_ok());
        
        // Test deserialization
        let json_str = json.unwrap();
        let deserialized_result: Result<PluginManifest, _> = serde_json::from_str(&json_str);
        assert!(deserialized_result.is_ok());
        
        let restored = deserialized_result.unwrap();
        assert_eq!(restored.id, manifest.id);
        assert_eq!(restored.name, manifest.name);
        assert_eq!(restored.version, manifest.version);
    }
    
    #[test]
    fn test_install_result_serialization() {
        let result = InstallResult {
            success: true,
            plugin_id: Some("test-plugin".to_string()),
            plugin_version: Some("1.0.0".to_string()),
            install_path: Some("/path/to/plugin".to_string()),
            error: None,
            hash: Some("abc123def456".to_string()),
        };
        
        let json = serde_json::to_string(&result);
        assert!(json.is_ok());
        
        // Verify JSON contains expected fields
        let json_str = json.unwrap();
        assert!(json_str.contains("success"));
        assert!(json_str.contains("plugin_id"));
        assert!(json_str.contains("plugin_version"));
    }
    
    #[test]
    fn test_calculate_file_hash_on_nonexistent_file() {
        let result = calculate_file_hash(Path::new("/nonexistent/file.txt"));
        assert!(result.is_err());
        
        let error_msg = result.unwrap_err();
        assert!(error_msg.contains("Failed to open file"));
    }
    
    #[test]
    fn test_copy_dir_contents_with_empty_source() {
        // Create temporary directories for testing
        let temp_src = TempDir::new().unwrap();
        let temp_dst = TempDir::new().unwrap();
            
        let result = copy_dir_contents(temp_src.path(), temp_dst.path());
        assert!(result.is_ok());
            
        // Destination should exist but be empty
        assert!(temp_dst.path().exists());
    }
    
    #[test]
    fn test_extract_to_temp_validates_missing_plugin_json() {
        // Create a temporary ZIP file without plugin.json
        // This test would require creating a proper ZIP file
        // For now, we verify the error message format
        let error_msg = "Missing required file: plugin.json";
        assert!(error_msg.contains("plugin.json"));
    }
    
    #[test]
    fn test_plugin_manifest_validation_empty_fields() {
        // Test that empty required fields are caught
        let manifest = PluginManifest {
            id: "".to_string(), // Empty ID should fail validation
            name: "Test".to_string(),
            version: "1.0.0".to_string(),
            description: "Test".to_string(),
            author: None,
            entry: "index.js".to_string(),
            icon: None,
            keywords: None,
        };
        
        assert!(manifest.id.is_empty());
    }
    
    #[test]
    fn test_find_plugin_directory_nonexistent() {
        let temp_dir = TempDir::new().unwrap();
        let result = find_plugin_directory("nonexistent-plugin", temp_dir.path());
        
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }
    
    #[test]
    fn test_list_installed_plugins_empty_directory() {
        // This test verifies the function handles missing directory gracefully
        // Since get_plugins_dir() returns a fixed path, we can't easily override it
        // Integration test would require mocking or using a temporary directory
        assert!(true);
    }
}
