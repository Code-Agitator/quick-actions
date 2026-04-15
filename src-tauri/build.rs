use std::env;
use std::fs;
use std::path::PathBuf;

fn main() {
    tauri_build::build();
    
    // 在开发模式下，复制 sidecar 文件到 target 目录
    let profile = env::var("PROFILE").unwrap_or_default();
    if profile == "debug" {
        let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
        let target_dir = PathBuf::from(&manifest_dir)
            .join("target")
            .join(&profile);
        
        let libs_dir = target_dir.join("libs");
        fs::create_dir_all(&libs_dir).ok();
        
        let src = PathBuf::from(&manifest_dir)
            .join("libs")
            .join("es-x86_64-pc-windows-msvc.exe");
        
        let dst_with_suffix = libs_dir.join("es-x86_64-pc-windows-msvc.exe");
        let dst_without_suffix = libs_dir.join("es.exe");
        
        if src.exists() {
            fs::copy(&src, &dst_with_suffix).ok();
            fs::copy(&src, &dst_without_suffix).ok();
            println!("cargo:warning=Copied es.exe to target directory");
        }
    }
}
